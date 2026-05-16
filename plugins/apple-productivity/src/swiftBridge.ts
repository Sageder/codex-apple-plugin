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
}

export class SwiftBridge {
  private readonly pluginRoot: string;

  constructor(private readonly options: SwiftBridgeOptions) {
    this.pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  }

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
      const swiftDir = resolve(this.pluginRoot, "swift");
      const builtHelper = resolve(swiftDir, ".build", "debug", "apple-productivity-helper");
      const command = existsSync(builtHelper) ? builtHelper : "swift";
      const args = existsSync(builtHelper) ? [] : ["run", "--package-path", swiftDir, "apple-productivity-helper"];

      const child = spawn(command, args, {
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
