import { describe, expect, it } from "vitest";
import { decideWrite } from "../writeGuard.js";

describe("write guard", () => {
  it("blocks writes in draft mode", () => {
    expect(decideWrite({ writeMode: "draft" }, "delete").allowed).toBe(false);
  });

  it("requires explicit confirmation in confirm mode", () => {
    expect(decideWrite({ writeMode: "confirm" }, "archive").allowed).toBe(false);
    expect(decideWrite({ writeMode: "confirm" }, "archive", true).allowed).toBe(true);
  });

  it("allows writes in direct mode unless dry-run", () => {
    expect(decideWrite({ writeMode: "direct" }, "send").allowed).toBe(true);
    expect(decideWrite({ writeMode: "direct" }, "send", false, true).allowed).toBe(false);
  });
});

