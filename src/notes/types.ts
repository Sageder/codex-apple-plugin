import type { RawNotesFolderHandle, RawNotesNoteHandle } from "./handle.js";

export type NotesBodyFormat = "plain" | "html";
export type NotesReadFormat = "text" | "html" | "both";
export type NotesSortMode = "relevance" | "modified" | "created" | "title";

export interface NotesAccount {
  id: string;
  name: string;
  upgraded?: boolean;
  folderCount: number;
  noteCount: number;
}

export interface RawNotesFolder {
  handle: RawNotesFolderHandle;
  id: string;
  name: string;
  accountId?: string;
  accountName?: string;
  path: string[];
  shared?: boolean;
  folderCount: number;
  noteCount: number;
}

export interface NotesFolder extends Omit<RawNotesFolder, "handle"> {
  handle: string;
}

export interface NotesAttachmentSummary {
  id?: string;
  name?: string;
  contentIdentifier?: string;
  url?: string;
  createdAt?: string;
  modifiedAt?: string;
  shared?: boolean;
}

export interface RawNotesSummary {
  handle: RawNotesNoteHandle;
  id: string;
  title: string;
  accountId?: string;
  accountName?: string;
  folderId?: string;
  folderName?: string;
  folderPath?: string[];
  createdAt?: string;
  modifiedAt?: string;
  passwordProtected?: boolean;
  shared?: boolean;
  attachmentCount: number;
  snippet?: string;
  score?: number;
}

export interface NotesSummary extends Omit<RawNotesSummary, "handle"> {
  handle: string;
}

export interface RawNotesBody extends RawNotesSummary {
  bodyText?: string;
  bodyHtml?: string;
  truncated: boolean;
  attachments?: NotesAttachmentSummary[];
}

export interface NotesBody extends Omit<RawNotesBody, "handle"> {
  handle: string;
}

export interface NotesPermissionSummary {
  accountCount: number;
  folderCount: number;
  noteCount: number;
}
