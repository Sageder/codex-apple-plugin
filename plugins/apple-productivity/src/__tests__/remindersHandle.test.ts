import { describe, expect, it } from "vitest";
import { decodeReminderHandle, encodeReminderHandle } from "../reminders/handle.js";

describe("reminder handles", () => {
  it("round-trips handle payloads", () => {
    const payload = { listId: "list-1", listName: "Tasks", id: "reminder-1" };
    expect(decodeReminderHandle(encodeReminderHandle(payload))).toEqual(payload);
  });

  it("rejects invalid payloads", () => {
    const invalid = Buffer.from(JSON.stringify({ listId: "list-1" }), "utf8").toString("base64url");
    expect(() => decodeReminderHandle(invalid)).toThrow("Invalid reminder handle");
  });
});
