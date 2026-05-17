import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "../config.js";
import { MailService } from "../mail/mailService.js";
import type { SwiftBridge } from "../swiftBridge.js";

class FakeSwiftBridge {
  calls: Array<{ command: string; input: unknown }> = [];

  constructor(private readonly response: unknown) {}

  async call<T>(command: string, input?: unknown): Promise<T> {
    this.calls.push({ command, input });
    return this.response as T;
  }
}

const config: RuntimeConfig = {
  writeMode: "ask",
  maxBodyChars: 12000,
  retrievalCandidateLimit: 30,
  contextTopK: 5,
  helperTimeoutMs: 15000
};

describe("mail service", () => {
  it("forwards explicit permission requests to the Swift helper", async () => {
    const bridge = new FakeSwiftBridge({ accountCount: 1, mailboxCount: 6 });
    const service = new MailService(bridge as unknown as SwiftBridge, config);

    const result = await service.requestPermission();

    expect(result).toEqual({ accountCount: 1, mailboxCount: 6 });
    expect(bridge.calls).toEqual([{ command: "mail.requestPermission", input: undefined }]);
  });
});
