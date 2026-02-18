# Environment Variables

Frame.dev uses optional environment variables for analytics and GitHub API access. All tracking is **anonymous** and respects Do Not Track (DNT) browser settings.

---

## Deployment Mode Configuration

### `NEXT_PUBLIC_DEPLOYMENT_MODE`

**Deployment mode: static or offline**

- **Format**: `static` or `offline`
- **Required**: No (defaults to `static`)
- **Options**:
  - `static`: Free open-source edition on GitHub Pages
  - `offline`: Paid edition with full offline support

```bash
NEXT_PUBLIC_DEPLOYMENT_MODE=static
```

### `NEXT_PUBLIC_EDITION`

**Edition type: community or premium**

- **Format**: `community` or `premium`
- **Required**: No (defaults to `community`)
- **Options**:
  - `community`: Free features (no Quizzes, Flashcards, Q&A)
  - `premium`: All features enabled

```bash
NEXT_PUBLIC_EDITION=community
```

### `NEXT_PUBLIC_LICENSE_SERVER`

**License server URL for premium edition validation**

- **Format**: Full URL with protocol
- **Required**: No (defaults to `https://license.frame.dev/api`)
- **Used by**: Premium offline builds for license validation

```bash
NEXT_PUBLIC_LICENSE_SERVER=https://license.frame.dev/api
```

### Feature Availability by Edition

| Feature | Community | Premium |
|---------|-----------|---------|
| Semantic Search | ✅ | ✅ |
| Spiral Path Learning | ✅ | ✅ |
| Bookmarks & History | ✅ | ✅ |
| Knowledge Graph | ✅ | ✅ |
| Quizzes | ❌ | ✅ |
| Flashcards (FSRS) | ❌ | ✅ |
| Q&A Generation | ❌ | ✅ |
| Export/Import | ❌ | ✅ |
| Offline Mode | ❌ | ✅ |
| Desktop/Mobile Apps | ❌ | ✅ |

---

## Public Access Mode (Experimental)

> **Developer Feature**: This is an experimental feature for developers who want to share their Quarry Codex deployment publicly while restricting certain administrative actions.

### `NEXT_PUBLIC_PUBLIC_ACCESS`

**Lock down plugin management for public deployments**

- **Format**: `true` or `false`
- **Required**: No (defaults to `false`)
- **When enabled**: Plugin installation and uninstallation is disabled
- **When disabled**: Normal plugin management is allowed

```bash
NEXT_PUBLIC_PUBLIC_ACCESS=true
```

### Use Cases

- **Public Sharing**: Share your Codex on a public URL without worrying about visitors modifying your plugin configuration
- **Demo/Showcase**: Create read-only demo deployments for presentations or documentation
- **Team Environments**: Centrally manage plugins while allowing team members to use the Codex
- **Kiosk Mode**: Deploy on shared devices where plugin management should be locked

### What Gets Locked

When `NEXT_PUBLIC_PUBLIC_ACCESS=true`:

| Category | Action | Status |
|----------|--------|--------|
| **Plugins** | Install plugins from URL/ZIP/registry | ❌ Blocked |
| **Plugins** | Uninstall/remove plugins | ❌ Blocked |
| **Security** | Enable/disable password protection | ❌ Blocked |
| **Security** | Change password/auto-lock settings | ❌ Blocked |
| **Storage** | Save/change GitHub PAT | ❌ Blocked |
| **Storage** | Switch storage mode (GitHub/Local) | ❌ Blocked |
| **Storage** | Trigger manual sync | ❌ Blocked |
| **Connections** | Add/edit/delete database connections | ❌ Blocked |
| **Connections** | Switch active backend | ❌ Blocked |
| **Vault** | Change vault location | ❌ Blocked |
| **Instance** | Change instance name/tagline/colors | ❌ Blocked |

### What Remains Available

Even with public access enabled, users can still:

| Action | Status |
|--------|--------|
| Enable/disable installed plugins | ✅ Allowed |
| Configure plugin settings | ✅ Allowed |
| View plugin/settings information | ✅ Allowed |
| Browse and read all content | ✅ Allowed |
| Use search, flashcards, quizzes | ✅ Allowed |
| Change UI preferences (theme, font size, etc.) | ✅ Allowed |

### UI Indicators

When public access mode is active:
- An amber banner displays at top of Settings: "Public access mode — some settings are view-only"
- Disabled controls show tooltip: "Locked in public access mode"
- Disabled elements have reduced opacity (60%) and `cursor-not-allowed`
- The "+" (install) button is hidden from the Plugins sidebar
- The uninstall (trash) button is hidden from plugin cards

### Security Note

This feature is designed for **convenience, not security**. For truly secure deployments:

1. Set `NEXT_PUBLIC_PUBLIC_ACCESS=true` in your deployment environment
2. Use proper authentication if deploying behind a login
3. For device-level security, use OS-level encryption and access controls

The `.env` file containing this setting should be protected and not accessible to end users.

### ⚠️ Security Warning: GitHub Pages Deployment

If you deploy on GitHub Pages with `NEXT_PUBLIC_PUBLIC_ACCESS=false` (the default):

**Anyone with the URL can:**

- Enable/disable password protection
- Change the password
- Access all settings
- Edit, publish, and delete content
- Install and remove plugins

**This means your Quarry instance has NO access control by default.**

**Recommendations:**

| Deployment Type           | Recommendation                                                |
| ------------------------- | ------------------------------------------------------------- |
| Public documentation site | Set `NEXT_PUBLIC_PUBLIC_ACCESS=true` to lock settings         |
| Private/personal use      | Deploy behind auth (Cloudflare Access, Vercel Auth, etc.)     |
| Collaborative team        | Use GitHub repository permissions as access control           |

**For Codex Template Users:**

If you're using the [codex-template](https://github.com/framersai/codex-template), the GitHub Actions workflow sets `NEXT_PUBLIC_PUBLIC_ACCESS=false` by default, giving the repository owner full control. Change to `true` in your workflow if you want to share publicly with locked settings.

```yaml
# .github/workflows/deploy.yml
env:
  NEXT_PUBLIC_PUBLIC_ACCESS: true  # Lock settings for public viewers
```

---

## Setup

1. Copy `.env.local.example` to `.env.local` (ignored by git)
2. Add your IDs and tokens (or leave blank for defaults)
3. Restart the dev server

## Variables

### `GH_PAT` (Server-side GitHub API)

**GitHub Personal Access Token for server-side operations**

- **Format**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Required**: No (falls back to unauthenticated API with lower rate limits)
- **Scopes**: `public_repo` (read-only access to public repositories)
- **Rate Limits**:
  - ✅ **With PAT**: 5,000 requests/hour
  - ⚠️ **Without PAT**: 60 requests/hour (shared across all visitors)
- **Security**: ⚠️ **NEVER** expose this in `NEXT_PUBLIC_*` variables

**Where to get it**: [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens/new?description=Frame.dev%20Server%20API&scopes=public_repo)

**Example**:
```bash
GH_PAT=ghp_1234567890abcdefghijklmnopqrstuvwxyz
```

**Why you need it**:
- Build-time indexing of Codex content
- Server-side search index generation
- Pre-rendering strand summaries

---

### `NEXT_PUBLIC_GH_PAT` - ⛔ DEPRECATED / DO NOT USE

**🚨 SECURITY RISK**: This variable is **NEVER** used and should **NEVER** be set!

Any `NEXT_PUBLIC_*` environment variable is bundled into client-side JavaScript and would expose your GitHub token publicly to anyone viewing your site.

**How to authenticate properly:**
1. Users configure their own PAT via **Codex Settings modal** (⚙️ icon)
2. PAT is encrypted and stored in browser's localStorage
3. Each user has their own token - never shared or exposed

**For server-side operations** (CI/CD, build scripts):
- Use `GH_PAT` (without `NEXT_PUBLIC_` prefix) - this stays server-side only

---

### `NEXT_PUBLIC_GA_MEASUREMENT_ID`

**Google Analytics 4 Measurement ID**

- **Format**: `G-XXXXXXXXXX`
- **Required**: No
- **Where to get it**: [Google Analytics](https://analytics.google.com/) → Admin → Data Streams
- **Privacy**: IP anonymization enabled, no ad personalization, first-party cookies only

**Example**:
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-ABC123DEF4
```

### `NEXT_PUBLIC_CLARITY_PROJECT_ID`

**Microsoft Clarity Project ID**

- **Format**: Alphanumeric string (e.g., `abc123def`)
- **Required**: No
- **Where to get it**: [Microsoft Clarity](https://clarity.microsoft.com/) → Settings → Project ID
- **Privacy**: Session recordings, heatmaps, no PII stored

**Example**:
```bash
NEXT_PUBLIC_CLARITY_PROJECT_ID=myclarity123
```

---

## Google Calendar Integration

Quarry Planner can sync with Google Calendar. There are three authentication modes:

1. **PKCE (Desktop/Electron)**: No secret needed, secure by design
2. **Pre-configured (Hosted)**: Secret stays on server
3. **BYOK (Self-hosted)**: Users provide their own credentials

### `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**Google OAuth Client ID for web applications**

- **Format**: `xxxxxxxxxx.apps.googleusercontent.com`
- **Required**: Yes for pre-configured OAuth
- **Where to get it**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Used by**: Both server-side token exchange and client-side authorization URL

**Example**:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

### `GOOGLE_CLIENT_SECRET`

**Google OAuth Client Secret (server-side only)**

- **Format**: `GOCSPX-xxxxxxxxxxxxxxxxxxxx`
- **Required**: Yes for pre-configured OAuth on hosted deployments
- **Security**: ⚠️ **NEVER** expose this in `NEXT_PUBLIC_*` variables
- **Used by**: Server-side token exchange at `/api/auth/google-calendar/token`

**Example**:
```bash
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
```

### `NEXT_PUBLIC_GOOGLE_DESKTOP_CLIENT_ID`

**Google OAuth Client ID for desktop applications (PKCE)**

- **Format**: `xxxxxxxxxx.apps.googleusercontent.com`
- **Required**: Only for Electron desktop app
- **Difference**: Create this as "Desktop" application type in Google Cloud Console
- **Used by**: Electron/desktop app for PKCE flow (no secret needed)

**Example**:
```bash
NEXT_PUBLIC_GOOGLE_DESKTOP_CLIENT_ID=987654321-xyz.apps.googleusercontent.com
```

### OAuth Mode Priority

When the app starts, it detects the OAuth mode in this order:

1. **PKCE**: If running in Electron AND `NEXT_PUBLIC_GOOGLE_DESKTOP_CLIENT_ID` is set
2. **Pre-configured**: If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` AND `GOOGLE_CLIENT_SECRET` are set
3. **BYOK**: If user has configured credentials in Settings
4. **None**: Prompts user to configure BYOK credentials

### Setup Instructions

For detailed setup instructions, see:
- [Google Calendar Setup Guide](/docs/GOOGLE_CALENDAR_SETUP.md)
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
```

## Implementation

See `components/Analytics.tsx` for the analytics component. It:

- ✅ Respects `navigator.doNotTrack === '1'`
- ✅ Uses `anonymize_ip: true` for GA4
- ✅ Disables Google Signals and ad personalization
- ✅ Only loads when IDs are provided

## GDPR Compliance

Our analytics setup is GDPR-compliant:

- **No PII collected** (names, emails, phone numbers)
- **IP anonymization** (last octet removed)
- **User consent** via DNT signal
- **Data minimization** (only aggregate usage data)
- **Retention limits** (14 months auto-deletion in GA4)

See [Privacy Policy](/privacy) for full details.

## Disabling Analytics

### Option 1: Don't set the env vars (recommended for local development)

Leave the variables empty in `.env.local`:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
```

### Option 2: Enable Do Not Track in your browser

Analytics will automatically skip initialization if DNT is enabled.

**Chrome/Edge**:
1. Settings → Privacy & Security
2. Enable "Send a 'Do Not Track' request"

**Firefox**:
1. Preferences → Privacy & Security
2. Under "Website Privacy Preferences", select "Tell websites not to sell or share my data"

**Safari**:
1. Preferences → Privacy
2. Enable "Prevent cross-site tracking"

---

## Codex Viewer Configuration

### `NEXT_PUBLIC_CODEX_REPO_OWNER`

**GitHub repository owner for the Codex source**

- **Format**: GitHub username or organization name
- **Required**: No (defaults to `framersai`)
- **Example**: `myorganization` or `myusername`

```bash
NEXT_PUBLIC_CODEX_REPO_OWNER=framersai
```

### `NEXT_PUBLIC_CODEX_REPO_NAME`

**GitHub repository name for the Codex source**

- **Format**: Repository name
- **Required**: No (defaults to `codex`)
- **Example**: `my-knowledge-base`

```bash
NEXT_PUBLIC_CODEX_REPO_NAME=codex
```

### `NEXT_PUBLIC_CODEX_REPO_BRANCH`

**Default branch for the Codex repository**

- **Format**: Branch name
- **Required**: No (defaults to `main`)
- **Example**: `main`, `master`, `production`

```bash
NEXT_PUBLIC_CODEX_REPO_BRANCH=main
```

### `NEXT_PUBLIC_ENABLE_REPO_EDIT`

**Enable repository source editing in Codex settings**

- **Format**: `true` or `false`
- **Required**: No (defaults to `false`)
- **When enabled**: Users can change the Codex repository source via Settings
- **When disabled**: Repository source is fixed and cannot be changed

```bash
NEXT_PUBLIC_ENABLE_REPO_EDIT=false
```

**⚠️ Security Note**: Only enable this if you want users to be able to point the Codex viewer at different repositories. The repository must follow the OpenStrand schema (weaves/looms/strands structure).

**Template Repository**: If you want to create your own Codex, use our [Codex Template](https://github.com/framersai/codex-template) which includes:
- Pre-configured OpenStrand schema
- GitHub Actions for auto-indexing
- Search index generation
- Example weaves and strands

---

## Public Docs & SEO Configuration

### `NEXT_PUBLIC_CODEX_PUBLIC_DOCS`

**Enable SEO-friendly public docs URLs**

- **Format**: `true` or `false`
- **Required**: No (defaults to `true`)
- **When enabled**: Strands accessible via clean URLs like `/quarry/openstrand/overview`
- **When disabled**: Uses query param URLs like `/codex?file=weaves/openstrand/overview.md`

```bash
NEXT_PUBLIC_CODEX_PUBLIC_DOCS=true
```

**Features when enabled:**
- Wikipedia-style clean URLs without `.md` extension
- Automatic sitemap generation for indexable strands
- JSON-LD structured data for search engines
- Per-strand `seo.index` control to exclude specific strands from search engines

### `NEXT_PUBLIC_CODEX_BASE_URL`

**Base URL for canonical links and sitemap**

- **Format**: Full URL with protocol
- **Required**: No (defaults to `https://frame.dev`)
- **Example**: `https://mysite.com`

```bash
NEXT_PUBLIC_CODEX_BASE_URL=https://frame.dev
```

### `NEXT_PUBLIC_CODEX_SITEMAP_ENABLED`

**Include strands in sitemap.xml**

- **Format**: `true` or `false`
- **Required**: No (defaults to `true`)
- **When enabled**: All indexable strands appear in `/sitemap.xml`
- **When disabled**: Strands excluded from sitemap (still accessible via direct URL)

```bash
NEXT_PUBLIC_CODEX_SITEMAP_ENABLED=true
```

**Per-Strand SEO Control**: Add to strand frontmatter:
```yaml
seo:
  index: false      # Exclude from search engines
  follow: true      # Follow outbound links
  sitemapPriority: 0.8
```

---

## Local Filesystem Mode Configuration

> **AI Agent Integration**: Local filesystem mode allows AI agents like Claude Code, Cursor, and Gemini CLI to directly read and edit your knowledge base files.

### `NEXT_PUBLIC_CODEX_DEFAULT_MODE`

**Default content source mode**

- **Format**: `github` | `hybrid` | `sqlite` | `filesystem` | `bundled`
- **Required**: No (defaults to `github`)
- **Options**:
  - `github`: Fetch content directly from GitHub repository
  - `hybrid`: GitHub sync with local SQLite cache (recommended)
  - `sqlite`: Local SQLite database only
  - `filesystem`: Read from local folder on disk
  - `bundled`: Use bundled example content

```bash
NEXT_PUBLIC_CODEX_DEFAULT_MODE=hybrid
```

### `NEXT_PUBLIC_CODEX_LOCAL_PATH`

**Default path for local filesystem content**

- **Format**: Absolute or relative path to a folder containing weaves
- **Required**: Only if `CODEX_DEFAULT_MODE=filesystem`
- **Example**: `/Users/me/Documents/my-codex` or `./public/weaves`

```bash
NEXT_PUBLIC_CODEX_LOCAL_PATH=/path/to/your/weaves
```

### Content Source Modes Explained

| Mode | Description | Best For |
|------|-------------|----------|
| **GitHub** | Direct API fetch | Public documentation, always online |
| **Hybrid** | GitHub + local cache | Offline-first, recommended for most users |
| **SQLite** | Local DB only | ZIP imports, no GitHub |
| **Filesystem** | Local folder on disk | AI agent integration, local editing |
| **Bundled** | Built-in examples | Demo/onboarding |

### AI Agent Integration

When using **filesystem** mode, AI agents can directly interact with your knowledge base:

1. **Claude Code**: Point it to your weaves folder and ask it to explore/edit strands
2. **Cursor**: Open your weaves folder as a project
3. **Gemini CLI**: Configure the local path for document exploration

The bundled `llms.txt` and `AGENTS.md` files in `public/weaves/` provide instructions for AI agents on how to navigate and edit the OpenStrand structure.

**Example agent instruction:**
```
Read the llms.txt file at /path/to/weaves/llms.txt for documentation structure guidelines.
```

### Folder Structure

When using filesystem mode, your folder should follow the OpenStrand schema:

```
weaves/
├── llms.txt            # AI agent instructions
├── AGENTS.md           # Detailed agent guide
├── my-weave/
│   └── looms/
│       └── my-loom/
│           └── strands/
│               ├── overview.md
│               └── getting-started.md
└── another-weave/
    └── ...
```

---

## Semantic Search & Q&A Configuration

### `NEXT_PUBLIC_ENABLE_ORT`

**Enable ONNX Runtime Web for semantic search**

- **Format**: `true` or `false`
- **Required**: No (defaults to `false`)
- **When enabled**: Uses ONNX Runtime Web with WebGPU/SIMD/threads for faster embedding inference
- **When disabled**: Falls back to Transformers.js (smaller bundle, slower inference)

```bash
NEXT_PUBLIC_ENABLE_ORT=true
```

**⚠️ IMPORTANT**: To use ORT, you must **manually install** `onnxruntime-web`:

```bash
pnpm add onnxruntime-web
# or
npm install onnxruntime-web
```

**Why manual?** The package includes native N-API bindings that cause Next.js SWC compiler crashes on Linux CI runners. By making it optional, we ensure the default build always works. When you install it manually, the hybrid engine will detect and use it automatically.

**Pros of enabling ORT Web**:
- ✅ **2-4× faster** inference with WebGPU (when available)
- ✅ **1.3-1.6× faster** with SIMD/threads on CPU
- ✅ Support for **any ONNX model** (vision, audio, multimodal)
- ✅ Better performance on high-end devices

**Cons of enabling ORT Web**:
- ⚠️ **+10 MB** bundle size (WASM binaries)
- ⚠️ **Requires threads** for full speed (needs `crossOriginIsolated` headers)
- ⚠️ **Experimental** WebGPU backend (fallback to CPU if unavailable)
- ⚠️ **GitHub Pages limitation**: No custom headers → single-thread WASM only

**Best for**:
- Self-hosted deployments with full control
- PWA installations (offline-capable)
- Power users with GPU-enabled browsers
- Future support for heavy models (OCR, multimodal)

**Fallback behavior**:
If ORT fails to initialize (model unavailable, WASM error, etc.), the engine automatically falls back to:
1. Transformers.js (smaller, stable, CPU-only)
2. Lexical search (no embeddings, keyword matching)

Users will see a toast notification explaining the degradation and can still use the Codex.

---

## LLM / AI Integration

Quarry Codex supports **5 LLM providers** with automatic fallback and BYOK (Bring Your Own Key) support. Configure one or more providers for AI-powered features.

### Multi-Provider Support

| Provider | Use Case | Pricing | Key Required |
|----------|----------|---------|--------------|
| **Anthropic Claude** | Best for analysis & writing | Pay-per-use | Yes |
| **OpenAI GPT** | Fast general purpose | Pay-per-use | Yes |
| **OpenRouter** | Access 100+ models | Pay-per-use | Yes |
| **Mistral** | European AI, code focus | Pay-per-use | Yes |
| **Ollama** | 100% local & private | Free | No (local) |

### `NEXT_PUBLIC_OPENAI_API_KEY` or `OPENAI_API_KEY`

**OpenAI API key for GPT models**

- **Format**: `sk-...`
- **Required**: No (AI features disabled without a provider)
- **Where to get it**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Models used**: `gpt-4o-mini` (default), configurable

```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-openai-key
```

### `NEXT_PUBLIC_ANTHROPIC_API_KEY` or `ANTHROPIC_API_KEY`

**Anthropic API key for Claude models**

- **Format**: `sk-ant-...`
- **Required**: No
- **Where to get it**: [Anthropic Console](https://console.anthropic.com/settings/keys)
- **Models used**: `claude-3-5-sonnet-20241022` (default), configurable

```bash
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

### `NEXT_PUBLIC_OPENROUTER_API_KEY` or `OPENROUTER_API_KEY`

**OpenRouter API key for multi-provider access**

- **Format**: `sk-or-...`
- **Required**: No
- **Where to get it**: [OpenRouter](https://openrouter.ai/keys)
- **Benefit**: Access to 100+ models with a single API key

```bash
NEXT_PUBLIC_OPENROUTER_API_KEY=sk-or-your-openrouter-key
```

### `NEXT_PUBLIC_MISTRAL_API_KEY` or `MISTRAL_API_KEY`

**Mistral AI API key for Mistral models**

- **Format**: Alphanumeric string
- **Required**: No
- **Where to get it**: [Mistral Console](https://console.mistral.ai/api-keys/)
- **Models used**: `mistral-small-latest` (default), `mistral-large-latest`, `codestral-latest`

```bash
NEXT_PUBLIC_MISTRAL_API_KEY=your-mistral-key
```

### `OLLAMA_BASE_URL`

**Ollama local server address for running models locally**

- **Format**: URL with protocol and port
- **Required**: No (defaults to `http://localhost:11434`)
- **Where to get it**: Install [Ollama](https://ollama.ai/) and run a model
- **Models used**: `llama3.2` (default), any Ollama-compatible model

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

**Running Ollama locally:**
```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Start the server (runs on port 11434 by default)
ollama serve
```

**Note**: Ollama runs entirely locally with no API key required. Your data never leaves your machine.

### LLM Features

When configured, LLM powers:
- **Smart Auto-fill**: Intelligent tag and topic suggestions for strand creation
- **Enhanced Summaries**: AI-generated content summaries
- **Quiz & Flashcard Generation**: AI-powered learning content
- **Q&A Oracle**: Natural language question answering

### Provider Priority

1. **User's Preferred Provider**: Set via Settings → API Keys → Default Provider
2. **BYOK (Bring Your Own Key)**: Keys entered in Settings override `.env` keys
3. **Environment Variables**: Used as fallback when no user key is configured
4. **Automatic Fallback**: If one provider fails, tries the next available

### Security Notes

- `NEXT_PUBLIC_*` keys are exposed in the browser bundle
- For sensitive deployments, use server-side keys without the `NEXT_PUBLIC_` prefix
- The LLM library automatically detects and uses available providers
- **BYOK Priority**: User-provided API keys in Settings override `.env` keys
- Fallback: Statistical NLP analysis works without any LLM keys

---

## Stripe Configuration (Quarry Pro)

Quarry Pro uses Stripe for payment processing. The product and prices are pre-configured in Stripe.

### Product & Price IDs

| Variable | Value | Description |
|----------|-------|-------------|
| `STRIPE_QUARRY_PRO_PRODUCT_ID` | `prod_TjRWbCphp957L4` | Quarry Pro product |
| `STRIPE_QUARRY_PRO_MONTHLY` | `price_1SlyduCBrYnyjAOOlYvgIcx2` | $9/month (grandfathered) |
| `STRIPE_QUARRY_PRO_ANNUAL` | `price_1Sm1OFCBrYnyjAOO7SFJdLJZ` | $79/year (save 27%) |
| `STRIPE_QUARRY_PRO_LIFETIME` | `price_1Sm1OFCBrYnyjAOOgZNAjakB` | $199 one-time |

### `STRIPE_SECRET_KEY`

**Stripe API secret key**

- **Format**: `sk_live_...` (production) or `sk_test_...` (development)
- **Required**: Yes for payment processing
- **Where to get it**: [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
- **Security**: Server-side only, never expose in `NEXT_PUBLIC_*`

```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### `STRIPE_WEBHOOK_SECRET`

**Stripe webhook signing secret**

- **Format**: `whsec_...`
- **Required**: Yes for webhook verification
- **Where to get it**: Stripe Dashboard → Developers → Webhooks → Signing secret
- **For development**: Run `stripe listen --forward-to localhost:3847/api/billing/webhook`

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Pricing Strategy

Quarry Pro uses **grandfathered launch pricing**:

| Plan | Launch Price | Future Price | Notes |
|------|--------------|--------------|-------|
| Monthly | $9/month | $19/month | Grandfathered forever for early subscribers |
| Annual | $79/year | $159/year | Save 27% vs monthly |
| Lifetime | $199 | $299+ | One-time, includes all future updates |

**When team/collaborative features launch**, the price increases to $19/month. Early subscribers keep $9/month forever.

### Promotional Coupons

All coupons are configured in Stripe with **minimum order value: $99** to restrict to lifetime purchases only.

| Coupon Code | Discount | Final Price | Limit |
|-------------|----------|-------------|-------|
| `LAUNCH50` | 50% off | $99 | Unlimited |
| `EARLYBIRD` | 75% off | $49 | 499 redemptions |
| Student | 65.33% off | $69 | Per-request |

### Student Discount Process

1. Student emails `team@frame.dev` from their `.edu` email address
2. Admin creates a unique single-use coupon in Stripe:
   - **Percent off**: 65.33%
   - **Redemption limit**: 1
   - **Minimum order**: $99
3. Send coupon code to student

**Creating student coupons in Stripe:**
1. Go to [Stripe Dashboard → Products → Coupons](https://dashboard.stripe.com/coupons/create)
2. Click "New Coupon"
3. Set: 65.33% off, single use, min order $99
4. Copy the code and send to student

---

## Email Service (Resend)

Quarry uses [Resend](https://resend.com) for transactional emails (license key delivery, password reset, etc).

### `RESEND_API_KEY`

**Resend API key for sending emails**

- **Format**: `re_xxxxxxxxxxxx`
- **Required**: Yes for email functionality
- **Where to get it**: [Resend Dashboard → API Keys](https://resend.com/api-keys)
- **Security**: Server-side only, never expose in `NEXT_PUBLIC_*`

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### `EMAIL_FROM`

**Sender address for outgoing emails**

- **Format**: `Name <email@domain.com>`
- **Required**: No (defaults to `Quarry <hello@quarry.space>`)
- **Note**: Domain must be verified in Resend first

```bash
EMAIL_FROM=Frame.dev <team@frame.dev>
```

### `EMAIL_SUPPORT`

**Support email shown in email templates**

- **Format**: `email@domain.com`
- **Required**: No (defaults to `support@quarry.space`)

```bash
EMAIL_SUPPORT=team@frame.dev
```

### Domain Verification

Before emails will work, you must verify your sending domain:

1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain" and enter your domain (e.g., `frame.dev`)
3. Add the DNS records Resend provides:
   - **MX record**: For receiving bounces
   - **TXT record**: SPF verification
   - **CNAME records**: DKIM signing
4. Wait for verification (5-30 minutes)
5. Once verified, emails from your domain will work

### Email Templates

Resend sends these email types:
- **License Key Delivery**: After lifetime purchase, contains activation key
- **Recovery Key**: 24-word BIP39 phrase for account recovery

---

## OAuth Configuration

Quarry supports Google and GitHub OAuth for user authentication.

### Google OAuth

#### `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**Google OAuth Client ID (public)**

- **Format**: `xxxxxxxxxxxx.apps.googleusercontent.com`
- **Required**: Yes for Google sign-in
- **Where to get it**: [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
```

#### `GOOGLE_CLIENT_SECRET`

**Google OAuth Client Secret (server-side only)**

- **Format**: `GOCSPX-xxxxxxxxxxxx`
- **Required**: Yes for Google sign-in
- **Security**: Server-side only, never expose in `NEXT_PUBLIC_*`

```bash
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Click "Create Credentials" → "OAuth 2.0 Client ID"
4. Select "Web application"
5. Add authorized redirect URI: `https://quarry.space/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` files

### GitHub OAuth

#### `GITHUB_CLIENT_ID`

**GitHub OAuth App Client ID**

- **Format**: Alphanumeric string
- **Required**: Yes for GitHub sign-in
- **Where to get it**: [GitHub Developer Settings](https://github.com/settings/developers)

```bash
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
```

#### `GITHUB_CLIENT_SECRET`

**GitHub OAuth App Client Secret**

- **Format**: Alphanumeric string
- **Required**: Yes for GitHub sign-in
- **Security**: Server-side only

```bash
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Quarry
   - **Homepage URL**: `https://quarry.space`
   - **Authorization callback URL**: `https://quarry.space/api/auth/github/callback`
4. Copy Client ID and generate a Client Secret
5. Add both to your `.env` files

---
