const layout = (title, body) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Social Dashboard</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #f7f6f3;
    color: #1a1a1a;
  }
  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 24px;
    background: #fff;
    border-bottom: 1px solid #e8e5df;
  }
  .nav a { color: #1a1a1a; text-decoration: none; font-size: 14px; margin-left: 16px; }
  .nav .brand { font-weight: 700; font-size: 15px; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 24px; }
  .card {
    background: #fff;
    border: 1px solid #e8e5df;
    border-radius: 12px;
    padding: 24px;
    max-width: 380px;
    margin: 40px auto;
  }
  .card h1 { font-size: 18px; margin: 0 0 16px; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 4px; }
  input {
    width: 100%;
    padding: 9px 10px;
    border: 1px solid #d8d5cc;
    border-radius: 8px;
    font-size: 14px;
  }
  button, .btn {
    display: inline-block;
    width: 100%;
    margin-top: 18px;
    padding: 10px;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
  }
  .btn.secondary { background: #fff; color: #1a1a1a; border: 1px solid #d8d5cc; }
  .error { background: #fde8e8; color: #b23c3c; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 8px; }
  .muted { color: #857f75; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; background: #fff; font-size: 14px; margin-top: 12px; }
  th, td { border: 1.5px solid #1a1a1a; padding: 10px 14px; text-align: left; }
  th { font-weight: 700; }
  td.row-label { font-weight: 700; }
  td.na { color: #a39d92; }
  td.placeholder { background: #eaf1fb; color: #1d5aa8; }
  .notice {
    background: #fdf3e7;
    border: 1px solid #edd9b8;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #7a5a1e;
    margin-bottom: 20px;
    line-height: 1.5;
  }
  .platform-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 12px; margin-top: 16px; }
  .platform-card { background: #fff; border: 1px solid #e8e5df; border-radius: 12px; padding: 16px; }
  .platform-card h3 { margin: 0 0 4px; font-size: 14px; }
  .status-pill { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; margin-bottom: 8px; }
  .status-connected { background: #e1f5ee; color: #0f6e56; }
  .status-pending { background: #fdf3e7; color: #7a5a1e; }
  .status-off { background: #f1efe8; color: #5f5e5a; }
</style>
</head>
<body>
<div class="nav">
  <span class="brand">Social Dashboard</span>
  <div>${body.nav || ''}</div>
</div>
<div class="wrap">${body.content}</div>
</body>
</html>`;

exports.signupPage = (error) => layout('Sign up', {
  nav: `<a href="/login">Log in</a>`,
  content: `
  <div class="card">
    <h1>Create your account</h1>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/signup">
      <label>Email</label>
      <input type="email" name="email" required>
      <label>Password</label>
      <input type="password" name="password" minlength="8" required>
      <button type="submit">Sign up</button>
    </form>
    <p class="muted" style="margin-top:14px;">Already have an account? <a href="/login">Log in</a></p>
  </div>`
});

exports.loginPage = (error) => layout('Log in', {
  nav: `<a href="/signup">Sign up</a>`,
  content: `
  <div class="card">
    <h1>Log in</h1>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/login">
      <label>Email</label>
      <input type="email" name="email" required>
      <label>Password</label>
      <input type="password" name="password" required>
      <button type="submit">Log in</button>
    </form>
    <p class="muted" style="margin-top:14px;">No account yet? <a href="/signup">Sign up</a></p>
  </div>`
});

exports.dashboardPage = (user, accounts, platforms) => {
  const get = (p) => accounts.find(a => a.platform === p);
  const fmt = (n) => n === null || n === undefined ? '<span class="na">N/A</span>' : Number(n).toLocaleString();

  const cols = Object.keys(platforms);
  const rowLabels = [
    ['total_subscribers', 'Total Subscribers'],
    ['new_subscribers', 'New Subscribers'],
    ['subscribers_lost', 'Subscribers Lost'],
    ['net_subscribers', 'Net Subscribers'],
    ['revenue', 'Revenue']
  ];

  const rows = rowLabels.map(([key, label]) => `
    <tr>
      <td class="row-label">${label}</td>
      ${cols.map(p => {
        const acc = get(p);
        if (!acc) return `<td class="placeholder">sample</td>`;
        const v = acc[key];
        if (key === 'revenue') return `<td>${v === null || v === undefined ? '<span class="na">N/A</span>' : '$ ' + Number(v).toLocaleString()}</td>`;
        return `<td>${fmt(v)}</td>`;
      }).join('')}
    </tr>`).join('');

  return layout('Dashboard', {
    nav: `<span class="muted">${user.email}</span><a href="/connect">Connect accounts</a><a href="/logout">Log out</a>`,
    content: `
    <div class="notice">Columns without a connected account show placeholder sample data. Connect a platform from the <a href="/connect">Connect accounts</a> page to replace it with real numbers.</div>
    <table>
      <tr>
        <th>Social Media Audience</th>
        ${cols.map(p => `<th>${platforms[p].label}</th>`).join('')}
      </tr>
      ${rows}
    </table>
    `
  });
};

exports.connectPage = (user, accounts, platforms) => {
  const get = (p) => accounts.find(a => a.platform === p);
  const cards = Object.entries(platforms).map(([key, cfg]) => {
    const acc = get(key);
    const configured = !!process.env[cfg.clientIdEnv];
    let statusHtml, actionHtml;
    if (acc && acc.status === 'connected') {
      statusHtml = `<span class="status-pill status-connected">Connected</span>`;
      actionHtml = `<span class="muted">Live data synced ${acc.last_synced_at || ''}</span>`;
    } else if (acc && acc.status === 'awaiting_api_access') {
      statusHtml = `<span class="status-pill status-pending">Logged in · awaiting API access</span>`;
      actionHtml = `<span class="muted">Login succeeded. ${cfg.label} requires extra platform approval before follower stats can be pulled.</span>`;
    } else if (!configured) {
      statusHtml = `<span class="status-pill status-off">Not configured</span>`;
      actionHtml = `<span class="muted">Add ${cfg.clientIdEnv} / ${cfg.clientSecretEnv} env vars to enable.</span>`;
    } else {
      statusHtml = `<span class="status-pill status-off">Not connected</span>`;
      actionHtml = `<a class="btn secondary" href="/connect/${key}/start">Connect ${cfg.label}</a>`;
    }
    return `<div class="platform-card">
      <div>${statusHtml}</div>
      <h3>${cfg.label}</h3>
      ${actionHtml}
    </div>`;
  }).join('');

  return layout('Connect accounts', {
    nav: `<span class="muted">${user.email}</span><a href="/dashboard">Dashboard</a><a href="/logout">Log out</a>`,
    content: `
    <div class="notice">One-time login per platform — click Connect, sign in on the platform's own login page, and you're done. Login uses each platform's real OAuth; nothing is stored here except the resulting token.</div>
    <div class="platform-grid">${cards}</div>
    `
  });
};
