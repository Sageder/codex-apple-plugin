import { describe, expect, it } from "vitest";
import { getRuntimeConfig } from "../config.js";

describe("runtime config", () => {
  it("defaults writes to ask mode", () => {
    expect(getRuntimeConfig({}).writeMode).toBe("ask");
  });

  it("keeps confirm as an ask-mode alias and ignores draft", () => {
    expect(getRuntimeConfig({ APPLE_MAIL_WRITE_MODE: "confirm" }, "mail").writeMode).toBe("ask");
    expect(getRuntimeConfig({ APPLE_MAIL_WRITE_MODE: "draft" }, "mail").writeMode).toBe("ask");
  });

  it("allows direct write mode when explicitly configured", () => {
    expect(getRuntimeConfig({ APPLE_REMINDERS_WRITE_MODE: "direct" }, "reminders").writeMode).toBe("direct");
  });

  it("defaults service write mode when no service env is set", () => {
    expect(getRuntimeConfig({}, "mail").writeMode).toBe("ask");
  });

  it("uses service-specific body limits and helper timeout", () => {
    expect(
      getRuntimeConfig(
        {
          APPLE_CALENDAR_MAX_BODY_CHARS: "3000",
          APPLE_CALENDAR_HELPER_TIMEOUT_MS: "45000"
        },
        "calendar"
      )
    ).toMatchObject({ maxBodyChars: 3000, helperTimeoutMs: 45000 });
  });

  it("uses mail-specific retrieval settings", () => {
    expect(
      getRuntimeConfig(
        {
          APPLE_MAIL_RETRIEVAL_CANDIDATE_LIMIT: "12",
          APPLE_MAIL_CONTEXT_TOP_K: "4"
        },
        "mail"
      )
    ).toMatchObject({ retrievalCandidateLimit: 12, contextTopK: 4 });
  });

  it("uses messages-specific database paths", () => {
    expect(
      getRuntimeConfig(
        {
          APPLE_MESSAGES_DB_PATH: "/tmp/messages-chat.db"
        },
        "messages"
      )
    ).toMatchObject({ messagesDatabasePath: "/tmp/messages-chat.db" });
  });
});
