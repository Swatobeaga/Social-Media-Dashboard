require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fetch = require('node-fetch');
const db = require('./db');
const platforms = require('./platforms');
const views = require('./views');
const { syncYouTubeAccount, syncAllYouTube } = require('./sync');

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // how often we pull fresh numbers from each platform's API

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// --- Auth ---

app.get('/', (req, res) => res.redirect(req.session.userId ? '/dashboard' : '/login'));

app.get('/signup', (req, res) => res.send(views.signupPage()));

app.post('/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.send(views.signupPage('Enter a valid email and a password of at least 8 characters.'));
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.send(views.signupPage('That email is already registered.'));
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
  req.session.userId = result.lastInsertRowid;
  res.redirect('/dashboard');
});

app.get('/login', (req, res) => res.send(views.loginPage()));

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.send(views.loginPage('Incorrect email or password.'));
  }
  req.session.userId = user.id;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Dashboard ---

app.get('/dashboard', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const accounts = db.prepare('SELECT * FROM connected_accounts WHERE user_id = ?').all(user.id);
  res.send(views.dashboardPage(user, accounts, platforms));
});

app.get('/connect', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const accounts = db.prepare('SELECT * FROM connected_accounts WHERE user_id = ?').all(user.id);
  res.send(views.connectPage(user, accounts, platforms));
});

// Lightweight JSON the dashboard polls every 15s. Reads only from our own
// database (fast, no external API calls), so polling this often is cheap.
app.get('/api/dashboard-data', requireAuth, (req, res) => {
  const accounts = db.prepare('SELECT * FROM connected_accounts WHERE user_id = ?').all(req.session.userId);
  res.json({ accounts, serverTime: new Date().toISOString() });
});

// Manual "Sync now" — forces an immediate pull from the platform's API
// instead of waiting for the next background cycle.
app.post('/sync/:platform', requireAuth, async (req, res) => {
  const key = req.params.platform;
  const account = db.prepare('SELECT * FROM connected_accounts WHERE user_id = ? AND platform = ?')
    .get(req.session.userId, key);
  if (!account) return res.redirect('/connect');

  if (key === 'youtube') {
    await syncYouTubeAccount(account);
  }
  res.redirect('/connect');
});

// --- OAuth: one-time login per platform ---

app.get('/connect/:platform/start', requireAuth, (req, res) => {
  const cfg = platforms[req.params.platform];
  if (!cfg) return res.status(404).send('Unknown platform');
  const clientId = process.env[cfg.clientIdEnv];
  if (!clientId) return res.redirect('/connect');

  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  req.session.oauthPlatform = req.params.platform;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${BASE_URL}/connect/${req.params.platform}/callback`,
    response_type: 'code',
    scope: cfg.scope,
    state,
    ...(cfg.extraAuthParams || {})
  });

  if (cfg.pkce) {
    const verifier = crypto.randomBytes(32).toString('hex');
    req.session.pkceVerifier = verifier;
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    params.set('code_challenge', challenge);
    params.set('code_challenge_method', 'S256');
  }

  res.redirect(`${cfg.authorizeUrl}?${params.toString()}`);
});

app.get('/connect/:platform/callback', requireAuth, async (req, res) => {
  const key = req.params.platform;
  const cfg = platforms[key];
  if (!cfg) return res.status(404).send('Unknown platform');

  if (req.query.state !== req.session.oauthState) {
    return res.status(400).send('State mismatch. Please try connecting again.');
  }

  try {
    const clientId = process.env[cfg.clientIdEnv];
    const clientSecret = process.env[cfg.clientSecretEnv];
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: req.query.code,
      redirect_uri: `${BASE_URL}/connect/${key}/callback`,
      grant_type: 'authorization_code',
      ...(cfg.pkce ? { code_verifier: req.session.pkceVerifier } : {})
    });

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).send('Login did not complete: ' + JSON.stringify(tokenData));
    }

    let stats = { status: 'awaiting_api_access' };

    if (key === 'youtube' && cfg.livePullSupported) {
      const statsRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      const statsData = await statsRes.json();
      const channel = statsData.items && statsData.items[0];
      if (channel) {
        stats = {
          status: 'connected',
          external_name: channel.snippet.title,
          total_subscribers: Number(channel.statistics.subscriberCount || 0)
        };
      }
    }

    db.prepare(`
      INSERT INTO connected_accounts (user_id, platform, status, access_token, refresh_token, external_name, total_subscribers, last_synced_at)
      VALUES (@user_id, @platform, @status, @access_token, @refresh_token, @external_name, @total_subscribers, @last_synced_at)
      ON CONFLICT(user_id, platform) DO UPDATE SET
        status = excluded.status,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        external_name = excluded.external_name,
        total_subscribers = excluded.total_subscribers,
        last_synced_at = excluded.last_synced_at
    `).run({
      user_id: req.session.userId,
      platform: key,
      status: stats.status,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      external_name: stats.external_name || null,
      total_subscribers: stats.total_subscribers ?? null,
      last_synced_at: new Date().toISOString()
    });

    res.redirect('/connect');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong connecting this account. ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Social Dashboard running on ${BASE_URL}`);
  syncAllYouTube().catch(err => console.error('Initial sync failed:', err.message));
  setInterval(() => {
    syncAllYouTube().catch(err => console.error('Background sync failed:', err.message));
  }, SYNC_INTERVAL_MS);
});
