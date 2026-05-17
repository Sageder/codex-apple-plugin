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

function mockChildProcess(stdout: string, options: { autoClose?: boolean } = {}) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
    stderr: EventEmitter & { setEncoding: ReturnType<typeof vi.fn> };
    stdin: { end: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
  };

  child.stdout = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
  child.kill = vi.fn();
  let closed = false;
  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    setImmediate(() => {
      child.stdout.emit("data", stdout);
      child.emit("close", 0);
    });
  };
  const originalOn = child.on.bind(child);
  child.on = ((eventName: string | symbol, listener: (...args: unknown[]) => void) => {
    const result = originalOn(eventName, listener);
    if (eventName === "close" && options.autoClose) {
      close();
    }
    return result;
  }) as typeof child.on;
  child.stdin = {
    end: vi.fn(close)
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

  it("prefers the compiled Calendar helper when available from source", async () => {
    existsSyncMock.mockImplementation((path) =>
      String(path).endsWith("/plugins/apple-productivity/dist/calendar/CalendarHelper.app/Contents/MacOS/calendar-helper")
    );
    spawnMock.mockReturnValue(mockChildProcess('{"ok":true}\n', { autoClose: true }) as never);

    await expect(new SwiftCalendarBridge({ timeoutMs: 1000 }).run("requestAccess")).resolves.toEqual({ ok: true });

    const [command, args, options] = spawnMock.mock.calls[0];
    expect(command).toBe("/usr/bin/open");
    expect(args).toEqual([
      "-W",
      "-n",
      expect.stringMatching(/plugins\/apple-productivity\/dist\/calendar\/CalendarHelper\.app$/),
      "--args",
      "requestAccess",
      "--input-file",
      expect.any(String),
      "--output-file",
      expect.any(String),
      "--error-file",
      expect.any(String)
    ]);
    expect(options).toMatchObject({ stdio: ["ignore", "pipe", "pipe"] });
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

  it("finds the built Reminders helper when running from source", async () => {
    existsSyncMock.mockImplementation((path) =>
      String(path).endsWith("/plugins/apple-productivity/dist/reminders/RemindersHelper.app/Contents/MacOS/reminders-helper")
    );
    spawnMock.mockReturnValue(mockChildProcess('{"ok":true}\n', { autoClose: true }) as never);

    await expect(new RemindersNativeBridge({ timeoutMs: 1000 }).run("requestAccess")).resolves.toEqual({ ok: true });

    const [command, args, options] = spawnMock.mock.calls[0];
    expect(command).toBe("/usr/bin/open");
    expect(args).toEqual([
      "-W",
      "-n",
      expect.stringMatching(/plugins\/apple-productivity\/dist\/reminders\/RemindersHelper\.app$/),
      "--args",
      "requestAccess",
      "--input-file",
      expect.any(String),
      "--output-file",
      expect.any(String),
      "--error-file",
      expect.any(String)
    ]);
    expect(options).toMatchObject({ stdio: ["ignore", "pipe", "pipe"] });
  });
});
