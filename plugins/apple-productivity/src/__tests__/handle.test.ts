import { describe, expect, it } from "vitest";
import { decodeMessageHandle, decodeUndoToken, encodeMessageHandle, encodeUndoToken } from "../mail/handle.js";

describe("message handles", () => {
  it("round-trips handle payloads", () => {
    const payload = { account: "iCloud", mailbox: "INBOX", id: 123 };
    expect(decodeMessageHandle(encodeMessageHandle(payload))).toEqual(payload);
  });

  it("rejects invalid payloads", () => {
    const invalid = Buffer.from(JSON.stringify({ account: "iCloud" }), "utf8").toString("base64url");
    expect(() => decodeMessageHandle(invalid)).toThrow("Invalid mail message handle");
  });

  it("round-trips undo tokens", () => {
    const token = {
      action: "delete",
      account: "iCloud",
      id: 123,
      fromMailbox: "INBOX",
      toMailbox: "Deleted Messages",
      createdAt: "2026-05-16T12:00:00.000Z"
    };

    expect(decodeUndoToken(encodeUndoToken(token))).toEqual(token);
  });
});
