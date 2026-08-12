const fetch = require('node-fetch');
const db = require('./db');

// Refresh an expired Google access token using the stored refresh token.
async function refreshGoogleToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  return res.json();
}

// Pull live subscriber count for one connected YouTube account and store it.
async function syncYouTubeAccount(account) {
  let accessToken = account.access_token;

  let res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (res.status === 401 && account.refresh_token) {
    const refreshed = await refreshGoogleToken(account.refresh_token);
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
  }

  if (!res.ok) {
    db.prepare(`UPDATE connected_accounts SET status = 'error', last_synced_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), account.id);
    return false;
  }

  const data = await res.json();
  const channel = data.items && data.items[0];
  if (!channel) return false;

  db.prepare(`
    UPDATE connected_accounts
    SET access_token = ?, total_subscribers = ?, external_name = ?, status = 'connected', last_synced_at = ?
    WHERE id = ?
  `).run(
    accessToken,
    Number(channel.statistics.subscriberCount || 0),
    channel.snippet.title,
    new Date().toISOString(),
    account.id
  );

  return true;
}

// Re-sync every connected YouTube account across all users.
async function syncAllYouTube() {
  const accounts = db.prepare(`SELECT * FROM connected_accounts WHERE platform = 'youtube'`).all();
  for (const account of accounts) {
    try {
      await syncYouTubeAccount(account);
    } catch (err) {
      console.error(`Sync failed for account ${account.id}:`, err.message);
    }
  }
}

module.exports = { syncYouTubeAccount, syncAllYouTube };
