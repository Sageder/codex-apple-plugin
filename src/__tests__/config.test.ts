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

  it("uses service-specific write mode before shared fallback", () => {
    expect(
      getRuntimeConfig(
        {
          APPLE_PRODUCTIVITY_WRITE_MODE: "ask",
          APPLE_MAIL_WRITE_MODE: "direct"
        },
        "mail"
      ).writeMode
    ).toBe("direct");
  });

  it("uses service-specific body limits before shared fallback", () => {
    expect(
      getRuntimeConfig(
        {
          APPLE_PRODUCTIVITY_MAX_BODY_CHARS: "12000",
          APPLE_CALENDAR_MAX_BODY_CHARS: "3000"
        },
        "calendar"
      ).maxBodyChars
    ).toBe(3000);
  });
});
