import { describe, expect, it } from "vitest";
import { decideWrite } from "../writeGuard.js";

describe("write guard", () => {
  it("blocks writes in draft mode", () => {
    const decision = decideWrite({ writeMode: "draft" }, "calendar.delete");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("draft mode prevents irreversible writes");
  });

  it("requires explicit confirmation in confirm mode", () => {
    expect(decideWrite({ writeMode: "confirm" }, "mail.archive").allowed).toBe(false);
    expect(decideWrite({ writeMode: "confirm" }, "mail.archive", true).allowed).toBe(true);
    expect(decideWrite({ writeMode: "confirm" }, "calendar.create", true).allowed).toBe(true);
  });

  it("allows writes in direct mode unless dry-run", () => {
    expect(decideWrite({ writeMode: "direct" }, "mail.send").allowed).toBe(true);
    const dryRun = decideWrite({ writeMode: "direct" }, "calendar.update", false, true);
    expect(dryRun.allowed).toBe(false);
    expect(dryRun.reason).toBe("calendar.update dry run requested");
  });

  it("keeps legacy mail action names compatible", () => {
    const dryRun = decideWrite({ writeMode: "direct" }, "send", false, true);
    expect(dryRun.allowed).toBe(false);
    expect(dryRun.reason).toBe("mail.send dry run requested");
  });
});
