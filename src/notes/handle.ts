export interface RawNotesFolderHandle {
  id: string;
  accountId?: string;
  accountName?: string;
  path?: string[];
}

export interface RawNotesNoteHandle {
  id: string;
  accountId?: string;
  accountName?: string;
  folderId?: string;
  folderName?: string;
  folderPath?: string[];
}

export function encodeNotesFolderHandle(handle: RawNotesFolderHandle): string {
  return Buffer.from(JSON.stringify(handle), "utf8").toString("base64url");
}

export function decodeNotesFolderHandle(handle: string): RawNotesFolderHandle {
  const decoded = decodeHandle(handle);
  if (!decoded.id) {
    throw new Error("Invalid Apple Notes folder handle: missing id");
  }
  return {
    id: decoded.id,
    accountId: decoded.accountId,
    accountName: decoded.accountName,
    path: decoded.path
  };
}

export function encodeNotesNoteHandle(handle: RawNotesNoteHandle): string {
  return Buffer.from(JSON.stringify(handle), "utf8").toString("base64url");
}

export function decodeNotesNoteHandle(handle: string): RawNotesNoteHandle {
  const decoded = decodeHandle(handle);
  if (!decoded.id) {
    throw new Error("Invalid Apple Notes note handle: missing id");
  }
  return {
    id: decoded.id,
    accountId: decoded.accountId,
    accountName: decoded.accountName,
    folderId: decoded.folderId,
    folderName: decoded.folderName,
    folderPath: decoded.folderPath
  };
}

function decodeHandle(handle: string): Record<string, unknown> & {
  id?: string;
  accountId?: string;
  accountName?: string;
  path?: string[];
  folderId?: string;
  folderName?: string;
  folderPath?: string[];
} {
  try {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8"));
    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("handle is not an object");
    }
    return decoded as ReturnType<typeof decodeHandle>;
  } catch (error) {
    throw new Error(`Invalid Apple Notes handle: ${error instanceof Error ? error.message : String(error)}`);
  }
}
