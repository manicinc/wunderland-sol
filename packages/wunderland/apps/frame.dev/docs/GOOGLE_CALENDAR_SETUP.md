# Google Calendar Integration Setup

Quarry supports Google Calendar integration with multiple authentication modes. Choose the one that fits your deployment.

## Quick Start (Recommended)

### For frame.dev / quarry.space Users
Just click "Connect Google Calendar" in Planner Settings. OAuth is pre-configured.

### For Electron Desktop App Users
1. Go to **Planner → Settings → Google Calendar**
2. Click **Connect Google Calendar**
3. Sign in with your Google account
4. Done! Your calendars will sync automatically.

The desktop app uses PKCE (Proof Key for Code Exchange), which is secure and doesn't require any setup.

---

## Self-Hosted / BYOK Setup

If you're self-hosting Quarry or want to use your own Google Cloud credentials:

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g., "Quarry Calendar") and click **Create**

### Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services → Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** (or Internal if you're using Workspace)
3. Fill in the required fields:
   - **App name**: Your app name (e.g., "Quarry")
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Add test users if in testing mode
7. Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Choose application type:
   - **Desktop app** for Electron/PKCE (no secret needed)
   - **Web application** for hosted deployments

#### For Web Application:
- **Authorized redirect URIs**: Add your callback URL
  ```
  https://your-domain.com/api/auth/google-calendar/callback
  ```
  
For local development:
  ```
  http://localhost:3000/api/auth/google-calendar/callback
  ```

4. Click **Create**
5. Copy the **Client ID** and **Client Secret**

### Step 5: Configure Quarry

#### Option A: Environment Variables (for hosted deployments)

Add to your `.env` or hosting provider:

```bash
# Required - Client ID (public, safe to expose)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Required for web - Client Secret (server-side only, never expose!)
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Optional - Desktop client ID for Electron PKCE mode
NEXT_PUBLIC_GOOGLE_DESKTOP_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
```

#### Option B: BYOK (In-App Configuration)

1. Go to **Planner → Settings → Custom OAuth Credentials**
2. Enter your **Client ID** and **Client Secret**
3. Click **Save Credentials**
4. Toggle **Use my own credentials** if you want to override pre-configured OAuth

---

## OAuth Modes Explained

| Mode | When Used | Secret Required | Best For |
|------|-----------|-----------------|----------|
| **PKCE** | Electron/Desktop | No | Desktop apps |
| **Pre-configured** | Hosted (frame.dev) | Yes (server-side) | SaaS deployments |
| **BYOK** | Self-hosted | Yes (client-side) | Self-hosting, development |

### PKCE (Proof Key for Code Exchange)
- Used automatically in Electron/desktop apps
- No client secret needed (secure by design)
- Uses cryptographic code challenge/verifier

### Pre-configured
- Client secret stays on server
- Token exchange happens via `/api/auth/google-calendar/token`
- Most secure for web deployments

### BYOK
- Credentials stored in browser localStorage
- Full control over your OAuth app
- No quota sharing with other users

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Check that your redirect URI exactly matches what's in Google Cloud Console
- For local dev, use `http://localhost:3000`, not `http://127.0.0.1:3000`

### "This app isn't verified"
- This is normal for development. Click **Advanced → Go to [App Name] (unsafe)**
- For production, complete Google's verification process

### "Error 403: access_denied"
- Add your email to test users in OAuth consent screen
- Or switch to "In production" mode (requires verification)

### "popup_closed_by_user"
- Enable popups for your domain in browser settings
- Try a different browser if popup blockers are aggressive

### Token refresh fails
- Check that you requested `access_type: 'offline'` during initial auth
- Clear tokens and re-authenticate

---

## Security Best Practices

1. **Never commit client secrets** - Use environment variables
2. **Use HTTPS in production** - Required for OAuth callbacks
3. **Rotate secrets periodically** - Create new credentials if compromised
4. **Limit scopes** - Only request what you need
5. **Use PKCE for desktop** - No secret to leak

---

## API Endpoints

### Token Exchange (Pre-configured mode)
```
POST /api/auth/google-calendar/token
Content-Type: application/json

{
  "code": "authorization-code",
  "redirectUri": "https://your-domain.com/api/auth/google-calendar/callback",
  "grantType": "authorization_code"
}
```

### OAuth Callback
```
GET /api/auth/google-calendar/callback?code=xxx&state=xxx
```

---

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [PKCE Extension for OAuth](https://oauth.net/2/pkce/)
- [Quarry Documentation](/quarry/docs)
