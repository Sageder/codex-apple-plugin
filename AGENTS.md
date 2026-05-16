# Agent Instructions

- If you make changes in this repository, commit them before finishing the task.
- Do not print, log, or commit private mail bodies or personal message content.
- Keep irreversible Apple Mail actions behind the configured write guard.
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

Run smoke scripts against local Apple apps:

```bash
npm run smoke:mail
npm run smoke:calendar
npm run smoke:reminders
```

`npm run build` compiles the Swift package helper used by Mail and also builds
`plugins/apple-productivity/dist/reminders/reminders-helper` from the Reminders
Swift source. The Calendar helper is run through `xcrun swift`.

## Repository Layout

```text
plugins/apple-productivity/
  .codex-plugin/plugin.json      Plugin metadata
  .mcp.json                      Local MCP server config
  assets/                        Plugin icons
  helpers/calendar-tool.swift    Calendar EventKit helper
  scripts/                       Local smoke scripts
  skills/                        Codex skill instructions
  src/                           TypeScript MCP server and tests
  swift/                         Swift package for Mail helper
```
