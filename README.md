# Apple Productivity MCP Plugin for Codex

Use Apple Mail, Calendar, and Reminders from a local MCP client on macOS.

This repository contains a local Codex plugin that exposes one MCP server,
`apple-productivity`. It talks to the built-in Apple apps through local Swift
helpers and returns live data from the Mac it is running on.

<p align="center">
  <img src="plugins/apple-productivity/assets/apple-mail.png" alt="Apple Mail" width="82" />
  &nbsp;&nbsp;&nbsp;
  <img src="plugins/apple-productivity/assets/apple-reminders.png" alt="Apple Reminders" width="82" />
  &nbsp;&nbsp;&nbsp;
  <img src="plugins/apple-productivity/assets/apple-calendar.png" alt="Apple Calendar" width="82" />
</p>

<p align="center"><strong>Mail</strong> · <strong>Reminders</strong> · <strong>Calendar</strong></p>

## Features

- Search, read, draft, send, archive, delete-to-trash, junk, and move Apple Mail
  messages.
- List calendars, search/read/show events, and create/update/delete Calendar
  events.
- List reminder lists, search/read reminders, and create/update/complete/delete
  or move reminders.
- Shared write guard for mutating operations, with ask mode by default.
- Live, ephemeral reads. The plugin does not build or store a persistent local
  mail, calendar, or reminders index.

## Requirements

- macOS with Apple Mail, Calendar, and Reminders available.
- Node.js and npm.
- Xcode Command Line Tools, including `xcrun` and Swift.
- Local app permissions granted when macOS prompts for Apple Events, Calendar,
  or Reminders access.

## Quick Start

Clone and build the repository:

```bash
git clone <repo-url>
cd codex-apple-plugin
npm install
npm run build
```

Then point your MCP client at the built server:

```json
{
  "mcpServers": {
    "apple-productivity": {
      "command": "node",
      "args": [
        "/absolute/path/to/codex-apple-plugin/plugins/apple-productivity/dist/index.js"
      ],
      "env": {
        "APPLE_PRODUCTIVITY_WRITE_MODE": "ask",
        "APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS": "60000"
      }
    }
  }
}
```

The plugin package also includes
[`.mcp.json`](plugins/apple-productivity/.mcp.json) for local plugin loading
flows that run from `plugins/apple-productivity`.

## Safety Model

Writes are controlled by `APPLE_PRODUCTIVITY_WRITE_MODE`:

| Mode | Behavior |
| --- | --- |
| `ask` | Default. Mutating tools do not write unless the request includes `confirm: true`. Without confirmation they return a preview or target summary plus `allowed: false`. |
| `direct` | Mutating tools write locally without an extra confirmation flag. Use only in trusted local setups. |

In ask mode, the normal flow is: call the tool once without `confirm` to review
what would change, ask the user for approval, then call the same tool with
`confirm: true` to apply it. `confirm` is still accepted as a legacy alias for
`ask` in `APPLE_PRODUCTIVITY_WRITE_MODE`.

Every guarded write tool also accepts `dryRun: true`, which never writes even in
direct mode.

Important delete semantics:

- Mail delete means move to the account Trash or Deleted mailbox. It does not
  permanently expunge mail.
- Calendar delete removes the selected event or excludes a recurring
  occurrence.
- Reminder delete is a real Reminders deletion.

`mail_compose` is intentionally outside the write guard because it only opens a
visible compose window or creates a draft.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `APPLE_PRODUCTIVITY_WRITE_MODE` | `ask` | `ask` or `direct`. `confirm` is accepted as a legacy alias for `ask`. |
| `APPLE_PRODUCTIVITY_MAX_BODY_CHARS` | `12000` | Maximum body or notes characters returned by read-style tools. |
| `APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT` | `30` | Default Mail retrieval candidate count. |
| `APPLE_PRODUCTIVITY_CONTEXT_TOP_K` | `5` | Default Mail retrieval snippet count. |
| `APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS` | `60000` | Swift helper timeout in milliseconds. |
| `APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST` | unset | Optional default Reminders list name or identifier. |

If Apple data is slow to authorize or sync, increase
`APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS`.

## Tools

### Mail

Read and discovery:

- `mail_list_accounts`
- `mail_list_mailboxes`
- `mail_search`
- `mail_retrieve_context`
- `mail_read`

Actions:

- `mail_compose`
- `mail_send`
- `mail_move`
- `mail_undo_move`
- `mail_archive`
- `mail_delete`
- `mail_junk`

Notes:

- `mail_search` supports inbox, sent, archive, trash, junk, all, and exact
  mailbox scopes.
- For sent-mail questions, use `scope: "sent"` with `recipient`.
- Move/archive/delete/junk actions return stateless undo tokens. The plugin does
  not store a move history database.

### Calendar

Read and discovery:

- `calendar_list_calendars`
- `calendar_search_events`
- `calendar_read_event`
- `calendar_show_event`

Actions:

- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`

Notes:

- Create requests require `calendarId` or `calendarName`.
- Update and delete requests require `span: "this"` for one occurrence or
  `span: "all"` for the whole recurring series.
- Supported event fields include summary, start/end, all-day state, location,
  notes, URL, simple RRULE recurrence, status, and alarms.
- Attendee mutation is intentionally unsupported in v1.

### Reminders

Read and discovery:

- `reminders_list_lists`
- `reminders_search`
- `reminders_read`

Actions:

- `reminders_create`
- `reminders_update`
- `reminders_complete`
- `reminders_delete`
- `reminders_move`

Notes:

- Supported fields include title, notes/body, due date, reminder alarms,
  priority, URL, recurrence, completion state, and list movement.
- For nearest or upcoming reminders, search scheduled reminders with
  `scheduled: "scheduled"`, `scheduledSince` set to now, `sort: "scheduled"`,
  and a small `limit`. This matches either due dates or reminder alarms.
- Tags, subtasks, and attachments are not supported.

## Privacy

The server runs locally and reads from local Apple apps. It does not persist mail
bodies, calendar notes, reminder notes, or search indexes.

MCP clients can still display or log tool output. Keep read limits conservative
and avoid sharing generated logs when they may contain personal content.
