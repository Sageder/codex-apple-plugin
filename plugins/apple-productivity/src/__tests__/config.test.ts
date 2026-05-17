import { describe, expect, it } from "vitest";
import { getRuntimeConfig } from "../config.js";

describe("runtime config", () => {
  it("defaults writes to ask mode", () => {
    expect(getRuntimeConfig({}).writeMode).toBe("ask");
  });

  it("keeps confirm as an ask-mode alias and ignores draft", () => {
    expect(getRuntimeConfig({ APPLE_PRODUCTIVITY_WRITE_MODE: "confirm" }).writeMode).toBe("ask");
    expect(getRuntimeConfig({ APPLE_PRODUCTIVITY_WRITE_MODE: "draft" }).writeMode).toBe("ask");
  });

  it("allows direct write mode when explicitly configured", () => {
    expect(getRuntimeConfig({ APPLE_PRODUCTIVITY_WRITE_MODE: "direct" }).writeMode).toBe("direct");
  });
});
