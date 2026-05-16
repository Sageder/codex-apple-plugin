import { describe, expect, it } from "vitest";
import { resolveMailboxName } from "../mail/mailboxRole.js";

describe("mailbox role resolution", () => {
  it("prefers normal archive names", () => {
    expect(resolveMailboxName(["Archive1", "Archive", "Deleted Items"], "archive")).toBe("Archive");
  });

  it("resolves common deleted mailbox names", () => {
    expect(resolveMailboxName(["Archive", "Deleted Items", "Junk"], "trash")).toBe("Deleted Items");
    expect(resolveMailboxName(["Archive", "Deleted Messages"], "trash")).toBe("Deleted Messages");
  });
});

