# Apple Productivity Codex Plugin

Local Codex plugin for Apple Mail, Apple Calendar, and Apple Reminders.

The plugin exposes one MCP server, `apple-productivity`, with three local app
surfaces:

- Apple Mail through a Swift ScriptingBridge/Apple Events helper.
- Apple Calendar through a Swift/EventKit helper.
- Apple Reminders through a Swift/EventKit helper.

Reads are live and ephemeral. The plugin does not store persistent mail,
calendar, or reminders indexes.

## Tool Surface

### Mail

Read and discovery tools:

- `mail_list_accounts` lists configured Apple Mail accounts, addresses, and
  mailbox names.
- `mail_list_mailboxes` lists mailboxes with inferred roles such as inbox,
  sent, archive, trash, junk, and other.
- `mail_search` searches live message metadata and returns message handles.
- `mail_retrieve_context` searches candidate messages, reads bounded bodies in
  memory, and returns ranked snippets.
- `mail_read` reads selected messages by handle with body length limits.

Write and action tools:

- `mail_compose` creates a visible Apple Mail compose window or draft.
- `mail_send` sends when the write guard permits it; otherwise it drafts or
  returns a preview.
- `mail_move` moves messages to a role mailbox or exact mailbox name.
- `mail_undo_move` moves messages back using undo tokens returned by prior move
  actions.
- `mail_archive`, `mail_delete`, and `mail_junk` are role-specific move helpers.

Mail behavior:

- `mail_search` supports inbox, sent, archive, trash, junk, all, and exact
  mailbox scopes.
- Use `scope: "sent"` plus `recipient` for sent-mail questions.
- Delete means move to Trash or Deleted Items, not permanent expunge.
- Move, archive, delete, and junk actions return stateless undo tokens. No local
  move history database is stored.

### Calendar

Read and discovery tools:

- `calendar_list_calendars` lists EventKit-visible calendars and writable
  status.
- `calendar_search_events` searches live Calendar.app events by date window,
  calendar, and metadata.
- `calendar_read_event` reads one event by handle with bounded notes previews.
- `calendar_show_event` opens Calendar.app and shows the selected event.

Write and action tools:

- `calendar_create_event` creates an event when the write guard permits it;
  otherwise it returns a preview.
- `calendar_update_event` updates an event or recurring occurrence when the
  write guard permits it; otherwise it returns a preview.
- `calendar_delete_event` deletes an event or excludes a recurring occurrence
  when the write guard permits it.

Calendar behavior:

- Create requests require `calendarId` or `calendarName`.
- Update and delete requests require `span: "this"` for one occurrence or
  `span: "all"` for the whole recurring series.
- Supported event fields include summary, start/end, all-day state, location,
  notes, URL, simple RRULE recurrence, status, and alarms.
- Attendee mutation is intentionally unsupported in v1.

### Reminders

Read and discovery tools:

- `reminders_list_lists` lists Apple Reminders lists and bounded reminder counts.
- `reminders_search` searches live reminder metadata and returns reminder
  handles.
- `reminders_read` reads selected reminders by handle with body length limits.

Write and action tools:

- `reminders_create` creates a reminder when the write guard permits it;
  otherwise it returns a preview.
- `reminders_update` patches a reminder when the write guard permits it;
  otherwise it returns a preview.
- `reminders_complete` marks reminders complete or incomplete.
- `reminders_delete` deletes selected reminders.
- `reminders_move` moves reminders to another list.

Reminders behavior:

- Supported fields include title, notes/body, due date, reminder dates and
  alarms, priority, URL, recurrence, completion state, and list movement.
- `APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST` can select a default target list
  for reminder creation.
- Tags, subtasks, and attachments are intentionally unsupported until Apple
  exposes a stable local automation path for them.
- Reminder delete is a real reminder deletion, so it is guarded by the shared
  write mode.

## Safety

App-data writes for Mail, Calendar, and Reminders use the shared write mode:

- `APPLE_PRODUCTIVITY_WRITE_MODE=draft` is the safe default. Mail sends become
  drafts or previews where possible; Calendar and Reminders writes return
  previews.
- `APPLE_PRODUCTIVITY_WRITE_MODE=confirm` requires `confirm: true` before a
  mutating tool writes locally.
- `APPLE_PRODUCTIVITY_WRITE_MODE=direct` allows local writes without an extra
  confirmation flag.

Every guarded write tool accepts `dryRun: true`. `mail_compose` is intentionally
outside the write guard because it only opens or creates a draft. Keep `direct`
mode for trusted local setups only.

## Configuration

Environment variables:

- `APPLE_PRODUCTIVITY_WRITE_MODE`: `draft`, `confirm`, or `direct`. Defaults to
  `draft`.
- `APPLE_PRODUCTIVITY_MAX_BODY_CHARS`: maximum body or notes characters returned
  by read-style tools. Defaults to `12000`.
- `APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT`: default Mail retrieval
  candidate count. Defaults to `30`.
- `APPLE_PRODUCTIVITY_CONTEXT_TOP_K`: default Mail retrieval snippet count.
  Defaults to `5`.
- `APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS`: helper process timeout. Defaults to
  `60000`.
- `APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST`: optional default Reminders list
  name or identifier.

The first Calendar or Reminders action on a Mac may trigger macOS privacy
prompts. If local Apple data is slow to authorize or sync, increase
`APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS`.

## Development

Install dependencies:

```bash
npm install
```

Build TypeScript and Swift helpers:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

Run the full local check:

```bash
npm run check
```

Run smoke scripts against local Apple apps:

```bash
npm run smoke:mail
npm run smoke:calendar
```

`npm run build` compiles the Swift Package helper for Mail and Calendar and
also builds `plugins/apple-productivity/dist/reminders/reminders-helper` from
the Reminders Swift source.
