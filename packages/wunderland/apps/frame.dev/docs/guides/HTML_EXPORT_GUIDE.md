# HTML Export Guide

Export strands as standalone HTML files for sharing, offline viewing, or archival.

## Overview

The HTML export feature creates self-contained HTML files that:

- **Work offline** - No external dependencies required
- **Look great** - Professional styling with dark mode support
- **Preserve content** - Full markdown rendering including code, tables, and lists
- **Are portable** - Single file, easy to share via email or messaging

## Quick Start

### From the Toolbar

1. Open a strand in the editor
2. Click **Edit** in the toolbar
3. Select **Share as HTML**
4. Configure options (optional)
5. Click **Export HTML**

### From Context Menu

1. Right-click any strand in the file tree
2. Select **Export → HTML**

## Export Options

### Embed Images

When enabled, images are converted to base64 data URIs and embedded directly in the HTML file. This increases file size but ensures the document is truly self-contained.

| Setting | File Size | Portability |
|---------|-----------|-------------|
| Off | Smaller | Images need to be available at original paths |
| On | Larger | Completely self-contained |

**Recommendation**: Enable for sharing externally; disable for local archival.

## What's Included

### Content

- Full markdown rendering (headings, lists, tables, code blocks)
- Sanitized HTML (XSS protection via DOMPurify)
- Task lists with checkboxes
- Blockquotes and horizontal rules

### Metadata

The exported file includes a metadata section showing:
- Title
- Author (if set)
- Date (if set)
- Tags
- Original file path
- Export timestamp

### Styling

- **Responsive layout** - Works on desktop and mobile
- **Dark mode support** - Automatically adapts to system preference
- **Print-friendly** - Clean output when printed to PDF
- **Code syntax highlighting** - Monospace fonts with proper styling

## Example Output

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Document Title</title>
  <style>
    /* Embedded CSS with dark mode support */
    :root {
      --bg-color: #ffffff;
      --text-color: #1a1a1a;
      /* ... more variables ... */
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
      }
    }
    /* ... styles ... */
  </style>
</head>
<body>
  <h1>My Document Title</h1>
  <div class="metadata">
    <p><strong>Author:</strong> Jane Doe</p>
    <p><strong>Date:</strong> 2024-01-15</p>
    <p><strong>Tags:</strong> documentation, guide</p>
    <p><strong>Exported:</strong> 1/15/2024, 10:30:00 AM</p>
  </div>
  <div class="content">
    <!-- Rendered markdown content -->
  </div>
</body>
</html>
```

## Use Cases

### Sharing with Non-Quarry Users

Export a document to share with colleagues who don't use Quarry:

1. Export as HTML with images embedded
2. Send the single `.html` file via email or Slack
3. Recipient opens in any web browser

### Offline Reading

Create portable copies of important documents:

1. Export documents you need offline
2. Store in a folder or USB drive
3. Open in any browser without internet

### Client Deliverables

Provide professional document exports to clients:

1. Export your report or proposal
2. Optionally print to PDF from the browser
3. Share the HTML or PDF file

### Archival

Create point-in-time snapshots:

1. Export important documents periodically
2. Store in an archive folder with date stamps
3. Retain complete copies independent of Quarry

## Styling Customization

### Default Theme

The exported HTML uses CSS variables that automatically adapt to light/dark modes:

| Variable | Light Mode | Dark Mode |
|----------|------------|-----------|
| `--bg-color` | `#ffffff` | `#1a1a1a` |
| `--text-color` | `#1a1a1a` | `#e0e0e0` |
| `--heading-color` | `#000000` | `#ffffff` |
| `--link-color` | `#0066cc` | `#66b3ff` |
| `--code-bg` | `#f5f5f5` | `#2d2d2d` |

### Custom Styling (Advanced)

After export, you can modify the embedded `<style>` section to customize:

```html
<style>
  /* Change primary color */
  :root {
    --link-color: #e91e63;
  }
  
  /* Custom font */
  body {
    font-family: 'Georgia', serif;
  }
</style>
```

## Programmatic Export

### API Usage

```typescript
import { exportStrandAsHtml, downloadHtml } from '@/lib/export/standaloneHtml'

const html = await exportStrandAsHtml({
  content: markdownContent,
  metadata: {
    title: 'My Document',
    author: 'Jane Doe',
    date: '2024-01-15',
    tags: ['guide', 'documentation'],
  },
  fileName: 'my-document.md',
  filePath: 'weaves/docs/my-document.md',
  embedImages: true,
  baseUrl: 'https://example.com/assets/',
})

// Trigger download
downloadHtml(html, 'my-document.html')
```

### Options

```typescript
interface HtmlExportOptions {
  content: string           // Markdown content
  metadata: StrandMetadata  // Frontmatter data
  fileName: string          // Original filename
  filePath: string          // Original file path
  embedImages?: boolean     // Embed images as data URIs
  baseUrl?: string          // Base URL for resolving relative paths
}
```

## Comparison with Other Exports

| Format | Use Case | Self-Contained | Editable |
|--------|----------|----------------|----------|
| **HTML** | Sharing, offline viewing | Yes* | In browser dev tools |
| **Markdown** | Backup, migration | No | Yes |
| **PDF** | Print, formal delivery | Yes | No |
| **DOCX** | Microsoft Word editing | Yes | Yes |

*With `embedImages: true`

## Limitations

### Not Included

- Interactive features (search, navigation)
- Bidirectional links (converted to plain text)
- Embeddable views (maps, calendars) - rendered as placeholders
- Dynamic content (formulas, live data)

### Image Considerations

- Very large images (>5MB) may slow down export
- SVG images are embedded as-is
- External URLs are preserved (not embedded unless using baseUrl)

### Browser Compatibility

The exported HTML works in all modern browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Best Practices

1. **Add metadata** - Set title, author, and date for professional exports
2. **Review before sharing** - Open the HTML file to verify appearance
3. **Use descriptive filenames** - Include date or version in filename
4. **Consider file size** - Large embedded images create large files

## Troubleshooting

### Images Not Displaying

- **If using relative paths**: Ensure the HTML file is in the same location as the images
- **If embedding failed**: Check browser console for fetch errors
- **External URLs**: Ensure they're accessible

### Styling Issues

- Clear browser cache and reload
- Verify no browser extensions are interfering
- Check for conflicting local styles

### Export Button Not Appearing

- Ensure a strand is selected/open
- Verify you have read access to the strand
- Refresh the page and try again

## Related Guides

- [Import/Export Overview](./IMPORT_EXPORT_GUIDE.md)
- [PDF Export](./PDF_EXPORT_GUIDE.md)
- [Sharing & Publishing](./SHARING_PUBLISHING_GUIDE.md)




