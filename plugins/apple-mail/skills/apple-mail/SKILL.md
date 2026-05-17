---
name: apple-mail
description: Use Apple Mail from Codex through the local Apple Mail MCP plugin. Trigger for mailbox discovery, message search/read/context retrieval, newest email, drafting or sending mail, and mail archive/delete/move/junk workflows.
---

# Apple Mail

Use this skill when a task should access local Apple Mail.

## Fast routing

- First use, a new Mac, or permission failures: `mail_request_permissions`.
- Exact lookup or newest/latest email: `mail_search`, then `mail_read` only if the user needs body/details.
- Broad mail context such as "what matters about X": `mail_retrieve_context`.
- Writes: call the mutating tool with `dryRun: true` for a preview, then repeat with `confirm: true` only after the user clearly confirms.

## Workflow

- Prefer `mail_retrieve_context` for broad or fuzzy requests like "find what matters about X" or "use my email as context".
- Use `mail_search` when the user needs message candidates or handles. Use explicit scopes for `sent`, `archive`, `trash`, and `junk` when the request names those areas.
- For sent-mail questions like "what did I send to X", use `scope: "sent"` plus `recipient`.
- Use `subject` for exact known-subject lookups; broad `query` is for metadata terms.
- Use `mail_read` only for selected messages and keep body limits tight.
- Use `mail_compose` for drafts.
- Use `mail_send`, `mail_archive`, `mail_delete`, `mail_junk`, `mail_move`, and `mail_undo_move` only when the configured write guard allows it.
- Treat delete as moving messages to Trash/Deleted Items, not permanent deletion.
- Keep undo tokens returned by move/archive/delete/junk actions if the user may want to reverse the move.

## Examples

Newest email metadata, then a tight body read only if needed:

```text
mail_search({"scope":"inbox","limit":1})
mail_read({"handles":["<handle-from-search>"],"maxBodyChars":1200})
```

Find messages the user sent to someone:

```text
mail_search({"scope":"sent","recipient":"person@example.com","limit":10})
```

Retrieve broad context for a topic without dumping full threads:

```text
mail_retrieve_context({"scope":"all","query":"Princeton exchange","topK":5,"maxBodyChars":2000})
```

Create a visible draft:

```text
mail_compose({"to":["person@example.com"],"subject":"Follow up","body":"Hi ...","visible":true})
```

Preview, then send only after confirmation:

```text
mail_send({"to":["person@example.com"],"subject":"Follow up","body":"Hi ...","dryRun":true})
mail_send({"to":["person@example.com"],"subject":"Follow up","body":"Hi ...","confirm":true})
```

Guarded archive/delete/move pattern:

```text
mail_archive({"handles":["<handle>"],"dryRun":true})
mail_archive({"handles":["<handle>"],"confirm":true})
mail_undo_move({"undoTokens":["<undo-token>"],"confirm":true})
```

## Access mode

- `APPLE_MAIL_WRITE_MODE=ask` is the default. Mutating tools return a preview or target summary unless the call includes `confirm: true`.
- `APPLE_MAIL_WRITE_MODE=direct` means full local write access.

## Privacy

Do not paste large private email bodies unless the user explicitly asks. Prefer concise summaries and cite handles, subjects, senders, and dates.
