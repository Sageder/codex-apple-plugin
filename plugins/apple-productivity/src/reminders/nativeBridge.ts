import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appBundlePathForExecutable, runAppBundleHelper } from "../appBundleRunner.js";

export class RemindersNativeBridgeError extends Error {
  constructor(
    message: string,
    readonly stderr?: string
  ) {
    super(message);
    this.name = "RemindersNativeBridgeError";
  }
}

export interface RemindersNativeBridgeOptions {
  helperPath?: string;
  timeoutMs: number;
}

export interface RemindersBackend {
  run<T>(action: string, input?: unknown): Promise<T>;
}

export class RemindersNativeBridge implements RemindersBackend {
  private readonly helperPath: string;

  constructor(private readonly options: RemindersNativeBridgeOptions) {
    this.helperPath = options.helperPath ?? defaultHelperPath();
  }

  run<T>(action: string, input: unknown = {}): Promise<T> {
    if (appBundlePathForExecutable(this.helperPath)) {
      return this.runAppBundle<T>(action, input);
    }

    return new Promise((resolve, reject) => {
      const child = spawn(this.helperPath, [action], {
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
        reject(new RemindersNativeBridgeError(`Reminders helper timed out after ${this.options.timeoutMs}ms`));
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
        reject(new RemindersNativeBridgeError(`Failed to start Reminders helper: ${error.message}`));
      });

      child.on("close", (code) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);

        if (code !== 0) {
          reject(new RemindersNativeBridgeError(`Reminders helper exited with code ${code}`, stderr.trim().slice(0, 2000)));
          return;
        }

        const trimmed = stdout.trim();
        if (!trimmed) {
          resolve(undefined as T);
          return;
        }

        try {
          resolve(parseRemindersOutput<T>(trimmed));
        } catch (error) {
          reject(
            error instanceof RemindersNativeBridgeError
              ? error
              : new RemindersNativeBridgeError(
                  `Reminders helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
                )
          );
        }
      });

      child.stdin.end(JSON.stringify(input));
    });
  }

  private async runAppBundle<T>(action: string, input: unknown): Promise<T> {
    const stdout = await runAppBundleHelper({
      executablePath: this.helperPath,
      action,
      input,
      timeoutMs: this.options.timeoutMs,
      createError: (message, stderr) => new RemindersNativeBridgeError(message, stderr)
    });

    return parseRemindersOutput<T>(stdout);
  }
}

function parseRemindersOutput<T>(stdout: string): T {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return undefined as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    throw new RemindersNativeBridgeError(
      `Reminders helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function defaultHelperPath(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(moduleDir, "RemindersHelper.app", "Contents", "MacOS", "reminders-helper"),
    join(moduleDir, "reminders", "RemindersHelper.app", "Contents", "MacOS", "reminders-helper"),
    join(moduleDir, "../../dist/reminders/RemindersHelper.app/Contents/MacOS/reminders-helper"),
    join(moduleDir, "reminders-helper"),
    join(moduleDir, "reminders", "reminders-helper"),
    join(moduleDir, "../../dist/reminders/reminders-helper")
  ];
  return candidates.find(existsSync) ?? candidates[0];
}
