# Apple Productivity Codex Plugin

Local Codex plugin for Apple Mail first, with the shared bridge ready for Apple
Calendar and Reminders next.

The plugin talks to macOS apps through a local Swift helper using
ScriptingBridge/Apple Events; it does not store a persistent mail index.
Retrieval is live and ephemeral.

## Mail tools

- `mail_list_accounts` and `mail_list_mailboxes`
- `mail_search` across inbox, sent, archive, trash, junk, all mail, or a named mailbox
- `mail_retrieve_context` for live RAG-style snippets
- `mail_read`, `mail_compose`, and guarded `mail_send`
- `mail_archive`, `mail_delete`, `mail_junk`, `mail_move`, and `mail_undo_move`

Move/delete/archive/junk actions return stateless undo tokens. No local move
history database is stored.

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
- `APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS` defaults to `60000`

The default write mode is `draft`. Delete means "move to Trash/Deleted Items",
not permanent deletion.
