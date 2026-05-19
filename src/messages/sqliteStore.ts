import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { MessageDirection, MessagesChatHandlePayload, RawMessagesChatSummary, RawMessagesMessageSummary } from "./types.js";

export class MessagesDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagesDatabaseError";
  }
}

export interface MessagesListChatsStoreArgs {
  query?: string;
  participant?: string;
  service?: string;
  limit?: number;
}

export interface MessagesQueryStoreArgs {
  query?: string;
  participant?: string;
  chatHandle?: MessagesChatHandlePayload;
  service?: string;
  direction?: MessageDirection;
  unreadOnly?: boolean;
  includeSent?: boolean;
  since?: string;
  before?: string;
  limit?: number;
  maxTextChars?: number;
}

export interface MessagesReadStoreArgs {
  handles?: Array<{ messageId: number; guid: string; chatId?: number }>;
  chatHandle?: MessagesChatHandlePayload;
  since?: string;
  before?: string;
  direction?: MessageDirection;
  limit?: number;
  maxTextChars?: number;
}

interface SqliteChatRow {
  chatId: number;
  guid: string | null;
  chatIdentifier: string | null;
  displayName: string | null;
  serviceName: string | null;
  participants: string | null;
  participantCount: number | null;
  messageCount: number | null;
  unreadCount: number | null;
  lastDateRaw: number | null;
}

interface SqliteMessageRow {
  messageId: number;
  guid: string | null;
  chatId: number | null;
  chatGuid: string | null;
  chatIdentifier: string | null;
  displayName: string | null;
  service: string | null;
  sender: string | null;
  isFromMe: number | null;
  dateRaw: number | null;
  text: string | null;
  textChars: number | null;
  hasAttachments: number | null;
  attachmentCount: number | null;
}

export class SqliteMessagesStore {
  constructor(
    private readonly options: {
      dbPath?: string;
      timeoutMs: number;
    }
  ) {}

  async requestAccess(): Promise<{ chatCount: number; messageCount: number }> {
    const rows = await this.queryJson<Array<{ chatCount: number; messageCount: number }>>(
      "SELECT (SELECT count(*) FROM chat) AS chatCount, (SELECT count(*) FROM message) AS messageCount"
    );
    const first = rows[0] ?? { chatCount: 0, messageCount: 0 };
    return {
      chatCount: Number(first.chatCount) || 0,
      messageCount: Number(first.messageCount) || 0
    };
  }

  async listChats(args: MessagesListChatsStoreArgs): Promise<RawMessagesChatSummary[]> {
    const where = chatWhere(args);
    const limit = clampLimit(args.limit, 20);
    const rows = await this.queryJson<SqliteChatRow[]>([
      "SELECT",
      "  c.ROWID AS chatId,",
      "  c.guid AS guid,",
      "  c.chat_identifier AS chatIdentifier,",
      "  c.display_name AS displayName,",
      "  c.service_name AS serviceName,",
      "  (SELECT group_concat(h.id, ', ') FROM handle h JOIN chat_handle_join chj ON chj.handle_id = h.ROWID WHERE chj.chat_id = c.ROWID) AS participants,",
      "  (SELECT count(*) FROM chat_handle_join chj WHERE chj.chat_id = c.ROWID) AS participantCount,",
      "  (SELECT count(*) FROM chat_message_join cmj WHERE cmj.chat_id = c.ROWID) AS messageCount,",
      "  (SELECT count(*) FROM message m JOIN chat_message_join cmj ON cmj.message_id = m.ROWID WHERE cmj.chat_id = c.ROWID AND m.is_from_me = 0 AND coalesce(m.is_read, 0) = 0) AS unreadCount,",
      "  (SELECT max(m.date) FROM message m JOIN chat_message_join cmj ON cmj.message_id = m.ROWID WHERE cmj.chat_id = c.ROWID) AS lastDateRaw",
      "FROM chat c",
      where,
      "ORDER BY lastDateRaw DESC",
      `LIMIT ${limit}`
    ].join("\n"));

    return rows.map(chatRow);
  }

  async fetchNew(args: MessagesQueryStoreArgs): Promise<RawMessagesMessageSummary[]> {
    return this.messages({
      ...args,
      direction: args.includeSent ? "all" : "incoming",
      unreadOnly: args.unreadOnly ?? !args.includeSent
    });
  }

  async search(args: MessagesQueryStoreArgs): Promise<RawMessagesMessageSummary[]> {
    return this.messages(args);
  }

  async read(args: MessagesReadStoreArgs): Promise<RawMessagesMessageSummary[]> {
    return this.messages(args);
  }

  private async messages(args: MessagesQueryStoreArgs | MessagesReadStoreArgs): Promise<RawMessagesMessageSummary[]> {
    const maxTextChars = Math.max(0, args.maxTextChars ?? 12000);
    const rows = await this.queryJson<SqliteMessageRow[]>([
      "SELECT",
      "  m.ROWID AS messageId,",
      "  m.guid AS guid,",
      "  c.ROWID AS chatId,",
      "  c.guid AS chatGuid,",
      "  c.chat_identifier AS chatIdentifier,",
      "  c.display_name AS displayName,",
      "  coalesce(m.service, c.service_name) AS service,",
      "  h.id AS sender,",
      "  m.is_from_me AS isFromMe,",
      "  m.date AS dateRaw,",
      textSelect(maxTextChars),
      "  length(coalesce(m.text, '')) AS textChars,",
      "  coalesce(m.cache_has_attachments, 0) AS hasAttachments,",
      "  (SELECT count(*) FROM message_attachment_join maj WHERE maj.message_id = m.ROWID) AS attachmentCount",
      "FROM message m",
      "LEFT JOIN handle h ON h.ROWID = m.handle_id",
      "LEFT JOIN chat_message_join cmj ON cmj.message_id = m.ROWID",
      "LEFT JOIN chat c ON c.ROWID = cmj.chat_id",
      messageWhere(args),
      "ORDER BY m.date DESC",
      `LIMIT ${clampLimit(args.limit, 25)}`
    ].join("\n"));

    return rows.map((row) => messageRow(row, maxTextChars));
  }

  private queryJson<T>(sql: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const child = spawn("sqlite3", ["-readonly", "-json", this.dbPath(), sql], {
        stdio: ["ignore", "pipe", "pipe"]
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
        reject(new MessagesDatabaseError(`Apple Messages database query timed out after ${this.options.timeoutMs}ms`));
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
        reject(new MessagesDatabaseError(`Failed to start sqlite3 for Apple Messages: ${error.message}`));
      });
      child.on("close", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);

        if (code !== 0) {
          reject(new MessagesDatabaseError(databaseFailureMessage(stderr)));
          return;
        }

        try {
          const trimmed = stdout.trim();
          resolve((trimmed ? JSON.parse(trimmed) : []) as T);
        } catch (error) {
          reject(
            new MessagesDatabaseError(
              `Apple Messages database returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      });
    });
  }

  private dbPath(): string {
    return this.options.dbPath?.trim() || join(homedir(), "Library", "Messages", "chat.db");
  }
}

function chatWhere(args: MessagesListChatsStoreArgs): string {
  const clauses: string[] = [];
  if (args.service) {
    clauses.push(`c.service_name = ${sqlString(args.service)}`);
  }
  if (args.participant) {
    clauses.push(chatParticipantPredicate(args.participant));
  }
  if (args.query) {
    const like = likeString(args.query);
    clauses.push(
      [
        "(",
        `lower(coalesce(c.display_name, '')) LIKE ${like} ESCAPE '\\'`,
        `OR lower(coalesce(c.chat_identifier, '')) LIKE ${like} ESCAPE '\\'`,
        `OR EXISTS (SELECT 1 FROM handle h JOIN chat_handle_join chj ON chj.handle_id = h.ROWID WHERE chj.chat_id = c.ROWID AND lower(coalesce(h.id, '')) LIKE ${like} ESCAPE '\\')`,
        ")"
      ].join(" ")
    );
  }

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function messageWhere(args: MessagesQueryStoreArgs | MessagesReadStoreArgs): string {
  const clauses = ["m.date IS NOT NULL"];
  const queryArgs = args as MessagesQueryStoreArgs;
  if (queryArgs.query) {
    const like = likeString(queryArgs.query);
    clauses.push(
      [
        "(",
        `lower(coalesce(m.text, '')) LIKE ${like} ESCAPE '\\'`,
        `OR lower(coalesce(c.display_name, '')) LIKE ${like} ESCAPE '\\'`,
        `OR lower(coalesce(c.chat_identifier, '')) LIKE ${like} ESCAPE '\\'`,
        `OR lower(coalesce(h.id, '')) LIKE ${like} ESCAPE '\\'`,
        ")"
      ].join(" ")
    );
  }
  if (queryArgs.participant) {
    clauses.push(
      [
        "(",
        `lower(coalesce(h.id, '')) LIKE ${likeString(queryArgs.participant)} ESCAPE '\\'`,
        "OR",
        chatParticipantPredicate(queryArgs.participant),
        ")"
      ].join(" ")
    );
  }
  if (queryArgs.service) {
    clauses.push(`coalesce(m.service, c.service_name) = ${sqlString(queryArgs.service)}`);
  }
  if (queryArgs.unreadOnly) {
    clauses.push("m.is_from_me = 0");
    clauses.push("coalesce(m.is_read, 0) = 0");
  }
  if (args.direction === "incoming") {
    clauses.push("m.is_from_me = 0");
  }
  if (args.direction === "outgoing") {
    clauses.push("m.is_from_me = 1");
  }
  if (args.since) {
    clauses.push(`${messageUnixSeconds()} >= ${unixSeconds(args.since)}`);
  }
  if (args.before) {
    clauses.push(`${messageUnixSeconds()} < ${unixSeconds(args.before)}`);
  }
  if (args.chatHandle) {
    clauses.push(`c.ROWID = ${args.chatHandle.chatId}`);
    clauses.push(`c.guid = ${sqlString(args.chatHandle.guid)}`);
  }
  if ("handles" in args && args.handles?.length) {
    clauses.push(`m.ROWID IN (${args.handles.map((handle) => handle.messageId).join(", ")})`);
  }

  return `WHERE ${clauses.join(" AND ")}`;
}

function chatParticipantPredicate(value: string): string {
  const like = likeString(value);
  return `EXISTS (SELECT 1 FROM handle h2 JOIN chat_handle_join chj2 ON chj2.handle_id = h2.ROWID WHERE chj2.chat_id = c.ROWID AND lower(coalesce(h2.id, '')) LIKE ${like} ESCAPE '\\')`;
}

function textSelect(maxTextChars: number): string {
  if (maxTextChars === 0) {
    return "  '' AS text,";
  }
  return `  substr(coalesce(m.text, ''), 1, ${maxTextChars}) AS text,`;
}

function messageUnixSeconds(): string {
  return "(CASE WHEN abs(m.date) > 1000000000000 THEN (m.date / 1000000000.0) ELSE m.date END + 978307200)";
}

function unixSeconds(value: string): number {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) {
    throw new MessagesDatabaseError(`Invalid date: ${value}`);
  }
  return Math.floor(parsed / 1000);
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function likeString(value: string): string {
  return sqlString(`%${value.toLowerCase().replace(/[\\%_]/g, "\\$&")}%`);
}

function clampLimit(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(100, Math.trunc(value)));
}

function chatRow(row: SqliteChatRow): RawMessagesChatSummary {
  const guid = row.guid ?? "";
  return {
    handle: {
      chatId: Number(row.chatId),
      guid
    },
    chatId: Number(row.chatId),
    guid,
    chatIdentifier: emptyToUndefined(row.chatIdentifier),
    displayName: emptyToUndefined(row.displayName),
    serviceName: emptyToUndefined(row.serviceName),
    participants: splitParticipants(row.participants),
    participantCount: Number(row.participantCount) || 0,
    messageCount: Number(row.messageCount) || 0,
    unreadCount: Number(row.unreadCount) || 0,
    lastMessageDate: appleDate(row.lastDateRaw)
  };
}

function messageRow(row: SqliteMessageRow, maxTextChars: number): RawMessagesMessageSummary {
  const text = row.text ?? "";
  const textChars = Number(row.textChars) || 0;
  const chatId = row.chatId === null || row.chatId === undefined ? undefined : Number(row.chatId);
  const chatGuid = row.chatGuid ?? "";
  return {
    handle: {
      messageId: Number(row.messageId),
      guid: row.guid ?? "",
      chatId
    },
    chatHandle: chatId && chatGuid ? { chatId, guid: chatGuid } : undefined,
    messageId: Number(row.messageId),
    guid: row.guid ?? "",
    chatId,
    chatIdentifier: emptyToUndefined(row.chatIdentifier),
    displayName: emptyToUndefined(row.displayName),
    service: emptyToUndefined(row.service),
    sender: emptyToUndefined(row.sender),
    isFromMe: Number(row.isFromMe) === 1,
    date: appleDate(row.dateRaw),
    text,
    textChars,
    truncated: textChars > maxTextChars,
    hasAttachments: Number(row.hasAttachments) === 1,
    attachmentCount: Number(row.attachmentCount) || 0
  };
}

function splitParticipants(value: string | null): string[] {
  return value
    ? value
        .split(", ")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function emptyToUndefined(value: string | null): string | undefined {
  return value?.trim() ? value : undefined;
}

function appleDate(value: number | null): string | undefined {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw === 0) {
    return undefined;
  }
  const seconds = Math.abs(raw) > 1_000_000_000_000 ? raw / 1_000_000_000 : raw;
  return new Date((seconds + 978_307_200) * 1000).toISOString();
}

function databaseFailureMessage(stderr: string): string {
  const detail = stderr.trim();
  const guidance =
    "Unable to read Apple Messages. Grant Full Disk Access to Codex or the launching terminal, then retry. The plugin reads ~/Library/Messages/chat.db in read-only mode.";
  return detail ? `${guidance} sqlite3 said: ${detail.slice(0, 500)}` : guidance;
}
