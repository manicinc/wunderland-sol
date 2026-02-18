# Evernote Import Guide

Import your Evernote notes into Quarry Codex with full content and metadata preservation.

## Overview

The Evernote importer converts `.enex` export files from Evernote into Quarry strands. It handles:

- **Content conversion**: ENML → Markdown with formatting preservation
- **Metadata extraction**: Dates, tags, location, and source information
- **Attachments**: Embedded images and resources (as data URIs or separate files)
- **Task lists**: Evernote checkboxes → Markdown task lists
- **Notebooks**: Maps to looms in the Fabric structure

## Exporting from Evernote

### Desktop App (Mac/Windows)

1. Open Evernote desktop application
2. Select the notes or notebooks you want to export
   - To select all notes in a notebook: Click the notebook, then `Cmd+A` (Mac) or `Ctrl+A` (Windows)
   - To select specific notes: Hold `Cmd` (Mac) or `Ctrl` (Windows) and click each note
3. Go to **File → Export Notes...**
4. Choose format: **ENEX format (.enex)**
5. Click **Save**

### Web App

1. Log into Evernote at [evernote.com](https://www.evernote.com)
2. Click on **Notebooks** in the sidebar
3. Click the three dots (`...`) next to the notebook you want to export
4. Select **Export notebook**
5. Choose **ENEX format**
6. Download the file

> **Tip**: Export one notebook at a time for better organization. Each notebook will become a separate loom in Quarry.

## Importing into Quarry

### Using the Import Wizard

1. Open Quarry Codex
2. Click the **Import** button in the toolbar (or go to **File → Import**)
3. Select **Evernote Export** from the source options
4. Click **Browse** and select your `.enex` file
5. Configure import options:
   - **Target Weave**: Choose where to place imported strands
   - **Preserve Structure**: Keep notebook hierarchy as looms
6. Click **Import** to start the conversion

### Via Settings

1. Go to **Settings → Export & Import**
2. Under "Import from External Sources", click **Evernote**
3. Follow the wizard steps

## What Gets Imported

### Content Conversion

| Evernote Element | Quarry Equivalent |
|------------------|-------------------|
| Note title | Strand title (frontmatter) |
| Note content (ENML) | Markdown body |
| Bold (`<b>`) | `**bold**` |
| Italic (`<i>`) | `*italic*` |
| Underline (`<u>`) | `__underline__` |
| Strikethrough (`<s>`) | `~~strikethrough~~` |
| Links (`<a>`) | `[text](url)` |
| Checkboxes (checked) | `- [x]` |
| Checkboxes (unchecked) | `- [ ]` |
| Ordered lists | `1. 2. 3.` |
| Unordered lists | `- - -` |
| Tables | Markdown tables |
| Code blocks | Fenced code blocks |
| Blockquotes | `>` prefix |
| Images | `![alt](src)` with data URI or path |

### Metadata Mapping

| Evernote Field | Strand Frontmatter |
|----------------|-------------------|
| `<title>` | `title` |
| `<created>` | `created` |
| `<updated>` | `updated` |
| `<tag>` | `tags` array |
| `<author>` | `evernote.author` |
| `<source-url>` | `evernote.sourceURL` |
| `<latitude>`, `<longitude>` | `latitude`, `longitude` |
| `<altitude>` | `altitude` |
| Task status | `task.status` |

### Example Conversion

**Original ENEX:**
```xml
<note>
  <title>Meeting Notes</title>
  <content><![CDATA[
    <en-note>
      <div><b>Project Alpha</b></div>
      <div><en-todo checked="true"/>Review specs</div>
      <div><en-todo/>Schedule follow-up</div>
    </en-note>
  ]]></content>
  <created>20240115T093000Z</created>
  <tag>meetings</tag>
  <tag>projects</tag>
</note>
```

**Resulting Strand:**
```markdown
---
id: en-note-abc123
title: Meeting Notes
created: 2024-01-15T09:30:00Z
tags:
  - meetings
  - projects
evernote:
  importedAt: 2024-01-15T10:00:00Z
---

**Project Alpha**

- [x] Review specs
- [ ] Schedule follow-up
```

## Handling Attachments

### Images

- **Data URI mode** (default): Images are embedded directly in the markdown as base64 data URIs
- **Separate files mode**: Images are extracted to an `assets/` folder with relative paths

### Other Attachments

PDFs, documents, and other files attached to notes are:
1. Extracted to an `attachments/` folder within the strand's directory
2. Linked in the markdown with `[filename](./attachments/filename.ext)`

## Post-Import Steps

### 1. Review Imported Strands

After import, review your strands for any conversion issues:
- Check formatting is correct
- Verify images are displaying
- Confirm links are working

### 2. Add to Collections

Use supertags or collections to organize your imported content:
```markdown
---
supertags:
  - imported
  - evernote
---
```

### 3. Create Bidirectional Links

Replace Evernote internal links with Quarry wikilinks:
- Old: `evernote:///view/...`
- New: `[[Meeting Notes]]`

## Troubleshooting

### Common Issues

**Import fails with XML parsing error**
- Ensure the file is a valid `.enex` export
- Try re-exporting from Evernote
- Check for special characters that may have caused encoding issues

**Images not displaying**
- If using separate files mode, ensure the assets folder exists
- Check that image paths are relative to the strand location
- For data URI mode, very large images may cause performance issues

**Missing formatting**
- Some complex Evernote formatting may not have a direct markdown equivalent
- Nested tables and complex layouts may be simplified
- Review and adjust formatting manually if needed

**Tags not imported**
- Ensure tags exist in the original Evernote note
- Check that the ENEX export includes tag information

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Try importing a smaller subset of notes first
3. Create an issue on the [Frame.dev GitHub repository](https://github.com/framersai/frame.dev)

## Limitations

- **Encrypted notes**: Cannot be imported (decrypt in Evernote first)
- **Note links**: Evernote internal links need manual conversion to wikilinks
- **Stacks**: Notebook stacks are flattened (not preserved as hierarchy)
- **Reminders**: Imported as metadata but not active in Quarry
- **Ink notes**: Handwriting/sketches are imported as images

## Related Guides

- [Import/Export Overview](./IMPORT_EXPORT_GUIDE.md)
- [Obsidian Migration Guide](./OBSIDIAN_MIGRATION.md)
- [Bidirectional Links Guide](./BIDIRECTIONAL_LINKS.md)




