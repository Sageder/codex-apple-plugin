# Reference

Most users only need the main README. This page keeps the lower-level MCP,
configuration, and tool details in one place.

## Manual MCP Client Setup

Point the client at the desired bundled server:

```json
{
  "mcpServers": {
    "apple-mail": {
      "command": "node",
      "args": ["/absolute/path/to/codex-apple-plugin/plugins/apple-mail/dist/index.mjs"],
      "env": {
        "APPLE_MAIL_WRITE_MODE": "ask"
      }
    }
  }
}
```

The other servers are:

- `plugins/apple-reminders/dist/index.mjs`
- `plugins/apple-calendar/dist/index.mjs`
- `plugins/apple-messages/dist/index.mjs`
- `plugins/apple-notes/dist/index.mjs`

## Permission Model

Each plugin has a setup tool:

- `mail_request_permissions`
- `reminders_request_permissions`
- `calendar_request_permissions`
- `messages_request_permissions`
- `notes_request_permissions`

The setup flow first uses AppleScript for a minimal metadata probe. Mail and
Reminders then run native permission/access probes; Messages verifies read-only
database access; Notes verifies local Apple Events access; Calendar returns
explicit Full Access setup guidance instead of running a native EventKit probe.
This is intentionally a permission trigger and proof step, not an AppleScript
replacement backend.

The AppleScript probes only count accounts/mailboxes, reminder lists,
calendars, Messages services, or Notes accounts/folders. They do not read mail
bodies, event notes, reminder notes, Notes bodies, or message text.

Calendar and Reminders access are built as direct command-line helpers.
Calendar setup intentionally does not run a native EventKit probe. After the
AppleScript permission prompt is accepted, explicitly open System Settings >
Privacy & Security > Calendars and enable Full Access for Codex or the
`apple-calendar` helper entry shown by macOS before using Calendar tools.

Messages reads use `~/Library/Messages/chat.db` in read-only mode through
`sqlite3`. macOS protects that database, so grant Full Disk Access to Codex or
the terminal/app that launches the MCP server before using read tools.
macOS does not provide an API or first-run prompt for Full Disk Access. The
`messages_request_permissions` tool therefore detects missing access and
returns manual setup steps instead of silently failing: open System Settings >
Privacy & Security > Full Disk Access, enable Codex or the launching
terminal/app, restart that app, and retry the permission or smoke command.

Notes uses local Apple Events because Apple does not expose a Notes equivalent
to EventKit. Grant Automation access to Notes for Codex or the launching
terminal/app before using Notes tools.

## Safety Model

Writes are controlled per plugin:

| Plugin | Variable | Values |
| --- | --- | --- |
| Apple Mail | `APPLE_MAIL_WRITE_MODE` | `ask` or `direct` |
| Apple Reminders | `APPLE_REMINDERS_WRITE_MODE` | `ask` or `direct` |
| Apple Calendar | `APPLE_CALENDAR_WRITE_MODE` | `ask` or `direct` |
| Apple Messages | `APPLE_MESSAGES_WRITE_MODE` | `ask` or `direct` |
| Apple Notes | `APPLE_NOTES_WRITE_MODE` | `ask` or `direct` |

In ask mode, mutating tools do not write unless the request includes
`confirm: true`. Without confirmation they return a preview or target summary
plus `allowed: false`.

Every guarded write tool also accepts `dryRun: true`, which never writes even in
direct mode.

Important delete semantics:

- Mail delete means move to the account Trash or Deleted mailbox. It does not
  permanently expunge mail.
- Calendar delete removes the selected event or excludes a recurring
  occurrence.
- Reminder delete is a real Reminders deletion.
- Notes delete is a Notes deletion and can affect selected notes or folders.

`mail_compose` is intentionally outside the write guard because it only opens a
visible compose window or creates a draft.

`messages_send` is guarded. Messages read tools are read-only database queries.

Notes create/update/append/move/delete and folder mutations are guarded.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `APPLE_MAIL_WRITE_MODE` | `ask` | Mail write mode. |
| `APPLE_REMINDERS_WRITE_MODE` | `ask` | Reminders write mode. |
| `APPLE_CALENDAR_WRITE_MODE` | `ask` | Calendar write mode. |
| `APPLE_MESSAGES_WRITE_MODE` | `ask` | Messages send mode. |
| `APPLE_NOTES_WRITE_MODE` | `ask` | Notes write mode. |
| `APPLE_MAIL_MAX_BODY_CHARS` | `12000` | Maximum Mail body characters returned by read-style tools. |
| `APPLE_REMINDERS_MAX_BODY_CHARS` | `12000` | Maximum Reminders notes characters returned by read-style tools. |
| `APPLE_CALENDAR_MAX_BODY_CHARS` | `12000` | Maximum Calendar notes characters returned by read-style tools. |
| `APPLE_MESSAGES_MAX_BODY_CHARS` | `12000` | Maximum Messages text characters returned by read-style tools. |
| `APPLE_NOTES_MAX_BODY_CHARS` | `12000` | Maximum Notes body characters returned by read-style tools. |
| `APPLE_MAIL_RETRIEVAL_CANDIDATE_LIMIT` | `30` | Default Mail retrieval candidate count. |
| `APPLE_MAIL_CONTEXT_TOP_K` | `5` | Default Mail retrieval snippet count. |
| `APPLE_MAIL_HELPER_TIMEOUT_MS` | `60000` | Mail helper and AppleScript timeout in milliseconds. |
| `APPLE_REMINDERS_HELPER_TIMEOUT_MS` | `60000` | Reminders helper and AppleScript timeout in milliseconds. |
| `APPLE_CALENDAR_HELPER_TIMEOUT_MS` | `60000` | Calendar helper and AppleScript timeout in milliseconds. |
| `APPLE_MESSAGES_HELPER_TIMEOUT_MS` | `60000` | Messages sqlite and AppleScript timeout in milliseconds. |
| `APPLE_NOTES_HELPER_TIMEOUT_MS` | `60000` | Notes Apple Events bridge timeout in milliseconds. |
| `APPLE_MESSAGES_DB_PATH` | `~/Library/Messages/chat.db` | Optional Messages database path override. |
| `APPLE_REMINDERS_DEFAULT_LIST` | unset | Optional default Reminders list name or identifier. |

## Tools

### Mail

- `mail_request_permissions`
- `mail_list_accounts`
- `mail_list_mailboxes`
- `mail_search`
- `mail_retrieve_context`
- `mail_read`
- `mail_compose`
- `mail_send`
- `mail_move`
- `mail_undo_move`
- `mail_archive`
- `mail_delete`
- `mail_junk`

### Reminders

- `reminders_request_permissions`
- `reminders_list_lists`
- `reminders_search`
- `reminders_read`
- `reminders_create`
- `reminders_update`
- `reminders_complete`
- `reminders_delete`
- `reminders_move`

For nearest, next, or upcoming reminder requests, call `reminders_search` with
`completed: "incomplete"`, `scheduled: "scheduled"`, `scheduledSince` set to the
current local ISO datetime, `sort: "scheduled"`, and a small `limit`. Scheduled
and date-range searches scan the complete selected lists before applying
`limit`, because EventKit fetch order is not chronological; `maxScanPerList`
only caps relevance-style scans and should not be used to decide that no
upcoming reminder exists.

### Calendar

- `calendar_request_permissions`
- `calendar_list_calendars`
- `calendar_search_events`
- `calendar_read_event`
- `calendar_create_event`
- `calendar_update_event`
- `calendar_delete_event`
- `calendar_show_event`

### Messages

- `messages_request_permissions`
- `messages_list_chats`
- `messages_fetch_new`
- `messages_search`
- `messages_read`
- `messages_send`

### Notes

- `notes_request_permissions`
- `notes_list_accounts`
- `notes_list_folders`
- `notes_search`
- `notes_read`
- `notes_create_folder`
- `notes_rename_folder`
- `notes_delete_folder`
- `notes_create`
- `notes_update`
- `notes_append`
- `notes_move`
- `notes_delete`
- `notes_show`

## Development Scripts

```bash
npm install
npm run build
npm run test
npm run check
npm run permissions:request
```

Smoke scripts:

```bash
npm run smoke:mail
npm run smoke:calendar
npm run smoke:reminders
npm run smoke:messages
npm run smoke:notes
```
