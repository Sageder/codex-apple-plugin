import type { ReminderHandlePayload } from "./types.js";

export function encodeReminderHandle(payload: ReminderHandlePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeReminderHandle(handle: string): ReminderHandlePayload {
  const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8")) as ReminderHandlePayload;

  if (!decoded.listId || !decoded.listName || !decoded.id) {
    throw new Error("Invalid reminder handle");
  }

  return decoded;
}
