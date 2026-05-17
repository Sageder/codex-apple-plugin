import { describe, expect, it } from "vitest";
import { decideWrite } from "../writeGuard.js";

describe("write guard", () => {
  it("requires explicit confirmation in ask mode", () => {
    const decision = decideWrite({ writeMode: "ask" }, "calendar.delete");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("confirm: true required in ask mode");
    expect(decideWrite({ writeMode: "ask" }, "mail.archive", true).allowed).toBe(true);
    expect(decideWrite({ writeMode: "ask" }, "calendar.create", true).allowed).toBe(true);
    expect(decideWrite({ writeMode: "ask" }, "reminders.create", true).allowed).toBe(true);
  });

  it("allows writes in direct mode unless dry-run", () => {
    expect(decideWrite({ writeMode: "direct" }, "mail.send").allowed).toBe(true);
    const dryRun = decideWrite({ writeMode: "direct" }, "calendar.update", false, true);
    expect(dryRun.allowed).toBe(false);
    expect(dryRun.reason).toBe("calendar.update dry run requested");
    expect(decideWrite({ writeMode: "direct" }, "reminders.delete", false, true).reason).toBe(
      "reminders.delete dry run requested"
    );
  });
});
