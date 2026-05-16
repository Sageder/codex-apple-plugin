import { spawn } from "node:child_process";

export class AppleBridgeError extends Error {
  constructor(
    message: string,
    readonly stderr?: string
  ) {
    super(message);
    this.name = "AppleBridgeError";
  }
}

export interface AppleBridgeOptions {
  timeoutMs: number;
}

export class AppleBridge {
  constructor(private readonly options: AppleBridgeOptions) {}

  async runJxa<T>(source: string, input: unknown = {}): Promise<T> {
    const stdout = await this.runRawJxa(source, input);
    const trimmed = stdout.trim();

    if (!trimmed) {
      return undefined as T;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch (error) {
      throw new AppleBridgeError(
        `AppleScript returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private runRawJxa(source: string, input: unknown): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("/usr/bin/osascript", ["-l", "JavaScript", "-e", source, JSON.stringify(input)], {
        stdio: ["ignore", "pipe", "pipe"]
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
        reject(new AppleBridgeError(`AppleScript timed out after ${this.options.timeoutMs}ms`));
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
        reject(new AppleBridgeError(`Failed to start osascript: ${error.message}`));
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

        reject(new AppleBridgeError(`AppleScript exited with code ${code}`, stderr.trim().slice(0, 2000)));
      });
    });
  }
}

