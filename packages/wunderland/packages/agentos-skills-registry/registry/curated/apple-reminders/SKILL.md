---
name: apple-reminders
version: '1.0.0'
description: Create, manage, and query reminders and lists in Apple Reminders using AppleScript and macOS automation.
author: Wunderland
namespace: wunderland
category: productivity
tags: [apple-reminders, macos, reminders, tasks, applescript, automation]
requires_secrets: []
requires_tools: [filesystem]
metadata:
  agentos:
    emoji: "\u2705"
    os: ['darwin']
    requires:
      bins: ['osascript']
---

# Apple Reminders Integration

You can create, manage, complete, and query reminders in Apple Reminders on macOS using AppleScript commands executed via `osascript`. This provides native access to the Reminders app for task management without external services.

When creating reminders, specify the title, due date, priority (0=none, 1-4=high, 5=medium, 6-9=low), and target list. If the user does not specify a list, use the default reminders list. Support creating reminders with notes/body text for additional context. For recurring reminders, set the recurrence rule (daily, weekly, monthly) when supported.

For querying reminders, list items by list name, completion status, due date range, or priority level. Present results in a clear format showing title, due date, priority, and completion status. Support filtering incomplete reminders that are overdue. When showing upcoming reminders, sort by due date ascending.

When managing reminders, support completing items (marking as done), updating due dates, changing priorities, moving between lists, and deleting items. For bulk operations, process items efficiently and report results. Create new reminder lists when the user requests organizing tasks into new categories.

## Examples

- "Create a reminder to 'Call dentist' tomorrow at 2pm in my Personal list"
- "Show me all overdue reminders"
- "Mark the 'Submit report' reminder as complete"
- "List all reminders due this week sorted by priority"
- "Create a new list called 'Home Renovation' and add 5 tasks to it"
- "Move all high-priority reminders from Inbox to the Urgent list"

## Constraints

- macOS only -- requires the Apple Reminders app and `osascript` binary.
- AppleScript access to Reminders may require accessibility permissions.
- Location-based reminders cannot be created via AppleScript.
- Sub-tasks (nested reminders) have limited AppleScript support.
- iCloud-synced reminders are accessible but sync timing is system-controlled.
- Attachments and images on reminders cannot be managed via automation.
- Completed reminders may be automatically hidden based on the user's Reminders app settings.
