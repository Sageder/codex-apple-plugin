import type { CalendarEventHandlePayload } from "./types.js";

export function encodeCalendarEventHandle(payload: CalendarEventHandlePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCalendarEventHandle(handle: string): CalendarEventHandlePayload {
  const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8")) as CalendarEventHandlePayload;

  if (!decoded.calendarId || !decoded.uid) {
    throw new Error("Invalid calendar event handle");
  }

  if (decoded.occurrenceStart !== undefined && typeof decoded.occurrenceStart !== "string") {
    throw new Error("Invalid calendar event handle");
  }

  return decoded;
}
