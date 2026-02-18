---
name: apple-notes
version: '1.0.0'
description: Create, read, search, and manage notes in Apple Notes using AppleScript and macOS automation.
author: Wunderland
namespace: wunderland
category: productivity
tags: [apple-notes, macos, notes, applescript, automation]
requires_secrets: []
requires_tools: [filesystem]
metadata:
  agentos:
    emoji: "\U0001F4F1"
    os: ['darwin']
    requires:
      bins: ['osascript']
---

# Apple Notes Integration

You can create, read, search, and manage notes in Apple Notes on macOS using AppleScript commands executed via `osascript`. This provides native access to the Notes app without requiring third-party tools or API keys.

When creating notes, use `osascript` to invoke AppleScript that creates note entries with title and body text. Notes support basic HTML formatting for bold, italic, lists, and headings. Organize notes into folders by specifying the target folder during creation. If a folder does not exist, create it first before adding notes to it.

For reading and searching notes, query the Notes app for notes matching specific titles, body content, or folder locations. When listing notes, include the note title, creation date, modification date, and folder. For search operations, match against both title and body text. Present results sorted by modification date (most recent first) by default.

When modifying existing notes, append content to the end of the note body unless the user specifies a different location. Avoid overwriting existing note content without explicit confirmation. Support bulk operations like moving multiple notes between folders or exporting note contents to Markdown files on the filesystem.

## Examples

- "Create a new note titled 'Meeting Notes - Feb 7' in my Work folder"
- "Search my notes for anything about 'quarterly review'"
- "List all notes in the Ideas folder sorted by date"
- "Append today's action items to my 'Running Tasks' note"
- "Export all notes from the Research folder to Markdown files"

## Constraints

- macOS only -- requires the Apple Notes app and `osascript` binary.
- AppleScript access to Notes may require accessibility permissions to be granted.
- Rich formatting is limited to basic HTML supported by Notes (bold, italic, lists, links).
- Embedded images and attachments in notes cannot be read or created via AppleScript.
- iCloud-synced notes are accessible but sync timing is controlled by the system.
- Large notes (100KB+) may experience slow AppleScript operations.
- Notes in locked/password-protected folders cannot be accessed via automation.
