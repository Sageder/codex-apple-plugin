import { describe, expect, it } from "vitest";
import { decodeMessageHandle, encodeMessageHandle } from "../mail/handle.js";

describe("message handles", () => {
  it("round-trips handle payloads", () => {
    const payload = { account: "iCloud", mailbox: "INBOX", id: 123 };
    expect(decodeMessageHandle(encodeMessageHandle(payload))).toEqual(payload);
  });

  it("rejects invalid payloads", () => {
    const invalid = Buffer.from(JSON.stringify({ account: "iCloud" }), "utf8").toString("base64url");
    expect(() => decodeMessageHandle(invalid)).toThrow("Invalid mail message handle");
  });
});

