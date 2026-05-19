---
name: apple-messages
description: Use Apple Messages from Codex through the local Apple Messages MCP plugin. Trigger for Messages chat lookup, fetching new or unread messages, reading/searching local iMessage/SMS history, and sending Messages with write-guard confirmation.
---

# Apple Messages

Use this skill when a task should access local Apple Messages.

## Fast routing

- First use, a new Mac, or permission failures: `messages_request_permissions`.
- New/latest messages: `messages_fetch_new`, with `maxTextChars: 0` for metadata-only checks.
- Broad lookup: `messages_search`, then `messages_read` for selected handles or a chat handle.
- Writes: call `messages_send` with `dryRun: true` for a preview, then repeat with `confirm: true` only after the user clearly confirms.

## Workflow

- Use `messages_list_chats` when the user names a conversation but not a specific message.
- Use `messages_fetch_new` for "new", "unread", or "latest incoming" message requests. It defaults to unread incoming messages.
- Use `messages_search` for text, participant, service, date-window, and direction filters.
- Use `messages_read` only for selected message handles or one chat handle, and keep `maxTextChars` tight.
- Use `messages_send` only when the configured write guard allows it.
- Direct sending supports a phone number or Apple ID email address. Group-chat sends are not supported in v1.

## Examples

Fetch unread incoming messages with short text:

```text
messages_fetch_new({"limit":10,"maxTextChars":800})
```

Metadata-only newest incoming check:

```text
messages_fetch_new({"unreadOnly":false,"includeSent":false,"limit":3,"maxTextChars":0})
```

Find and read a chat:

```text
messages_list_chats({"participant":"person@example.com","limit":5})
messages_read({"chatHandle":"<handle-from-list>","limit":10,"maxTextChars":1200})
```

Search messages from a date window:

```text
messages_search({"query":"dinner","since":"2026-05-01T00:00:00Z","limit":10,"maxTextChars":500})
```

Preview, then send only after confirmation:

```text
messages_send({"recipient":"+41790000000","text":"On my way.","dryRun":true})
messages_send({"recipient":"+41790000000","text":"On my way.","confirm":true})
```

## Access Mode

- `APPLE_MESSAGES_WRITE_MODE=ask` is the default. `messages_send` returns a metadata-only preview unless the call includes `confirm: true`.
- `APPLE_MESSAGES_WRITE_MODE=direct` means full local send access.
- Reads require Full Disk Access for Codex or the terminal/app that launches the MCP server, because macOS protects `~/Library/Messages/chat.db`.

## Privacy

Do not paste large private message text unless the user explicitly asks. Prefer concise summaries and cite handles, participants, and dates.
