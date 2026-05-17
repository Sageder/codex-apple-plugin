export interface ReminderHandlePayload {
  listId: string;
  listName: string;
  id: string;
}

export function encodeReminderHandle(payload: ReminderHandlePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeReminderHandle(handle: string): ReminderHandlePayload {
  try {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8")) as Partial<
      ReminderHandlePayload
    >;
    if (!decoded.listId || !decoded.listName || !decoded.id) {
      throw new Error("Invalid reminder handle");
    }

    return {
      listId: decoded.listId,
      listName: decoded.listName,
      id: decoded.id
    };
  } catch {
    throw new Error("Invalid reminder handle");
  }
}
