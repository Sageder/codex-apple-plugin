# Apple Apps MCP Plugins for Codex

Use Apple Mail, Apple Reminders, Apple Calendar, Apple Messages, and Apple
Notes from local Codex plugins on macOS.

<p align="center">
  <img src="plugins/apple-mail/assets/apple-mail.png" alt="Apple Mail" width="82" />
  &nbsp;&nbsp;&nbsp;
  <img src="plugins/apple-reminders/assets/apple-reminders.png" alt="Apple Reminders" width="82" />
  &nbsp;&nbsp;&nbsp;
  <img src="plugins/apple-calendar/assets/apple-calendar.png" alt="Apple Calendar" width="82" />
  &nbsp;&nbsp;&nbsp;
  <img src="plugins/apple-messages/assets/apple-messages.png" alt="Apple Messages" width="82" />
  &nbsp;&nbsp;&nbsp;
  <img src="plugins/apple-notes/assets/apple-notes.png" alt="Apple Notes" width="82" />
</p>

<p align="center"><strong>Mail</strong> · <strong>Reminders</strong> · <strong>Calendar</strong> · <strong>Messages</strong> · <strong>Notes</strong></p>

## Features

- Search, read, draft, send, archive, delete-to-trash, junk, and move Apple Mail
  messages.
- List reminder lists, search/read reminders, and create/update/complete/delete
  or move reminders.
- List calendars, search/read/show events, and create/update/delete Calendar
  events.
- List Messages chats, fetch new/unread messages, search/read local iMessage
  and SMS history, and send Messages.
- List Notes accounts/folders, search/read/show notes, inspect attachment
  metadata, and create/update/append/move/delete notes and folders.
- Per-plugin write guard for mutating operations, with ask mode by default.
- Live, ephemeral reads. The plugins do not build or store persistent local
  mail, calendar, reminders, messages, or notes indexes.

## Requirements

- macOS with Apple Mail, Calendar, Reminders, Messages, and Notes available.
- Node.js and npm.
- Xcode Command Line Tools, including `xcrun`, Swift, and `codesign`.
- Local app permissions granted when macOS prompts for Apple Events, Calendar,
  Reminders, Messages, Notes, or Full Disk Access.

## Quick Start

For a fresh clone on a new Mac, run the first-run setup:

```bash
git clone <repo-url>
cd codex-apple-plugin
npm run setup
```

`npm run setup` installs npm dependencies, builds the bundled MCP servers and
native helpers, and runs the first permission pass. Approve any macOS prompts
that appear.

This can be close to one command, but it cannot be truly one-click for every
permission: macOS does not let a script grant protected Apple app, Calendar, or
Full Disk Access permissions automatically. When a manual toggle is required,
the setup command prints the exact System Settings pane and a retry command.

To rerun only the permission pass after changing System Settings:

```bash
npm run permissions:request
```

`npm run permissions:request` rebuilds the plugins, runs metadata-only
AppleScript probes to trigger OS permission prompts, verifies native access for
Mail, Reminders, Messages, and Notes, and returns explicit Full Access guidance
for Calendar. It prints counts/status only, not mail bodies, calendar notes,
reminder notes, Notes bodies, or message text.

For manual MCP client setup, point the client at the desired bundled server:

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

To add this repository as a Codex plugin marketplace, use:

- Source: `https://github.com/Sageder/codex-apple-plugin.git`
- Git ref: `main`
- Sparse paths: leave empty, or use `.agents/plugins/marketplace.json`,
  `plugins/apple-mail`, `plugins/apple-reminders`, and
  `plugins/apple-calendar`, `plugins/apple-messages`, and `plugins/apple-notes`

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

The AppleScript probes only count accounts/mailboxes, reminder lists, or
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
`messages_request_permissions` tool therefore detects missing access and returns
manual setup steps instead of silently failing: open System Settings > Privacy &
Security > Full Disk Access, enable Codex or the launching terminal/app, restart
that app, and retry the permission or smoke command.

Notes uses local Apple Events because Apple does not expose a Notes equivalent
to EventKit. Grant Automation access to Notes for Codex or the launching
terminal/app before using Notes tools.
