# Frame.dev Electron Desktop App

This document covers building and distributing Frame.dev as a native desktop application using Electron.

## Quick Start

### Development Mode

Run the web app and Electron together:

```bash
# Install dependencies (if not already done)
pnpm install

# Run Electron in development mode
# This starts Next.js dev server and opens Electron pointing to localhost:3000
pnpm electron:dev
```

### Building for macOS (Local/Unsigned)

For local testing without Apple Developer signing:

```bash
# Build and create distributable (unsigned)
pnpm electron:dist:mac:unsigned

# Output will be in dist/ directory:
# - dist/Frame Quarry-{version}-arm64.dmg (or universal)
# - dist/Frame Quarry-{version}-mac.zip
```

### Building for Distribution (Signed)

For App Store or notarized distribution, you need an Apple Developer account ($99/year).

```bash
# Set environment variables for signing
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="your-password"
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Build signed app
pnpm electron:dist:mac
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm electron:dev` | Development mode (Next.js + Electron) |
| `pnpm electron:start` | Start Electron pointing to dev server |
| `pnpm electron:build` | Compile TypeScript for Electron main process |
| `pnpm electron:prebuild` | Build Next.js static export + Electron TypeScript |
| `pnpm electron:pack` | Create unpacked app (for testing) |
| `pnpm electron:dist` | Create distributable (platform-specific) |
| `pnpm electron:dist:mac` | Create macOS distributable (signed) |
| `pnpm electron:dist:mac:unsigned` | Create macOS distributable (unsigned) |
| `pnpm electron:dist:win` | Create Windows distributable |
| `pnpm electron:dist:linux` | Create Linux distributable |

## Code Signing on macOS

### Why Sign?

- **Gatekeeper**: macOS blocks unsigned apps by default
- **Notarization**: Required for apps distributed outside the App Store
- **User Trust**: Signed apps show your developer name, not "unidentified developer"

### Local Unsigned Builds

For development and testing on your own machine:

1. Build with `pnpm electron:dist:mac:unsigned`
2. When opening the app for the first time:
   - Right-click the app and select "Open"
   - Click "Open" in the security dialog
   - Or: System Preferences → Security & Privacy → "Open Anyway"

### Signed Builds for Distribution

1. **Get an Apple Developer Account** ($99/year at developer.apple.com)

2. **Create Certificates**:
   - Open Xcode → Preferences → Accounts
   - Select your team → Manage Certificates
   - Create "Developer ID Application" certificate

3. **Export Certificate**:
   - Open Keychain Access
   - Find your "Developer ID Application" certificate
   - Right-click → Export as .p12

4. **Set Up Notarization**:
   - Create an app-specific password at appleid.apple.com
   - Find your Team ID in the Developer Portal

5. **Configure Environment**:
   ```bash
   export CSC_LINK="path/to/DeveloperIDApplication.p12"
   export CSC_KEY_PASSWORD="certificate-password"
   export APPLE_ID="your@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="XXXXXXXXXX"
   ```

6. **Build**: `pnpm electron:dist:mac`

## App Icons

### Generating Icons

1. Create a 1024x1024 PNG of your app icon
2. Save it to `build/icon-source.png`
3. Run: `node scripts/generate-icons.js`

This will create:
- `build/icon.icns` (macOS)
- `build/icon.ico` (Windows, requires ImageMagick)

### Manual Icon Creation

- **macOS**: Use Icon Composer or any tool that creates .icns files
- **Windows**: Use an online converter or ImageMagick
- **Linux**: Place PNGs in `build/icons/` at various sizes (16x16 to 512x512)

## GitHub Actions Releases

The project includes a GitHub Actions workflow for automated builds:

### Manual Release

1. Go to Actions → "Build and Release"
2. Click "Run workflow"
3. Enter version (e.g., `0.2.0`)
4. The workflow will build and create a draft release

### Tag-based Release

1. Create and push a tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
2. The workflow will automatically build and create a draft release

### Release Artifacts

- macOS: `.dmg` (installer) and `.zip` (portable)
- Windows: `.exe` (NSIS installer)
- Linux: `.AppImage` and `.deb`

## Project Structure

```
frame.dev/
├── electron/
│   ├── main.ts          # Main process entry point
│   ├── preload.ts       # Preload script for IPC
│   └── tsconfig.json    # TypeScript config for Electron
├── electron-dist/       # Compiled Electron code (generated)
├── build/
│   ├── entitlements.mac.plist  # macOS entitlements
│   ├── icon.icns        # macOS app icon
│   ├── icon.ico         # Windows app icon
│   └── icons/           # Linux icons (various sizes)
├── dist/                # Built apps (generated)
├── out/                 # Next.js static export (generated)
├── electron-builder.yml # Build configuration
└── package.json         # Scripts and dependencies
```

## Architecture

The app uses a simple Electron setup:

1. **Production**: Serves the static Next.js export from `out/` directory
2. **Development**: Connects to the Next.js dev server at `localhost:3000`

```
┌─────────────────────────────────────────────┐
│             Electron Main Process            │
│  ┌─────────────────────────────────────┐    │
│  │       BrowserWindow (Chromium)       │    │
│  │  ┌─────────────────────────────────┐ │    │
│  │  │    Next.js Static Export        │ │    │
│  │  │  (React App in out/ directory)  │ │    │
│  │  └─────────────────────────────────┘ │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │   Preload    │ ←→ │   IPC Bridge     │   │
│  │   Script     │    │  (electronAPI)   │   │
│  └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────┘
```

## Troubleshooting

### "App is damaged and can't be opened"

This happens with unsigned apps. Solutions:
1. Remove quarantine: `xattr -cr "/Applications/Frame Quarry.app"`
2. Or: Right-click → Open → Open

### Build fails with "Cannot find module 'electron-serve'"

Run `pnpm install` to install dependencies.

### Icons not showing

1. Ensure icons exist in `build/` directory
2. For macOS: Need `icon.icns`
3. For Windows: Need `icon.ico`
4. Run `node scripts/generate-icons.js` after creating `build/icon-source.png`

### "electron-builder" command not found

The command should be run via pnpm:
```bash
pnpm electron:dist:mac:unsigned  # Not: electron-builder --mac
```

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/code_signing_services)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
