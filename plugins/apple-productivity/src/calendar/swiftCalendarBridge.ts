import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appBundlePathForExecutable, runAppBundleHelper } from "../appBundleRunner.js";

export class SwiftCalendarBridgeError extends Error {
  constructor(
    message: string,
    readonly stderr?: string
  ) {
    super(message);
    this.name = "SwiftCalendarBridgeError";
  }
}

export interface SwiftCalendarBridgeOptions {
  timeoutMs: number;
  helperPath?: string;
}

function defaultHelperPath(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(moduleDir, "CalendarHelper.app/Contents/MacOS/calendar-helper"),
    resolve(moduleDir, "calendar/CalendarHelper.app/Contents/MacOS/calendar-helper"),
    resolve(moduleDir, "../../dist/calendar/CalendarHelper.app/Contents/MacOS/calendar-helper"),
    resolve(moduleDir, "calendar-helper"),
    resolve(moduleDir, "calendar", "calendar-helper"),
    resolve(moduleDir, "../../dist/calendar/calendar-helper"),
    resolve(moduleDir, "../../helpers/calendar-tool.swift"),
    resolve(moduleDir, "../helpers/calendar-tool.swift")
  ];
  return candidates.find(existsSync) ?? candidates[0];
}

export class SwiftCalendarBridge {
  private readonly helperPath: string;

  constructor(private readonly options: SwiftCalendarBridgeOptions) {
    this.helperPath = options.helperPath ?? defaultHelperPath();
  }

  async run<T>(action: string, input: unknown = {}): Promise<T> {
    const stdout = await this.runRaw(action, input);
    const trimmed = stdout.trim();

    if (!trimmed) {
      return undefined as T;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch (error) {
      throw new SwiftCalendarBridgeError(
        `Swift calendar helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private runRaw(action: string, input: unknown): Promise<string> {
    if (appBundlePathForExecutable(this.helperPath)) {
      return runAppBundleHelper({
        executablePath: this.helperPath,
        action,
        input,
        timeoutMs: this.options.timeoutMs,
        createError: (message, stderr) => new SwiftCalendarBridgeError(message, stderr)
      });
    }

    return new Promise((resolve, reject) => {
      const isSwiftScript = this.helperPath.endsWith(".swift");
      const command = isSwiftScript ? "/usr/bin/xcrun" : this.helperPath;
      const args = isSwiftScript ? ["swift", this.helperPath, action] : [action];
      const child = spawn(command, args, {
        cwd: dirname(this.helperPath),
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        child.kill("SIGTERM");
        reject(new SwiftCalendarBridgeError(`Swift calendar helper timed out after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });

      child.on("error", (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        reject(new SwiftCalendarBridgeError(`Failed to start Swift calendar helper: ${error.message}`));
      });

      child.on("close", (code) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);

        if (code === 0) {
          resolve(stdout);
          return;
        }

        reject(new SwiftCalendarBridgeError(`Swift calendar helper exited with code ${code}`, stderr.trim().slice(0, 2000)));
      });

      child.stdin.end(JSON.stringify(input));
    });
  }
}
