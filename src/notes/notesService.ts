import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import {
  decodeNotesFolderHandle,
  decodeNotesNoteHandle,
  encodeNotesFolderHandle,
  encodeNotesNoteHandle,
  type RawNotesFolderHandle,
  type RawNotesNoteHandle
} from "./handle.js";
import type { NotesRuntime } from "./notesBridge.js";
import type {
  NotesAccount,
  NotesBody,
  NotesBodyFormat,
  NotesFolder,
  NotesPermissionSummary,
  NotesReadFormat,
  NotesSortMode,
  NotesSummary,
  RawNotesBody,
  RawNotesFolder,
  RawNotesSummary
} from "./types.js";

export interface NotesListAccountsArgs {
  includeCounts?: boolean;
}

export interface NotesListFoldersArgs {
  account?: string;
  parentFolder?: string;
  parentFolderHandle?: string;
  includeCounts?: boolean;
  maxDepth?: number;
}

export interface NotesSearchArgs {
  query?: string;
  title?: string;
  account?: string;
  folder?: string;
  folderHandle?: string;
  createdSince?: string;
  createdBefore?: string;
  modifiedSince?: string;
  modifiedBefore?: string;
  includePasswordProtected?: boolean;
  sort?: NotesSortMode;
  limit?: number;
  maxScan?: number;
  maxSnippetChars?: number;
}

export interface NotesReadArgs {
  handles: string[];
  format?: NotesReadFormat;
  includeAttachments?: boolean;
  maxBodyChars?: number;
}

export interface NotesCreateFolderArgs {
  name: string;
  account?: string;
  parentFolder?: string;
  parentFolderHandle?: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesRenameFolderArgs {
  folderHandle: string;
  name: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesDeleteFolderArgs {
  folderHandle: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesCreateArgs {
  title: string;
  body?: string;
  bodyFormat?: NotesBodyFormat;
  account?: string;
  folder?: string;
  folderHandle?: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesUpdateArgs {
  handle: string;
  title?: string;
  body?: string | null;
  bodyFormat?: NotesBodyFormat;
  account?: string;
  folder?: string;
  folderHandle?: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesAppendArgs {
  handle: string;
  body: string;
  bodyFormat?: NotesBodyFormat;
  separator?: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesWriteArgs {
  handles: string[];
  confirm?: boolean;
  dryRun?: boolean;
}

export interface NotesMoveArgs extends NotesWriteArgs {
  account?: string;
  folder?: string;
  folderHandle?: string;
}

export interface NotesShowArgs {
  handle: string;
  separately?: boolean;
}

export class NotesService {
  constructor(
    private readonly runtime: NotesRuntime,
    private readonly config: RuntimeConfig
  ) {}

  async requestAccess(): Promise<NotesPermissionSummary> {
    return this.runtime.run<NotesPermissionSummary>("requestAccess");
  }

  async listAccounts(args: NotesListAccountsArgs = {}): Promise<{ accounts: NotesAccount[] }> {
    const accounts = await this.runtime.run<NotesAccount[]>("listAccounts", args);
    return { accounts };
  }

  async listFolders(args: NotesListFoldersArgs = {}): Promise<{ folders: NotesFolder[] }> {
    const folders = await this.runtime.run<RawNotesFolder[]>("listFolders", this.decodeParentFolderTarget(args));
    return { folders: folders.map(encodeFolder) };
  }

  async search(args: NotesSearchArgs): Promise<{ notes: NotesSummary[] }> {
    const notes = await this.runtime.run<RawNotesSummary[]>("search", {
      ...this.decodeFolderTargets(args),
      limit: args.limit ?? 20,
      maxScan: args.maxScan ?? 1000,
      maxSnippetChars: args.maxSnippetChars ?? 500
    });
    return { notes: notes.map(encodeSummary) };
  }

  async read(args: NotesReadArgs): Promise<{ notes: NotesBody[] }> {
    const notes = await this.runtime.run<RawNotesBody[]>("read", {
      ...args,
      handles: args.handles.map(decodeNotesNoteHandle),
      maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
    });
    return { notes: notes.map(encodeBody) };
  }

  async createFolder(args: NotesCreateFolderArgs) {
    const decision = decideWrite(this.config, "notes.createFolder", args.confirm, args.dryRun);
    const input = this.decodeParentFolderTarget(args);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        created: false,
        preview: {
          name: args.name,
          account: args.account,
          parentFolder: args.parentFolder,
          parentFolderHandle: input.parentFolderHandle
        },
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ created: true; folder: RawNotesFolder }>("createFolder", stripWriteArgs(input));
    return { ...result, folder: encodeFolder(result.folder) };
  }

  async renameFolder(args: NotesRenameFolderArgs) {
    const decision = decideWrite(this.config, "notes.renameFolder", args.confirm, args.dryRun);
    const folderHandle = decodeNotesFolderHandle(args.folderHandle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        renamed: false,
        target: folderHandle,
        name: args.name,
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ renamed: true; folder: RawNotesFolder }>("renameFolder", {
      folderHandle,
      name: args.name
    });
    return { ...result, folder: encodeFolder(result.folder) };
  }

  async deleteFolder(args: NotesDeleteFolderArgs) {
    const decision = decideWrite(this.config, "notes.deleteFolder", args.confirm, args.dryRun);
    const folderHandle = decodeNotesFolderHandle(args.folderHandle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        deleted: false,
        target: folderHandle,
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ deleted: true; folder: RawNotesFolder }>("deleteFolder", { folderHandle });
    return { ...result, folder: encodeFolder(result.folder) };
  }

  async create(args: NotesCreateArgs) {
    const decision = decideWrite(this.config, "notes.create", args.confirm, args.dryRun);
    const input = this.decodeFolderTargets(args);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        created: false,
        preview: previewCreate(args, input.folderHandle),
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ created: true; note: RawNotesBody }>("create", stripWriteArgs(input));
    return { ...result, note: encodeBody(result.note) };
  }

  async update(args: NotesUpdateArgs) {
    const decision = decideWrite(this.config, "notes.update", args.confirm, args.dryRun);
    const handle = decodeNotesNoteHandle(args.handle);
    const input = {
      ...this.decodeFolderTargets(args),
      handle
    };
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        updated: false,
        target: handle,
        preview: previewUpdate(args, input.folderHandle),
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ updated: true; note: RawNotesBody }>("update", stripWriteArgs(input));
    return { ...result, note: encodeBody(result.note) };
  }

  async append(args: NotesAppendArgs) {
    const decision = decideWrite(this.config, "notes.append", args.confirm, args.dryRun);
    const handle = decodeNotesNoteHandle(args.handle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        appended: false,
        target: handle,
        bodyChars: args.body.length,
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ appended: true; note: RawNotesBody }>("append", {
      ...stripWriteArgs(args),
      handle
    });
    return { ...result, note: encodeBody(result.note) };
  }

  async move(args: NotesMoveArgs) {
    const decision = decideWrite(this.config, "notes.move", args.confirm, args.dryRun);
    const handles = args.handles.map(decodeNotesNoteHandle);
    const input = {
      ...this.decodeFolderTargets(args),
      handles
    };
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        moved: false,
        targets: handles,
        folder: args.folder,
        folderHandle: input.folderHandle,
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ moved: RawNotesBody[] }>("move", stripWriteArgs(input));
    return { moved: result.moved.map(encodeBody) };
  }

  async delete(args: NotesWriteArgs) {
    const decision = decideWrite(this.config, "notes.delete", args.confirm, args.dryRun);
    const handles = args.handles.map(decodeNotesNoteHandle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        deleted: false,
        targets: handles,
        reason: decision.reason
      };
    }

    const result = await this.runtime.run<{ deleted: true; notes: RawNotesBody[] }>("delete", { handles });
    return { ...result, notes: result.notes.map(encodeBody) };
  }

  async show(args: NotesShowArgs) {
    const result = await this.runtime.run<{ shown: true; note: RawNotesBody }>("show", {
      handle: decodeNotesNoteHandle(args.handle),
      separately: args.separately ?? false
    });
    return { ...result, note: encodeBody(result.note) };
  }

  private decodeFolderTargets<T extends { folderHandle?: string }>(args: T): Omit<T, "folderHandle"> & {
    folderHandle?: RawNotesFolderHandle;
  } {
    const { folderHandle, ...rest } = args;
    return {
      ...rest,
      folderHandle: folderHandle ? decodeNotesFolderHandle(folderHandle) : undefined
    };
  }

  private decodeParentFolderTarget<T extends { parentFolderHandle?: string }>(args: T): Omit<T, "parentFolderHandle"> & {
    parentFolderHandle?: RawNotesFolderHandle;
  } {
    const { parentFolderHandle, ...rest } = args;
    return {
      ...rest,
      parentFolderHandle: parentFolderHandle ? decodeNotesFolderHandle(parentFolderHandle) : undefined
    };
  }
}

function encodeFolder(raw: RawNotesFolder): NotesFolder {
  return {
    ...raw,
    handle: encodeNotesFolderHandle(raw.handle)
  };
}

function encodeSummary(raw: RawNotesSummary): NotesSummary {
  return {
    ...raw,
    handle: encodeNotesNoteHandle(raw.handle)
  };
}

function encodeBody(raw: RawNotesBody): NotesBody {
  return {
    ...raw,
    handle: encodeNotesNoteHandle(raw.handle)
  };
}

function stripWriteArgs<T extends { confirm?: boolean; dryRun?: boolean }>(args: T): Omit<T, "confirm" | "dryRun"> {
  const { confirm: _confirm, dryRun: _dryRun, ...input } = args;
  return input;
}

function previewCreate(args: NotesCreateArgs, folderHandle?: RawNotesFolderHandle) {
  return {
    title: args.title,
    bodyChars: args.body?.length ?? 0,
    bodyFormat: args.bodyFormat ?? "plain",
    account: args.account,
    folder: args.folder,
    folderHandle
  };
}

function previewUpdate(args: NotesUpdateArgs, folderHandle?: RawNotesFolderHandle) {
  return {
    title: args.title,
    body: Object.hasOwn(args, "body")
      ? {
          bodyChars: args.body?.length ?? 0,
          cleared: args.body === null
        }
      : undefined,
    bodyFormat: args.bodyFormat ?? "plain",
    account: args.account,
    folder: args.folder,
    folderHandle
  };
}
