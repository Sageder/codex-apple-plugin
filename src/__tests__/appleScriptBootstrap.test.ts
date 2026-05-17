import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppleScriptPermissionBootstrap,
  OsascriptRunner,
  scriptForPermissionProbe
} from "../permissions/appleScriptBootstrap.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn()
}));

const spawnMock = vi.mocked(spawn);

function mockChildProcess(stdout: string) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
    stderr: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
  };

  child.stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.kill = vi.fn();

  const originalOn = child.on.bind(child);
  child.on = ((eventName: string | symbol, listener: (...args: unknown[]) => void) => {
    const result = originalOn(eventName, listener);
    if (eventName === "close") {
      setImmediate(() => {
        child.stdout.emit("data", stdout);
        child.emit("close", 0);
      });
    }
    return result;
  }) as typeof child.on;

  return child;
}

describe("AppleScript permission bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates metadata-only scripts for each Apple app", () => {
    expect(scriptForPermissionProbe("mail")).toContain('tell application "Mail"');
    expect(scriptForPermissionProbe("mail")).toContain("count of accounts");
    expect(scriptForPermissionProbe("mail")).not.toContain("content of");

    expect(scriptForPermissionProbe("calendar")).toContain('tell application "Calendar"');
    expect(scriptForPermissionProbe("calendar")).toContain("count of calendars");
    expect(scriptForPermissionProbe("calendar")).not.toContain("description of");

    expect(scriptForPermissionProbe("reminders")).toContain('tell application "Reminders"');
    expect(scriptForPermissionProbe("reminders")).toContain("count of lists");
    expect(scriptForPermissionProbe("reminders")).not.toContain("body of");
  });

  it("runs osascript with the generated command and sanitizes output", async () => {
    spawnMock.mockReturnValue(mockChildProcess('{"accountCount":2,"mailboxCount":14,"ignored":"private"}\n') as never);

    const result = await new AppleScriptPermissionBootstrap(new OsascriptRunner(1000)).request("mail");

    expect(spawnMock).toHaveBeenCalledWith(
      "/usr/bin/osascript",
      ["-e", expect.stringContaining('tell application "Mail"')],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    expect(result).toEqual({
      action: "osascript.mail.metadataProbe",
      summary: { accountCount: 2, mailboxCount: 14 }
    });
  });
});
