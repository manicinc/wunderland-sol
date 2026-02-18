# Import/Export Guide

Complete guide for importing and exporting content in Frame.dev Codex.

## Table of Contents

- [Overview](#overview)
- [Importing Content](#importing-content)
  - [From Obsidian](#from-obsidian)
  - [From Notion](#from-notion)
  - [From Google Drive](#from-google-drive)
  - [Markdown Files](#markdown-files)
- [Exporting Content](#exporting-content)
  - [Export to PDF](#export-to-pdf)
  - [Export to Word (DOCX)](#export-to-word-docx)
  - [Export to Markdown](#export-to-markdown)
  - [Export to JSON](#export-to-json)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

---

## Overview

Frame.dev Codex supports comprehensive import and export functionality for multiple formats, allowing you to:

- **Import** from popular note-taking apps (Obsidian, Notion, Google Docs)
- **Export** to standard document formats (PDF, DOCX, Markdown, JSON)
- **Preserve** folder structures, metadata, and links
- **Track progress** with real-time updates
- **Batch process** large collections efficiently

All import/export operations run asynchronously in the background, allowing you to continue working while they complete.

---

## Importing Content

### Getting Started

1. Open Codex Settings (gear icon in toolbar)
2. Navigate to the "Import/Export" tab
3. Click "Import Content" to open the import wizard

The wizard will guide you through a 4-step process:
1. **Select Source** - Choose your import format
2. **Configure** - Select files and set options
3. **Preview** - Review import settings
4. **Import** - Watch progress and completion

### From Obsidian

**Supported Features:**
- ✅ Markdown files with frontmatter
- ✅ Wiki-style links `[[Page Name]]`
- ✅ Folder hierarchy (mapped to looms)
- ✅ Tags (`#tag`)
- ✅ Attachments (images, PDFs)
- ✅ Nested folders

**Export Your Vault:**

1. In Obsidian, go to Settings → Files & Links
2. Click "Export vault" or manually create a ZIP of your vault folder
3. Save the ZIP file

**Import to Codex:**

1. Select "Obsidian Vault" as source
2. Upload your vault ZIP file
3. Choose options:
   - **Preserve folder structure**: Keeps your folder hierarchy as looms
   - **Conflict resolution**: What to do if files already exist
     - **Ask me**: Prompt for each conflict (recommended)
     - **Replace existing**: Overwrite without asking
     - **Merge**: Combine content
     - **Skip existing**: Keep original, ignore new
4. Review and start import

**What Gets Converted:**

```markdown
# Before (Obsidian)
---
tags: [tutorial, obsidian]
---

# My Note

Links to [[Other Note]] and [[folder/Deep Note|display text]].

# After (Codex)
---
id: strand-abc123
title: My Note
tags: [tutorial, obsidian]
version: "1.0"
---

# My Note

Links to [Other Note](/weaves/obsidian-import/other-note.md)
and [display text](/weaves/obsidian-import/folder/deep-note.md).
```

**Tips:**
- Large vaults (1000+ files) may take 2-5 minutes
- Wiki links are automatically converted to Codex paths
- Obsidian frontmatter is merged with Codex frontmatter
- Tags become taxonomy concepts

---

### From Notion

**Supported Features:**
- ✅ Pages (Markdown & HTML export)
- ✅ Databases (CSV)
- ✅ Nested pages (page hierarchy)
- ✅ Code blocks
- ✅ Tables, lists, checkboxes
- ✅ Embedded images

**Export from Notion:**

1. Click "..." menu on the top-right of any page
2. Select "Export"
3. Choose:
   - **Export format**: Markdown & CSV (recommended) or HTML
   - **Include subpages**: Yes (to get full hierarchy)
   - **Create folders for subpages**: Yes
4. Download the ZIP file

**Import to Codex:**

1. Select "Notion Export" as source
2. Upload your Notion ZIP file
3. Configure:
   - **Preserve folder structure**: Maintains page hierarchy
   - **Import databases**: Converts CSV tables to markdown tables
4. Review and import

**What Gets Converted:**

- Pages → Strands
- Page hierarchy → Looms (folders)
- Databases → Markdown tables with metadata
- Embeds → Links or inline content

**Limitations:**
- Advanced block types (columns, synced blocks) converted to simple markdown
- Embedded Notion pages converted to links
- File attachments must be downloaded separately

---

### From Google Drive

**Requirements:**
- Google account with Drive access
- OAuth connection to Frame.dev (one-time setup)

**Setup Google Drive Connection:**

1. In Import wizard, select "Google Drive"
2. Click "Connect Google Drive"
3. Sign in with your Google account
4. Grant permissions:
   - Read-only access to Drive files
   - Read-only access to Google Docs
5. Connection status shows "Connected" with green checkmark

**Using Custom OAuth Credentials (Optional):**

For enhanced security or custom quotas, you can use your own Google Cloud project:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs:
   - Google Drive API
   - Google Docs API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`
5. Copy Client ID and Client Secret
6. In Frame.dev, click "Custom Credentials" and paste them

**Import Documents:**

1. After connecting, enter the **Google Drive Folder ID**
   - Find it in the URL: `drive.google.com/drive/folders/[FOLDER_ID]`
2. Choose options:
   - **Include subfolders**: Process nested folders (up to 5 levels deep)
   - **Preserve structure**: Map folders to looms
3. Review file count and start import

**What Gets Imported:**

- Google Docs → Markdown strands
- Folder structure → Loom hierarchy
- Document metadata → Frontmatter
- Last modified time → Preserved

**Notes:**
- Only Google Docs are imported (not Sheets, Slides, etc.)
- Formatting is converted to markdown (headings, bold, italic, lists)
- Advanced formatting (colors, fonts) not preserved
- Images embedded in docs are not imported (limitation of Google Docs API)
- Rate limits: 1000 requests per 100 seconds (handled automatically)

**Privacy & Security:**
- OAuth tokens encrypted with AES-256-GCM
- Stored only in your browser (localStorage)
- Never sent to Frame.dev servers
- You can revoke access anytime

---

### Markdown Files

Import standard markdown files or exports from other tools.

**Supported:**
- ✅ Plain markdown (.md)
- ✅ GitHub Flavored Markdown
- ✅ YAML frontmatter
- ✅ Code blocks with syntax highlighting
- ✅ Tables, lists, blockquotes

**Import Process:**

1. Select "Markdown Files"
2. Upload single file or ZIP archive
3. Files are imported as individual strands
4. Frontmatter preserved and merged with Codex metadata

---

## Exporting Content

### Export Wizard

1. Open Codex Settings → Import/Export
2. Click "Export Content"
3. Follow 4-step wizard:
   - **Select Format** - PDF, DOCX, Markdown, or JSON
   - **Select Content** - All, current weave, or custom selection
   - **Configure** - Format-specific options
   - **Export** - Download generated file

---

### Export to PDF

**Features:**
- Professional formatting
- Table of contents (optional)
- Page numbers
- Syntax-highlighted code blocks
- Preserved markdown formatting

**Options:**
- **Page size**: Letter (8.5" × 11") or A4
- **Include metadata**: Title page with strand info
- **Include TOC**: Automatic table of contents
- **Margins**: 1 inch on all sides

**Best For:**
- Sharing with non-technical users
- Archival purposes
- Printing documentation
- Creating reports

**Output:**
```
📄 fabric-export-2025-12-22.pdf
   ├─ Title page (if metadata enabled)
   ├─ Table of contents (if enabled)
   ├─ Strand 1 (new page)
   ├─ Strand 2 (new page)
   └─ ...
```

---

### Export to Word (DOCX)

**Features:**
- Microsoft Word compatible
- Editable after export
- Preserves headings, lists, tables
- Code blocks with monospace font
- Metadata in document properties

**Options:**
- **Page size**: Letter or A4
- **Include metadata**: Custom document properties
- **Include TOC**: Word-native table of contents

**Formatting:**
- Headings → Word Heading 1-6 styles
- Code blocks → "Code" style (Courier New)
- Tables → Native Word tables
- Lists → Bulleted and numbered lists

**Best For:**
- Collaborative editing
- Corporate environments requiring .docx
- Further formatting in Word
- Combining with other Word documents

**Compatible With:**
- Microsoft Word 2016+
- Google Docs
- LibreOffice Writer
- Pages (macOS)

---

### Export to Markdown

**Features:**
- ZIP archive with all files
- Preserves folder structure
- Includes metadata.json manifest
- Compatible with Obsidian, Notion, etc.

**Structure:**
```
📦 export-2025-12-22.zip
 ├─ weaves/
 │  ├─ frame/
 │  │  ├─ overview.md
 │  │  └─ research/
 │  │     └─ roadmap.md
 │  └─ wiki/
 │     └─ architecture.md
 ├─ metadata.json (export manifest)
 └─ README.md (import instructions)
```

**Options:**
- **Preserve structure**: Keeps weave/loom hierarchy
- **Include metadata**: Frontmatter in YAML
- **Include README**: Instructions for importing elsewhere

**Best For:**
- Backing up your Codex
- Migrating to another tool
- Version control (git)
- Offline access

---

### Export to JSON

**Features:**
- Complete data export with full metadata
- Machine-readable format
- Includes all frontmatter, content, and relationships
- Ideal for API integrations

**Structure:**
```json
{
  "exportDate": "2025-12-22T10:30:00Z",
  "version": "1.0",
  "totalStrands": 42,
  "strands": [
    {
      "id": "strand-abc123",
      "title": "My Strand",
      "slug": "my-strand",
      "path": "weaves/frame/my-strand.md",
      "content": "# Content here...",
      "frontmatter": { /* full metadata */ },
      "weave": "frame",
      "loom": null,
      "wordCount": 250,
      "lastModified": "2025-12-20T15:00:00Z"
    }
  ]
}
```

**Best For:**
- Data analysis
- Custom integrations
- Programmatic access
- Database imports
- Backup with full fidelity

---

## Advanced Features

### Paginated Document View

Toggle between continuous scroll and paginated view:

1. Open any markdown file in Codex
2. Click the book icon in the toolbar (top-right)
3. Switches between:
   - **Continuous scroll**: Traditional web view
   - **Paginated**: Letter-size pages with breaks

**Features:**
- Letter (8.5" × 11") or A4 page sizes
- Natural page breaks (avoids splitting headings, code blocks)
- Print preview mode
- Page numbers
- Professional formatting

---

### GitHub Integration

When using GitHub storage mode, imports can create pull requests automatically.

**Without Personal Access Token (PAT):**
1. Complete import wizard
2. Click "Generate PR Files"
3. Download ZIP with:
   - All markdown files
   - `IMPORT_INSTRUCTIONS.md` (step-by-step guide)
   - `PR_DESCRIPTION.md` (ready-to-paste description)
4. Follow instructions to manually create PR

**With Personal Access Token:**
1. Add GitHub PAT in Settings → GitHub
2. Complete import wizard
3. Click "Create Pull Request"
4. PR created automatically with:
   - New branch (`import-[timestamp]`)
   - All files committed
   - Descriptive PR description
   - Co-authored by Claude

---

### Batch Operations

Import/export supports large batches efficiently:

- **Parallel processing**: Up to 4 Web Workers
- **Progress tracking**: Real-time updates
- **Cancellation**: Stop mid-process if needed
- **Error recovery**: Continues on failure, reports errors at end

**Performance:**
- Import: ~20 files/second (markdown)
- Export: 100 strands to PDF in ~10 seconds
- Large vaults (1000+ files): 2-5 minutes

---

## Troubleshooting

### Import Issues

**"Failed to import: ZIP file is corrupted"**
- Re-download the export from source app
- Ensure ZIP wasn't modified or partially downloaded
- Try extracting locally first to verify integrity

**"No files found in archive"**
- Check that ZIP contains `.md` files at root or in folders
- Some tools create double-nested ZIPs (extract once, re-zip)

**"Wiki links not converting correctly"**
- Ensure "Preserve folder structure" is enabled
- Check that linked files exist in the import
- Review converted paths in imported strands

**"OAuth connection failed for Google Drive"**
- See [OAuth Setup Guide](./oauth-setup.md)
- Check popup blocker settings
- Try custom OAuth credentials
- Clear browser cache and retry

**"Import stuck at X%"**
- Large files may take time (wait 2-5 minutes for 1000+ files)
- Check browser console for errors (F12 → Console)
- Cancel and retry with smaller batch

### Export Issues

**"PDF export fails with memory error"**
- Export fewer strands at once
- Disable "Include table of contents"
- Try DOCX format instead

**"DOCX formatting looks wrong"**
- Complex markdown may not convert perfectly
- Review in Word and manually adjust
- Report specific formatting issues

**"Markdown export missing files"**
- Ensure "Preserve structure" is enabled
- Check that strands have valid paths
- Verify weave/loom metadata

### Performance

**"Import is slow"**
- Normal for large vaults (2-5 min for 1000+ files)
- Close other browser tabs to free memory
- Disable browser extensions temporarily

**"Export takes too long"**
- Reduce number of strands
- Try simpler format (JSON is fastest)
- Check if "Include metadata" increases time

### General

**"Feature not available"**
- Check that import/export is initialized (console log on startup)
- Refresh page and retry
- Verify browser compatibility (Chrome, Firefox, Safari, Edge)

**"Lost my imported data"**
- Check SQLite storage in browser DevTools
- Look in target weave folder
- Review import job log (Settings → Jobs)

---

## Need Help?

- 📖 [Developer Guide](./developer-guide-converters.md) - Add custom converters
- 🔐 [OAuth Setup Guide](./oauth-setup.md) - Google Drive integration
- 🐛 [Report Issue](https://github.com/framersai/frame/issues) - GitHub Issues
- 💬 [Community Discord](https://discord.gg/framers) - Get help from community

---

*Last updated: 2025-12-22*
*Frame.dev v1.0 - Import/Export System*
