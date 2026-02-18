# Google OAuth Setup Guide

Complete guide for setting up Google Drive integration with Frame.dev.

## Table of Contents

- [Quick Start (Shared Credentials)](#quick-start-shared-credentials)
- [Custom OAuth Setup](#custom-oauth-setup)
- [Troubleshooting](#troubleshooting)
- [Security & Privacy](#security--privacy)

---

## Quick Start (Shared Credentials)

Frame.dev provides shared OAuth credentials for quick setup. This is the easiest option for most users.

### Steps

1. **Open Import Wizard**
   - Go to Codex Settings → Import/Export
   - Click "Import Content"
   - Select "Google Drive"

2. **Connect Account**
   - Click "Connect Google Drive"
   - Popup window opens with Google sign-in
   - Select your Google account
   - Review permissions:
     - ✅ Read-only access to Drive files
     - ✅ Read-only access to Google Docs
   - Click "Allow"

3. **Popup Closes Automatically**
   - Connection status shows green "Connected"
   - Ready to import from Google Drive

### Permissions Granted

When you connect, Frame.dev requests minimal permissions:

- **`drive.readonly`**: View files in your Google Drive
- **`documents.readonly`**: Read content from Google Docs

**Frame.dev NEVER:**
- ❌ Gets write access to your files
- ❌ Can delete or modify files
- ❌ Shares your data with third parties
- ❌ Stores your files on servers

All processing happens in your browser. OAuth tokens are encrypted and stored locally.

---

## Custom OAuth Setup

For enhanced security, custom rate limits, or compliance requirements, create your own Google Cloud project.

### Prerequisites

- Google account
- Access to [Google Cloud Console](https://console.cloud.google.com)
- 10-15 minutes

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Enter project details:
   - **Project name**: `Quarry Codex Import` (or any name)
   - **Organization**: (optional)
4. Click **Create**
5. Wait for project creation (~30 seconds)

### Step 2: Enable Required APIs

1. In your new project, go to **APIs & Services** → **Library**
2. Search for and enable these APIs:

   **Google Drive API:**
   - Search: "Google Drive API"
   - Click the result
   - Click **Enable**

   **Google Docs API:**
   - Search: "Google Docs API"
   - Click the result
   - Click **Enable**

3. Wait for APIs to enable (~1 minute each)

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **User Type**:
   - **External**: For personal use (most users)
   - **Internal**: For Google Workspace organizations only
3. Click **Create**

4. **Fill out App Information**:
   - **App name**: `Quarry Codex`
   - **User support email**: Your email
   - **App logo**: (optional, upload Frame logo)
   - **Application home page**: `https://frame.dev`
   - **Application privacy policy**: `https://frame.dev/privacy`
   - **Application terms of service**: `https://frame.dev/terms`
   - **Authorized domains**: Add your Frame.dev deployment domain
   - **Developer contact information**: Your email

5. Click **Save and Continue**

6. **Scopes**:
   - Click **Add or Remove Scopes**
   - Search and add:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/documents.readonly`
   - Click **Update**
   - Click **Save and Continue**

7. **Test Users** (for External apps):
   - Click **Add Users**
   - Add your email and any other users who need access
   - Click **Save and Continue**

8. **Summary**:
   - Review details
   - Click **Back to Dashboard**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure OAuth client:
   - **Application type**: Web application
   - **Name**: `Quarry Codex Web Client`
   - **Authorized JavaScript origins**:
     ```
     https://your-domain.com
     http://localhost:3000
     ```
     *(Replace with your actual domain, add localhost for development)*

   - **Authorized redirect URIs**:
     ```
     https://your-domain.com/api/auth/google/callback
     http://localhost:3000/api/auth/google/callback
     ```

4. Click **Create**
5. **Copy credentials**:
   - **Client ID**: Looks like `123456789-abc123.apps.googleusercontent.com`
   - **Client secret**: Looks like `GOCSPX-abc123xyz789`
   - Save these securely (password manager recommended)

### Step 5: Use Custom Credentials in Frame.dev

1. **In Frame.dev**:
   - Open Import Wizard → Select "Google Drive"
   - Click **Custom Credentials**

2. **Paste your credentials**:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: (Optional, paste if you have it)

3. **Save and Connect**:
   - Click "Connect Google Drive"
   - Popup opens with YOUR OAuth app
   - Sign in and grant permissions
   - Connection established with your custom credentials

### Step 6: Publish OAuth App (Optional)

By default, OAuth apps are in "Testing" mode with limited users. To remove the warning screen:

1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App**
3. Submit for verification (required for 100+ users)
4. Google reviews app (~1-2 weeks)
5. Once approved, no more warning screens

**Note**: Not necessary for personal use or small teams.

---

## Troubleshooting

### "Popup blocked" Error

**Solution:**
1. Allow popups for Frame.dev in browser settings
2. Look for popup blocker icon in address bar
3. Click and select "Always allow popups from frame.dev"
4. Retry connection

### "Redirect URI mismatch" Error

**Problem:** OAuth redirect URI doesn't match what you configured.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Ensure redirect URI exactly matches:
   ```
   https://your-actual-domain.com/api/auth/google/callback
   ```
4. Save and retry (may take 5 minutes to propagate)

### "Access denied" Error

**Problem:** User not added to test users list (External apps in testing).

**Solution:**
1. Go to **OAuth consent screen**
2. Scroll to **Test users**
3. Click **Add Users**
4. Add the Google account email
5. Save and retry

### "Invalid client" Error

**Problem:** Client ID or Client Secret incorrect.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Find your OAuth client
3. Copy Client ID and Client Secret again
4. Paste into Frame.dev (ensure no extra spaces)
5. Retry

### "Failed to exchange code for tokens"

**Problem:** Client Secret not configured or incorrect.

**Solution:**
1. Verify Client Secret in Google Cloud Console
2. Ensure it's pasted correctly in Frame.dev
3. Check that OAuth client type is "Web application"
4. Retry

### "Rate limit exceeded"

**Problem:** Too many API requests (default quota: 1000 per 100 seconds).

**Solution:**
1. Wait 100 seconds and retry
2. Or increase quota:
   - Go to **APIs & Services** → **Quotas**
   - Find "Queries per 100 seconds per user"
   - Click **Edit Quotas**
   - Request increase (up to 20,000)

### "Tokens expired"

**Problem:** Access token expired (default: 1 hour) and refresh failed.

**Solution:**
1. Disconnect Google Drive in Frame.dev
2. Reconnect (gets new tokens)
3. If persists, revoke access:
   - Go to [Google Account Permissions](https://myaccount.google.com/permissions)
   - Remove Quarry Codex
   - Reconnect in Frame.dev

---

## Security & Privacy

### Data Storage

**Where are OAuth tokens stored?**
- Encrypted in browser localStorage
- AES-256-GCM encryption
- Browser fingerprint as encryption key
- Never transmitted to Frame.dev servers

**Can Frame.dev access my Drive files?**
- No, all processing happens in your browser (client-side)
- Frame.dev backend never sees your files or tokens

### Token Lifecycle

**Access Token:**
- Expires after 1 hour
- Automatically refreshed using refresh token
- If refresh fails, you'll be asked to reconnect

**Refresh Token:**
- Long-lived (until revoked)
- Used to get new access tokens
- Stored encrypted in localStorage

### Revoking Access

**In Frame.dev:**
1. Go to Import Wizard → Google Drive
2. Click "Disconnect"
3. Tokens deleted from localStorage

**In Google:**
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Find "Quarry Codex" or your custom app name
3. Click **Remove Access**

### Permissions Explained

**Why does Frame.dev need these permissions?**

- **`drive.readonly`**:
  - List files in Drive folders
  - Get file metadata (name, modified time)
  - Export Google Docs as plain text

- **`documents.readonly`**:
  - Read document content
  - Preserve formatting during export

**What Frame.dev CANNOT do:**
- ❌ Edit, delete, or create files in Drive
- ❌ Share files with others
- ❌ Access files you don't explicitly import
- ❌ See files in other Google services (Gmail, Photos, etc.)

### Best Practices

1. **Use custom OAuth for sensitive data**
   - Greater control over permissions
   - Custom rate limits
   - Your own audit logs in Google Cloud

2. **Regularly review permissions**
   - Check [Google Account Permissions](https://myaccount.google.com/permissions) quarterly
   - Remove apps you no longer use

3. **Keep tokens secure**
   - Don't share your browser profile
   - Use browser password protection
   - Log out from shared computers

4. **Monitor API usage**
   - Check Google Cloud Console → APIs & Services → Dashboard
   - Set up billing alerts (though Drive API is free for reasonable use)

---

## Advanced Configuration

### Environment Variables (Shared Credentials)

If self-hosting Frame.dev, configure shared OAuth credentials via environment variables:

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

**Note:** Client ID is public (included in frontend), Client Secret is private (backend only).

### Rate Limiting

**Default Quotas:**
- Google Drive API: 1,000 requests per 100 seconds per user
- Google Docs API: 300 requests per 60 seconds per user

**Frame.dev handles rate limiting automatically:**
- Token bucket algorithm
- Exponential backoff on 429 errors
- User-friendly progress messages ("Waiting for rate limit...")

**To increase quotas:**
1. Go to Google Cloud Console → Quotas
2. Request quota increase (explain use case)
3. Google reviews and approves (usually within 24 hours)

---

## FAQ

**Q: Do I need a credit card for Google Cloud?**
A: No, Google Drive and Docs APIs are free for reasonable use. Credit card only required if you exceed free quota (very unlikely for personal use).

**Q: Can multiple users share one OAuth app?**
A: Yes, create one project in Google Cloud and all users can use those credentials. Each user still authorizes with their own Google account.

**Q: What happens if I delete my Google Cloud project?**
A: OAuth app stops working immediately. Users will need to reconnect with new credentials.

**Q: Can I use the same OAuth credentials for development and production?**
A: Yes, just add both domains to "Authorized JavaScript origins" and "Authorized redirect URIs".

**Q: Is there a limit on how many files I can import?**
A: API quotas are the limit. With default quotas, you can import ~1000 files per session. Custom quotas can go much higher.

---

## Support

Having issues?

- 📖 [Import/Export Guide](./import-export-guide.md)
- 🐛 [Report Issue](https://github.com/framersai/frame/issues)
- 💬 [Community Discord](https://discord.gg/framers)
- 📧 Email: support@frame.dev

---

*Last updated: 2025-12-22*
*Frame.dev v1.0 - OAuth Setup Guide*
