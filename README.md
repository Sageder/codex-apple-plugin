# Apple Productivity Codex Plugin

Local Codex plugin for Apple Mail first, with the shared bridge ready for Apple
Calendar and Reminders next.

The plugin talks to macOS apps through JXA via `/usr/bin/osascript`; it does not
store a persistent mail index. Retrieval is live and ephemeral.

## Development

```bash
npm install
npm run build
npm run test
npm run smoke:mail
```

## Safety

Write behavior is controlled by:

- `APPLE_PRODUCTIVITY_WRITE_MODE=draft|confirm|direct`
- `APPLE_PRODUCTIVITY_MAX_BODY_CHARS`
- `APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT`
- `APPLE_PRODUCTIVITY_CONTEXT_TOP_K`
- `APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS`

The default write mode is `draft`. Delete means "move to Trash/Deleted Items",
not permanent deletion.

