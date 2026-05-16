import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SwiftCalendarBridge } from "../calendar/swiftCalendarBridge.js";
import { RemindersNativeBridge } from "../reminders/nativeBridge.js";
import { SwiftBridge } from "../swiftBridge.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn()
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync)
  };
});

const spawnMock = vi.mocked(spawn);
const existsSyncMock = vi.mocked(existsSync);

function mockChildProcess(stdout: string) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
    stderr: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
    stdin: { end: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
  };

  child.stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.kill = vi.fn();
  child.stdin = {
    end: vi.fn(() => {
      setImmediate(() => {
        child.stdout.emit("data", stdout);
        child.emit("close", 0);
      });
    })
  };

  return child;
}

describe("native helper bridge launch directories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the Mail Swift package helper from the package directory", async () => {
    existsSyncMock.mockReturnValue(false);
    spawnMock.mockReturnValue(mockChildProcess('{"ok":true}\n') as never);

    await expect(new SwiftBridge({ timeoutMs: 1000 }).call("mail_search")).resolves.toEqual({ ok: true });

    const [, args, options] = spawnMock.mock.calls[0];
    expect(args).toEqual(["run", "--package-path", expect.any(String), "apple-productivity-helper"]);
    expect(options).toMatchObject({ cwd: args[2] });
    expect(String(args[2])).toMatch(/plugins\/apple-productivity\/swift$/);
  });

  it("runs the Calendar Swift script from its helper directory", async () => {
    spawnMock.mockReturnValue(mockChildProcess('{"ok":true}\n') as never);

    await expect(
      new SwiftCalendarBridge({
        helperPath: "/tmp/apple-productivity/helpers/calendar-tool.swift",
        timeoutMs: 1000
      }).run("search")
    ).resolves.toEqual({ ok: true });

    expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: "/tmp/apple-productivity/helpers" });
  });

  it("runs the Reminders helper from its executable directory", async () => {
    spawnMock.mockReturnValue(mockChildProcess('{"ok":true}\n') as never);

    await expect(
      new RemindersNativeBridge({
        helperPath: "/tmp/apple-productivity/dist/reminders/reminders-helper",
        timeoutMs: 1000
      }).run("search")
    ).resolves.toEqual({ ok: true });

    expect(spawnMock.mock.calls[0][2]).toMatchObject({ cwd: "/tmp/apple-productivity/dist/reminders" });
  });
});
