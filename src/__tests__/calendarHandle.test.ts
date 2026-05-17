import { describe, expect, it } from "vitest";
import { decodeCalendarEventHandle, encodeCalendarEventHandle } from "../calendar/handle.js";

describe("calendar event handles", () => {
  it("round-trips handle payloads", () => {
    const payload = {
      calendarId: "cal-1",
      uid: "event-1",
      occurrenceStart: "2026-05-16T08:00:00.000Z"
    };

    expect(decodeCalendarEventHandle(encodeCalendarEventHandle(payload))).toEqual(payload);
  });

  it("allows series handles without occurrence starts", () => {
    const payload = { calendarId: "cal-1", uid: "event-1" };
    expect(decodeCalendarEventHandle(encodeCalendarEventHandle(payload))).toEqual(payload);
  });

  it("rejects invalid payloads", () => {
    const invalid = Buffer.from(JSON.stringify({ calendarId: "cal-1" }), "utf8").toString("base64url");
    expect(() => decodeCalendarEventHandle(invalid)).toThrow("Invalid calendar event handle");
  });
});
