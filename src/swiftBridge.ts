import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export class SwiftBridgeError extends Error {
  constructor(
    message: string,
    readonly stderr?: string
  ) {
    super(message);
    this.name = "SwiftBridgeError";
  }
}

export interface SwiftBridgeOptions {
  timeoutMs: number;
  helperPath?: string;
}

export class SwiftBridge {
  constructor(private readonly options: SwiftBridgeOptions) {}

  async call<T>(command: string, input: unknown = {}): Promise<T> {
    const stdout = await this.runHelper({ command, input });
    const trimmed = stdout.trim();

    if (!trimmed) {
      return undefined as T;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch (error) {
      throw new SwiftBridgeError(
        `Swift helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private runHelper(payload: unknown): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const builtHelper = this.options.helperPath ?? defaultHelperPath();
      const swiftDir = defaultSwiftPackagePath();
      const hasBuiltHelper = existsSync(builtHelper);
      const command = hasBuiltHelper ? builtHelper : "swift";
      const args = hasBuiltHelper ? [] : ["run", "--package-path", swiftDir, "apple-mail-helper"];

      const child = spawn(command, args, {
        cwd: hasBuiltHelper ? dirname(builtHelper) : swiftDir,
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
        reject(new SwiftBridgeError(`Swift helper timed out after ${this.options.timeoutMs}ms`));
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
        reject(new SwiftBridgeError(`Failed to start Swift helper: ${error.message}`));
      });

      child.on("close", (code) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);

        if (code === 0) {
          resolvePromise(stdout);
          return;
        }

        reject(new SwiftBridgeError(`Swift helper exited with code ${code}`, stderr.trim().slice(0, 2000)));
      });

      child.stdin.end(`${JSON.stringify(payload)}\n`);
    });
  }
}

function moduleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function defaultHelperPath(): string {
  const dir = moduleDir();
  const candidates = [
    resolve(dir, "apple-mail-helper"),
    resolve(dir, "../plugins/apple-mail/dist/apple-mail-helper"),
    resolve(dir, "../../../plugins/apple-mail/dist/apple-mail-helper"),
    resolve(dir, "../swift/.build/debug/apple-mail-helper"),
    resolve(dir, "../../../swift/.build/debug/apple-mail-helper")
  ];
  return candidates.find(existsSync) ?? candidates[0];
}

function defaultSwiftPackagePath(): string {
  const dir = moduleDir();
  const candidates = [resolve(dir, "../swift"), resolve(dir, "../../../swift")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "Package.swift"))) ?? candidates[0];
}
