---
name: apple-notes
description: Use Apple Notes from Codex through the local Apple Notes MCP plugin. Trigger for Notes account/folder lookup, note search/read/show, note creation/editing/appending/moving/deleting, and guarded folder management.
---

# Apple Notes

Use this skill when a task should access local Apple Notes.

## Fast Routing

- First use, a new Mac, or permission failures: `notes_request_permissions`.
- Find a note: `notes_search`, then `notes_read` for selected handles.
- Browse structure: `notes_list_accounts` and `notes_list_folders`.
- Create or organize notes: preview with `dryRun: true`, then repeat with `confirm: true` only after the user clearly confirms.
- Open a note in the app: `notes_show`.

## First-run setup behavior

- If the user asks to set up the plugin, mentions a fresh clone/new Mac, or hits an access error, call `notes_request_permissions` before any Notes list/search/read/write tool.
- Treat permission output as an onboarding checklist: summarize the next step in plain language, ask the user to approve macOS prompts or System Settings toggles when needed, then retry only after they say it is done.
- Do not use real note bodies to test permissions. The setup tool is the privacy-light probe.

## Workflow

- Use `notes_search` for title/body/folder/account/date filters. Keep `limit` and `maxSnippetChars` conservative unless the user asks for broad context.
- Use `notes_read` only for selected note handles. Prefer `format: "text"`; request `format: "html"` or `"both"` only when editing rendered structure matters.
- Use folder handles from `notes_list_folders` when the destination folder is ambiguous.
- Mutating tools are guarded: `notes_create`, `notes_update`, `notes_append`, `notes_move`, `notes_delete`, `notes_create_folder`, `notes_rename_folder`, and `notes_delete_folder`.
- Folder deletion can affect all notes inside that folder; preview first.

## Examples

Search and read a note:

```text
notes_search({"query":"project plan","limit":5,"maxSnippetChars":500})
notes_read({"handles":["<handle-from-search>"],"format":"text","maxBodyChars":4000})
```

List folders and create a note in one:

```text
notes_list_folders({"includeCounts":true})
notes_create({"title":"Meeting notes","body":"Decisions and next steps","folderHandle":"<folder-handle>","dryRun":true})
notes_create({"title":"Meeting notes","body":"Decisions and next steps","folderHandle":"<folder-handle>","confirm":true})
```

Append to an existing note:

```text
notes_append({"handle":"<note-handle>","body":"Follow-up item","dryRun":true})
notes_append({"handle":"<note-handle>","body":"Follow-up item","confirm":true})
```

Move or delete notes:

```text
notes_move({"handles":["<note-handle>"],"folderHandle":"<destination-folder-handle>","dryRun":true})
notes_delete({"handles":["<note-handle>"],"dryRun":true})
```

## Access Mode

- `APPLE_NOTES_WRITE_MODE=ask` is the default. Mutating tools return previews unless the call includes `confirm: true`.
- `APPLE_NOTES_WRITE_MODE=direct` means full local Notes write access.
- Reads and writes require macOS Automation access to Notes for Codex or the launching terminal/app.

## Privacy

Do not paste large private note bodies unless the user explicitly asks. Prefer concise summaries, handles, titles, folders, and dates.
