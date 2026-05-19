import { spawn } from "node:child_process";

export class NotesBridgeError extends Error {
  constructor(
    message: string,
    readonly stderr?: string
  ) {
    super(message);
    this.name = "NotesBridgeError";
  }
}

export interface NotesRuntime {
  run<T>(command: string, input?: unknown): Promise<T>;
}

export interface NotesBridgeOptions {
  timeoutMs: number;
}

export class NotesAppleScriptBridge implements NotesRuntime {
  constructor(private readonly options: NotesBridgeOptions) {}

  async run<T>(command: string, input: unknown = {}): Promise<T> {
    const stdout = await this.runScript({ command, input });
    const trimmed = stdout.trim();

    if (!trimmed) {
      return undefined as T;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch (error) {
      throw new NotesBridgeError(
        `Apple Notes bridge returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        trimmed.slice(0, 2000)
      );
    }
  }

  private runScript(payload: unknown): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("/usr/bin/osascript", ["-l", "JavaScript", "-e", NOTES_JXA_SOURCE], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        child.kill("SIGTERM");
        reject(
          new NotesBridgeError(
            `Apple Notes bridge timed out after ${this.options.timeoutMs}ms. Notes did not answer Apple Events; open Notes, finish any onboarding/unlock prompts, and allow Notes automation for Codex or the launching terminal.`
          )
        );
      }, this.options.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(new NotesBridgeError(`Failed to start Apple Notes bridge: ${error.message}`));
      });
      child.on("close", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);

        if (code === 0) {
          resolve(stdout);
          return;
        }

        reject(new NotesBridgeError(`Apple Notes bridge exited with code ${code}`, stderr.trim().slice(0, 2000)));
      });

      child.stdin.end(`${JSON.stringify(payload)}\n`);
    });
  }
}

const NOTES_JXA_SOURCE = String.raw`
ObjC.import("Foundation");

function readStdin() {
  const data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  const text = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding);
  return ObjC.unwrap(text) || "{}";
}

function getValue(callback, fallback) {
  try {
    const value = callback();
    return value === null || value === undefined ? fallback : value;
  } catch (_error) {
    return fallback;
  }
}

function asString(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

function asBool(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  return Boolean(value);
}

function asDate(value) {
  if (!value) {
    return undefined;
  }
  try {
    return new Date(value).toISOString();
  } catch (_error) {
    return undefined;
  }
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function compact(value) {
  const output = {};
  Object.keys(value).forEach((key) => {
    if (value[key] !== undefined) {
      output[key] = value[key];
    }
  });
  return output;
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainToHtml(value) {
  const lines = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0) {
    return "<div><br></div>";
  }
  return lines.map((line) => line ? "<div>" + htmlEscape(line) + "</div>" : "<div><br></div>").join("");
}

function truncate(value, limit) {
  const text = String(value || "");
  if (limit === 0) {
    return "";
  }
  if (!limit || text.length <= limit) {
    return text;
  }
  return text.slice(0, limit);
}

function splitPath(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return String(value).split("/").map((part) => part.trim()).filter(Boolean);
}

const payload = JSON.parse(readStdin());
const Notes = Application("Notes");
Notes.includeStandardAdditions = true;

function accounts() {
  return getValue(() => Notes.accounts(), []);
}

function accountInfo(account, includeCounts) {
  const folders = collectFolders(account, { includeCounts: Boolean(includeCounts) });
  return compact({
    id: asString(getValue(() => account.id(), undefined)),
    name: asString(getValue(() => account.name(), "")) || "",
    upgraded: asBool(getValue(() => account.upgraded(), undefined)),
    folderCount: folders.length,
    noteCount: folders.reduce((sum, folder) => sum + (folder.noteCount || 0), 0)
  });
}

function folderInfo(folder, account, path, includeCounts) {
  const childFolders = getValue(() => folder.folders(), []);
  const folderNotes = includeCounts ? getValue(() => folder.notes(), []) : [];
  const accountId = asString(getValue(() => account.id(), undefined));
  const accountName = asString(getValue(() => account.name(), undefined));
  const id = asString(getValue(() => folder.id(), ""));
  const name = asString(getValue(() => folder.name(), "")) || "";
  const folderPath = path && path.length ? path : [name].filter(Boolean);
  return compact({
    handle: compact({ id, accountId, accountName, path: folderPath }),
    id,
    name,
    accountId,
    accountName,
    path: folderPath,
    shared: asBool(getValue(() => folder.shared(), undefined)),
    folderCount: childFolders.length,
    noteCount: folderNotes.length
  });
}

function collectFolders(account, options) {
  const includeCounts = options && options.includeCounts !== undefined ? options.includeCounts : true;
  const maxDepth = options && options.maxDepth !== undefined ? options.maxDepth : 20;
  const result = [];
  function visit(folder, path, depth) {
    const name = asString(getValue(() => folder.name(), "")) || "";
    const nextPath = path.concat([name]).filter(Boolean);
    result.push(folderInfo(folder, account, nextPath, includeCounts));
    if (depth >= maxDepth) {
      return;
    }
    const children = getValue(() => folder.folders(), []);
    children.forEach((child) => visit(child, nextPath, depth + 1));
  }
  getValue(() => account.folders(), []).forEach((folder) => visit(folder, [], 0));
  return result;
}

function accountMatches(account, target) {
  if (!target) {
    return true;
  }
  const needle = lower(target);
  return lower(getValue(() => account.name(), "")).includes(needle) || lower(getValue(() => account.id(), "")) === needle;
}

function folderMatches(folderInfoValue, target) {
  if (!target) {
    return true;
  }
  const path = splitPath(target);
  const needle = lower(target);
  if (path.length > 1) {
    return lower(folderInfoValue.path.join("/")) === lower(path.join("/"));
  }
  return lower(folderInfoValue.name).includes(needle) || lower(folderInfoValue.id) === needle;
}

function resolveAccount(target) {
  const all = accounts();
  if (!target) {
    return getValue(() => Notes.defaultAccount(), all[0]);
  }
  const match = all.find((account) => accountMatches(account, target));
  if (!match) {
    throw new Error("Apple Notes account not found: " + target);
  }
  return match;
}

function resolveFolder(input) {
  const decoded = input.folderHandle || input.parentFolderHandle;
  const accountTarget = input.account || (decoded && (decoded.accountId || decoded.accountName));
  const allAccounts = accountTarget ? [resolveAccount(accountTarget)] : accounts();
  const folderTarget = decoded ? decoded.id : (input.folder || input.parentFolder);
  if (!folderTarget && !decoded) {
    const account = resolveAccount(accountTarget);
    return getValue(() => account.defaultFolder(), getValue(() => account.folders()[0], undefined));
  }
  for (let accountIndex = 0; accountIndex < allAccounts.length; accountIndex += 1) {
    const account = allAccounts[accountIndex];
    const infos = collectFolders(account, { includeCounts: false });
    for (let index = 0; index < infos.length; index += 1) {
      const info = infos[index];
      if (decoded && info.id === decoded.id) {
        return findFolderReference(account, info.id);
      }
      if (!decoded && folderMatches(info, folderTarget)) {
        return findFolderReference(account, info.id);
      }
    }
  }
  throw new Error("Apple Notes folder not found: " + (folderTarget || "default"));
}

function accountForFolderId(folderId) {
  const allAccounts = accounts();
  for (let index = 0; index < allAccounts.length; index += 1) {
    const account = allAccounts[index];
    const match = collectFolders(account, { includeCounts: false }).some((info) => info.id === folderId);
    if (match) {
      return account;
    }
  }
  return resolveAccount(undefined);
}

function findFolderReference(account, folderId) {
  let found;
  function visit(folder) {
    if (found) {
      return;
    }
    if (asString(getValue(() => folder.id(), "")) === folderId) {
      found = folder;
      return;
    }
    getValue(() => folder.folders(), []).forEach(visit);
  }
  getValue(() => account.folders(), []).forEach(visit);
  if (!found) {
    throw new Error("Apple Notes folder reference not found: " + folderId);
  }
  return found;
}

function noteInfo(note, folderInfoValue, options) {
  const maxSnippetChars = options && options.maxSnippetChars !== undefined ? options.maxSnippetChars : 0;
  const includeText = options && options.includeText;
  const id = asString(getValue(() => note.id(), ""));
  const title = asString(getValue(() => note.name(), "")) || "";
  const plaintext = includeText || maxSnippetChars > 0 ? asString(getValue(() => note.plaintext(), "")) || "" : "";
  const attachments = getValue(() => note.attachments(), []);
  const summary = compact({
    handle: compact({
      id,
      accountId: folderInfoValue.accountId,
      accountName: folderInfoValue.accountName,
      folderId: folderInfoValue.id,
      folderName: folderInfoValue.name,
      folderPath: folderInfoValue.path
    }),
    id,
    title,
    accountId: folderInfoValue.accountId,
    accountName: folderInfoValue.accountName,
    folderId: folderInfoValue.id,
    folderName: folderInfoValue.name,
    folderPath: folderInfoValue.path,
    createdAt: asDate(getValue(() => note.creationDate(), undefined)),
    modifiedAt: asDate(getValue(() => note.modificationDate(), undefined)),
    passwordProtected: asBool(getValue(() => note.passwordProtected(), undefined)),
    shared: asBool(getValue(() => note.shared(), undefined)),
    attachmentCount: attachments.length
  });
  if (maxSnippetChars > 0) {
    summary.snippet = truncate(plaintext, maxSnippetChars);
  }
  if (includeText) {
    summary.plaintext = plaintext;
  }
  return summary;
}

function findNoteReference(handle) {
  const allAccounts = handle.accountId || handle.accountName ? [resolveAccount(handle.accountId || handle.accountName)] : accounts();
  for (let accountIndex = 0; accountIndex < allAccounts.length; accountIndex += 1) {
    const account = allAccounts[accountIndex];
    const folderInfos = collectFolders(account, { includeCounts: false });
    for (let folderIndex = 0; folderIndex < folderInfos.length; folderIndex += 1) {
      const info = folderInfos[folderIndex];
      if (handle.folderId && info.id !== handle.folderId) {
        continue;
      }
      const folder = findFolderReference(account, info.id);
      const notes = getValue(() => folder.notes(), []);
      for (let noteIndex = 0; noteIndex < notes.length; noteIndex += 1) {
        const note = notes[noteIndex];
        if (asString(getValue(() => note.id(), "")) === handle.id) {
          return { note, folder, folderInfo: info };
        }
      }
    }
  }
  throw new Error("Apple Notes note not found: " + handle.id);
}

function bodyInputToHtml(input, existingTitle) {
  const body = input.body === null || input.body === undefined ? "" : String(input.body);
  if ((input.bodyFormat || "plain") === "html") {
    return body;
  }
  const title = input.title || existingTitle;
  if (!title) {
    return plainToHtml(body);
  }
  const content = body ? String(title) + "\n" + body : String(title);
  return plainToHtml(content);
}

function dateMatches(value, since, before) {
  if (!since && !before) {
    return true;
  }
  if (!value) {
    return false;
  }
  const time = new Date(value).getTime();
  if (since && time < new Date(since).getTime()) {
    return false;
  }
  if (before && time > new Date(before).getTime()) {
    return false;
  }
  return true;
}

function scoreNote(note, info, input) {
  const title = asString(getValue(() => note.name(), "")) || "";
  const plaintext = asString(getValue(() => note.plaintext(), "")) || "";
  const haystack = lower([title, plaintext, info.accountName, info.name, info.path.join("/")].join("\n"));
  const query = lower(input.query || "");
  let score = 0;
  if (query) {
    query.split(/\s+/).filter(Boolean).forEach((term) => {
      if (lower(title).includes(term)) {
        score += 10;
      }
      if (haystack.includes(term)) {
        score += 2;
      }
    });
  }
  if (input.title && lower(title).includes(lower(input.title))) {
    score += 15;
  }
  return score;
}

function noteMatches(note, info, input) {
  const title = asString(getValue(() => note.name(), "")) || "";
  if (input.title && !lower(title).includes(lower(input.title))) {
    return false;
  }
  if (input.folderHandle && info.id !== input.folderHandle.id) {
    return false;
  }
  if (input.folder && !folderMatches(info, input.folder)) {
    return false;
  }
  const protectedNote = Boolean(getValue(() => note.passwordProtected(), false));
  if (protectedNote && !input.includePasswordProtected) {
    return false;
  }
  const createdAt = asDate(getValue(() => note.creationDate(), undefined));
  const modifiedAt = asDate(getValue(() => note.modificationDate(), undefined));
  if (!dateMatches(createdAt, input.createdSince, input.createdBefore)) {
    return false;
  }
  if (!dateMatches(modifiedAt, input.modifiedSince, input.modifiedBefore)) {
    return false;
  }
  if (input.query) {
    const plaintext = asString(getValue(() => note.plaintext(), "")) || "";
    const attachments = getValue(() => note.attachments(), []);
    const attachmentNames = attachments.map((attachment) => asString(getValue(() => attachment.name(), "")) || "").join("\n");
    const haystack = lower([title, plaintext, info.accountName, info.name, info.path.join("/"), attachmentNames].join("\n"));
    return input.query.split(/\s+/).filter(Boolean).every((term) => haystack.includes(lower(term)));
  }
  return true;
}

function requestAccess() {
  const accountValues = accounts();
  let folderCount = 0;
  let noteCount = 0;
  accountValues.forEach((account) => {
    const folders = collectFolders(account, { includeCounts: true });
    folderCount += folders.length;
    noteCount += folders.reduce((sum, folder) => sum + (folder.noteCount || 0), 0);
  });
  return { accountCount: accountValues.length, folderCount, noteCount };
}

function listAccounts(input) {
  return accounts().map((account) => accountInfo(account, input.includeCounts !== false));
}

function listFolders(input) {
  const includeCounts = input.includeCounts !== false;
  const allAccounts = input.account ? [resolveAccount(input.account)] : accounts();
  const result = [];
  allAccounts.forEach((account) => {
    collectFolders(account, { includeCounts, maxDepth: input.maxDepth === undefined ? 20 : input.maxDepth }).forEach((info) => {
      if (input.parentFolderHandle && !info.path.slice(0, -1).includes(input.parentFolderHandle.path ? input.parentFolderHandle.path[input.parentFolderHandle.path.length - 1] : "")) {
        return;
      }
      if (input.parentFolder && !info.path.slice(0, -1).join("/").includes(input.parentFolder)) {
        return;
      }
      result.push(info);
    });
  });
  return result;
}

function search(input) {
  const limit = input.limit || 20;
  const maxScan = input.maxScan || 1000;
  const matches = [];
  let scanned = 0;
  const allAccounts = input.account ? [resolveAccount(input.account)] : accounts();
  allAccounts.forEach((account) => {
    if (scanned >= maxScan) {
      return;
    }
    collectFolders(account, { includeCounts: false }).forEach((info) => {
      if (scanned >= maxScan) {
        return;
      }
      if (input.folderHandle && info.id !== input.folderHandle.id) {
        return;
      }
      if (input.folder && !folderMatches(info, input.folder)) {
        return;
      }
      const folder = findFolderReference(account, info.id);
      getValue(() => folder.notes(), []).forEach((note) => {
        if (scanned >= maxScan) {
          return;
        }
        scanned += 1;
        if (noteMatches(note, info, input)) {
          const summary = noteInfo(note, info, { maxSnippetChars: input.maxSnippetChars || 0 });
          summary.score = scoreNote(note, info, input);
          matches.push(summary);
        }
      });
    });
  });
  matches.sort((a, b) => {
    if (input.sort === "modified") {
      return String(b.modifiedAt || "").localeCompare(String(a.modifiedAt || ""));
    }
    if (input.sort === "created") {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    }
    if (input.sort === "title") {
      return String(a.title || "").localeCompare(String(b.title || ""));
    }
    return (b.score || 0) - (a.score || 0) || String(b.modifiedAt || "").localeCompare(String(a.modifiedAt || ""));
  });
  return matches.slice(0, limit);
}

function read(input) {
  const maxBodyChars = input.maxBodyChars || 12000;
  const format = input.format || "text";
  return (input.handles || []).map((handle) => {
    const found = findNoteReference(handle);
    const summary = noteInfo(found.note, found.folderInfo, { maxSnippetChars: 0 });
    const text = asString(getValue(() => found.note.plaintext(), "")) || "";
    const html = asString(getValue(() => found.note.body(), "")) || "";
    const body = Object.assign({}, summary, {
      truncated: (format !== "html" && text.length > maxBodyChars) || (format !== "text" && html.length > maxBodyChars)
    });
    if (format === "text" || format === "both") {
      body.bodyText = truncate(text, maxBodyChars);
    }
    if (format === "html" || format === "both") {
      body.bodyHtml = truncate(html, maxBodyChars);
    }
    if (input.includeAttachments !== false) {
      body.attachments = getValue(() => found.note.attachments(), []).map((attachment) => compact({
        id: asString(getValue(() => attachment.id(), undefined)),
        name: asString(getValue(() => attachment.name(), undefined)),
        contentIdentifier: asString(getValue(() => attachment.contentIdentifier(), undefined)),
        url: asString(getValue(() => attachment.URL(), undefined)),
        createdAt: asDate(getValue(() => attachment.creationDate(), undefined)),
        modifiedAt: asDate(getValue(() => attachment.modificationDate(), undefined)),
        shared: asBool(getValue(() => attachment.shared(), undefined))
      }));
    }
    return body;
  });
}

function createFolder(input) {
  const parent = input.parentFolder || input.parentFolderHandle ? resolveFolder(input) : resolveAccount(input.account);
  const folder = Notes.Folder({ name: input.name });
  parent.folders.push(folder);
  const folderId = asString(getValue(() => folder.id(), ""));
  const account = accountForFolderId(folderId);
  const info = folderInfo(folder, account, [input.name], true);
  return { created: true, folder: info, folderId };
}

function renameFolder(input) {
  const folder = resolveFolder({ folderHandle: input.folderHandle });
  folder.name = input.name;
  return { renamed: true, folder: folderInfo(folder, resolveAccount(input.folderHandle.accountId || input.folderHandle.accountName), input.folderHandle.path || [input.name], true) };
}

function deleteFolder(input) {
  const folder = resolveFolder({ folderHandle: input.folderHandle });
  const target = folderInfo(folder, resolveAccount(input.folderHandle.accountId || input.folderHandle.accountName), input.folderHandle.path || [], true);
  Notes.delete(folder);
  return { deleted: true, folder: target };
}

function createNote(input) {
  const folder = resolveFolder(input);
  const note = Notes.Note({ name: input.title, body: bodyInputToHtml(input, input.title) });
  folder.notes.push(note);
  const folderRef = findNoteReference({ id: asString(getValue(() => note.id(), "")) }).folderInfo;
  return { created: true, note: noteInfo(note, folderRef, { maxSnippetChars: 0 }) };
}

function updateNote(input) {
  const found = findNoteReference(input.handle);
  if (input.title !== undefined) {
    found.note.name = input.title;
  }
  if (Object.prototype.hasOwnProperty.call(input, "body")) {
    found.note.body = bodyInputToHtml(input, input.title || asString(getValue(() => found.note.name(), "")));
  }
  let result = found;
  if (input.folder || input.folderHandle) {
    const moved = moveNotes({ handles: [input.handle], folder: input.folder, folderHandle: input.folderHandle, account: input.account });
    result = findNoteReference(moved.moved[0].handle);
  }
  return { updated: true, note: noteInfo(result.note, result.folderInfo, { maxSnippetChars: 0 }) };
}

function appendNote(input) {
  const found = findNoteReference(input.handle);
  const currentHtml = asString(getValue(() => found.note.body(), "")) || "";
  const separator = input.separator === undefined ? "\n" : String(input.separator);
  const separatorHtml = separator ? plainToHtml(separator) : "";
  const nextHtml = currentHtml + separatorHtml + bodyInputToHtml({ body: input.body, bodyFormat: input.bodyFormat }, undefined);
  found.note.body = nextHtml;
  return { appended: true, note: noteInfo(found.note, found.folderInfo, { maxSnippetChars: 0 }) };
}

function moveNotes(input) {
  const destination = resolveFolder(input);
  const moved = (input.handles || []).map((handle) => {
    const found = findNoteReference(handle);
    Notes.move(found.note, { to: destination });
    const after = findNoteReference({ id: handle.id, accountId: handle.accountId, accountName: handle.accountName });
    return noteInfo(after.note, after.folderInfo, { maxSnippetChars: 0 });
  });
  return { moved };
}

function deleteNotes(input) {
  const deleted = (input.handles || []).map((handle) => {
    const found = findNoteReference(handle);
    const summary = noteInfo(found.note, found.folderInfo, { maxSnippetChars: 0 });
    Notes.delete(found.note);
    return summary;
  });
  return { deleted: true, notes: deleted };
}

function showNote(input) {
  const found = findNoteReference(input.handle);
  Notes.show(found.note, { separately: Boolean(input.separately) });
  return { shown: true, note: noteInfo(found.note, found.folderInfo, { maxSnippetChars: 0 }) };
}

function dispatch(command, input) {
  switch (command) {
    case "requestAccess":
      return requestAccess();
    case "listAccounts":
      return listAccounts(input || {});
    case "listFolders":
      return listFolders(input || {});
    case "search":
      return search(input || {});
    case "read":
      return read(input || {});
    case "createFolder":
      return createFolder(input || {});
    case "renameFolder":
      return renameFolder(input || {});
    case "deleteFolder":
      return deleteFolder(input || {});
    case "create":
      return createNote(input || {});
    case "update":
      return updateNote(input || {});
    case "append":
      return appendNote(input || {});
    case "move":
      return moveNotes(input || {});
    case "delete":
      return deleteNotes(input || {});
    case "show":
      return showNote(input || {});
    default:
      throw new Error("Unknown Apple Notes command: " + command);
  }
}

JSON.stringify(dispatch(payload.command, payload.input || {}));
`;
