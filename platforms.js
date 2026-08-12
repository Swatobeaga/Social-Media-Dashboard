// OAuth configuration per platform. Each entry reads its client id/secret
// from environment variables. Platforms with no env vars set will show as
// "not configured" in the Connect page until real credentials are added.
//
// IMPORTANT: registering a developer app on each platform is required
// before login will work — this is true for every app that offers
// "Login with Google/Meta/X/LinkedIn", not specific to this project.
//   YouTube  -> Google Cloud Console (console.cloud.google.com), enable
//               "YouTube Data API v3", create OAuth 2.0 Client ID.
//   Facebook -> developers.facebook.com, create an app, add "Facebook Login".
//   Instagram-> same Meta app as Facebook (Instagram Graph API rides on
//               Facebook Login for business/creator accounts).
//   X        -> developer.x.com, create a project/app, enable OAuth 2.0.
//   LinkedIn -> developer.linkedin.com, create an app, request "Sign In
//               with LinkedIn using OpenID Connect".
//
// Reading real follower/insights numbers (beyond just login) additionally
// requires the platform to approve extra API permissions for Facebook,
// Instagram, X, and LinkedIn — that's a separate app-review step on their
// side and can take days. YouTube's read-only stats do NOT need that extra
// review, which is why it's the one platform wired to fetch live numbers
// in this starter app.

module.exports = {
  youtube: {
    label: 'YouTube',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
    livePullSupported: true
  },
  facebook: {
    label: 'Facebook',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'pages_read_engagement,pages_show_list',
    livePullSupported: false
  },
  instagram: {
    label: 'Instagram',
    clientIdEnv: 'FACEBOOK_CLIENT_ID',
    clientSecretEnv: 'FACEBOOK_CLIENT_SECRET',
    authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'instagram_basic,pages_show_list',
    livePullSupported: false
  },
  x: {
    label: 'X (Twitter)',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scope: 'users.read follows.read offline.access',
    pkce: true,
    livePullSupported: false
  },
  linkedin: {
    label: 'LinkedIn',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: 'openid profile',
    livePullSupported: false
  }
};
