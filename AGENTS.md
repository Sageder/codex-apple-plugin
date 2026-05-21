# Agent Instructions

- If you make changes in this repository, commit them before finishing the task.
- Do not print, log, or commit private mail bodies or personal message content.
- Keep mutating Apple app actions behind the configured write guard.
- Treat delete as moving mail to the account trash/deleted mailbox, not permanent deletion.

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

Request local Apple app permissions with metadata-only probes:

```bash
npm run permissions:request
```

Run smoke scripts against local Apple apps:

```bash
npm run smoke:mail
npm run smoke:calendar
npm run smoke:reminders
npm run smoke:messages
npm run smoke:notes
```

`npm run build` compiles the Swift package helper used by Mail and also builds
`plugins/apple-reminders/dist/reminders-helper` from the Reminders Swift source.
The Calendar helper is built from `src/calendar/calendarHelper.swift` into
`plugins/apple-calendar/dist/calendar-helper`.
The Messages plugin is TypeScript-only: it queries the local Messages database
read-only through `sqlite3` and sends through Messages.app AppleScript behind
the write guard.
The Notes plugin is TypeScript-only: it uses Notes.app Apple Events behind the
write guard.

## Repository Layout

```text
plugins/apple-mail/
  .codex-plugin/plugin.json      Apple Mail plugin metadata
  .mcp.json                      Apple Mail MCP server config
  assets/                        Apple Mail plugin icon
  skills/apple-mail/SKILL.md     Apple Mail skill instructions
  dist/                          Built Mail MCP server and Swift helper

plugins/apple-reminders/
  .codex-plugin/plugin.json      Apple Reminders plugin metadata
  .mcp.json                      Apple Reminders MCP server config
  assets/                        Apple Reminders plugin icon
  skills/apple-reminders/SKILL.md
  dist/                          Built Reminders MCP server and helper

plugins/apple-calendar/
  .codex-plugin/plugin.json      Apple Calendar plugin metadata
  .mcp.json                      Apple Calendar MCP server config
  assets/                        Apple Calendar plugin icon
  skills/apple-calendar/SKILL.md
  dist/                          Built Calendar MCP server and helper

plugins/apple-messages/
  .codex-plugin/plugin.json      Apple Messages plugin metadata
  .mcp.json                      Apple Messages MCP server config
  assets/                        Apple Messages plugin icon
  skills/apple-messages/SKILL.md
  dist/                          Built Messages MCP server

plugins/apple-notes/
  .codex-plugin/plugin.json      Apple Notes plugin metadata
  .mcp.json                      Apple Notes MCP server config
  assets/                        Apple Notes plugin icon
  skills/apple-notes/SKILL.md
  dist/                          Built Notes MCP server

src/                             Shared TypeScript MCP services, helper sources, and tests
scripts/                         Local permission and smoke scripts
swift/                           Swift package for the Mail helper
```
