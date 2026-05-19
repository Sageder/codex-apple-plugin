import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse, jsonResponse } from "../toolResponse.js";
import type { NotesService } from "./notesService.js";
import {
  notesAppendSchema,
  notesCreateFolderSchema,
  notesCreateSchema,
  notesDeleteFolderSchema,
  notesListAccountsSchema,
  notesListFoldersSchema,
  notesMoveSchema,
  notesReadSchema,
  notesRenameFolderSchema,
  notesSearchSchema,
  notesShowSchema,
  notesUpdateSchema,
  notesWriteSchema
} from "./schemas.js";

export function registerNotesTools(server: McpServer, notes: NotesService): void {
  server.registerTool(
    "notes_list_accounts",
    {
      title: "List Apple Notes accounts",
      description: "List Apple Notes accounts configured on this Mac, with optional folder and note counts.",
      inputSchema: notesListAccountsSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => notes.listAccounts(args))
  );

  server.registerTool(
    "notes_list_folders",
    {
      title: "List Apple Notes folders",
      description: "List Apple Notes folders and return folder handles for targeted reads, creates, moves, and folder actions.",
      inputSchema: notesListFoldersSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => notes.listFolders(args))
  );

  server.registerTool(
    "notes_search",
    {
      title: "Search Apple Notes",
      description: "Search live Apple Notes titles, plaintext note bodies, folders, accounts, and attachment names. Returns note handles for follow-up reads or actions.",
      inputSchema: notesSearchSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => notes.search(args))
  );

  server.registerTool(
    "notes_read",
    {
      title: "Read Apple Notes",
      description: "Read selected Apple Notes by handle with body length limits and optional attachment metadata.",
      inputSchema: notesReadSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => notes.read(args))
  );

  server.registerTool(
    "notes_create_folder",
    {
      title: "Create Apple Notes folder",
      description: "Create an Apple Notes folder when the write guard permits it; otherwise return a preview.",
      inputSchema: notesCreateFolderSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => notes.createFolder(args))
  );

  server.registerTool(
    "notes_rename_folder",
    {
      title: "Rename Apple Notes folder",
      description: "Rename an Apple Notes folder when the write guard permits it; otherwise return a preview.",
      inputSchema: notesRenameFolderSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => notes.renameFolder(args))
  );

  server.registerTool(
    "notes_delete_folder",
    {
      title: "Delete Apple Notes folder",
      description: "Delete an Apple Notes folder when the write guard permits it. Use with care because this affects all notes in the folder.",
      inputSchema: notesDeleteFolderSchema,
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    async (args) => safe(() => notes.deleteFolder(args))
  );

  server.registerTool(
    "notes_create",
    {
      title: "Create Apple Note",
      description: "Create an Apple Note when the write guard permits it; otherwise return a preview.",
      inputSchema: notesCreateSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => notes.create(args))
  );

  server.registerTool(
    "notes_update",
    {
      title: "Update Apple Note",
      description: "Patch an Apple Note title/body/folder when the write guard permits it; otherwise return a preview.",
      inputSchema: notesUpdateSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => notes.update(args))
  );

  server.registerTool(
    "notes_append",
    {
      title: "Append to Apple Note",
      description: "Append text or HTML to an Apple Note when the write guard permits it; otherwise return a metadata-only preview.",
      inputSchema: notesAppendSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => notes.append(args))
  );

  server.registerTool(
    "notes_move",
    {
      title: "Move Apple Notes",
      description: "Move selected Apple Notes to another folder when the write guard permits it.",
      inputSchema: notesMoveSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => notes.move(args))
  );

  server.registerTool(
    "notes_delete",
    {
      title: "Delete Apple Notes",
      description: "Delete selected Apple Notes when the write guard permits it.",
      inputSchema: notesWriteSchema,
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    async (args) => safe(() => notes.delete(args))
  );

  server.registerTool(
    "notes_show",
    {
      title: "Show Apple Note",
      description: "Open a selected Apple Note in Notes.app.",
      inputSchema: notesShowSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async (args) => safe(() => notes.show(args))
  );
}

async function safe<T>(callback: () => Promise<T>): Promise<ReturnType<typeof jsonResponse>> {
  try {
    return jsonResponse(await callback());
  } catch (error) {
    return errorResponse(error) as ReturnType<typeof jsonResponse>;
  }
}
