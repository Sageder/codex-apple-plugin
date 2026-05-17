import { spawn } from "node:child_process";
import type { AppleServiceName } from "../config.js";

export class AppleScriptPermissionError extends Error {
  constructor(
    message: string,
    readonly stderr?: string
  ) {
    super(message);
    this.name = "AppleScriptPermissionError";
  }
}

export interface AppleScriptRunner {
  run(script: string): Promise<string>;
}

export interface AppleScriptProbeResult {
  action: string;
  summary: Record<string, number>;
}

export class OsascriptRunner implements AppleScriptRunner {
  constructor(private readonly timeoutMs: number) {}

  run(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn("/usr/bin/osascript", ["-e", script], {
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
        reject(new AppleScriptPermissionError(`AppleScript permission probe timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

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
        reject(new AppleScriptPermissionError(`Failed to start AppleScript permission probe: ${error.message}`));
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

        reject(new AppleScriptPermissionError(`AppleScript permission probe exited with code ${code}`, stderr.trim()));
      });
    });
  }
}

export class AppleScriptPermissionBootstrap {
  constructor(private readonly runner: AppleScriptRunner) {}

  async request(service: AppleServiceName): Promise<AppleScriptProbeResult> {
    const script = scriptForPermissionProbe(service);
    const stdout = await this.runner.run(script);
    return {
      action: `osascript.${service}.metadataProbe`,
      summary: sanitizeAppleScriptSummary(service, parseProbeOutput(stdout))
    };
  }
}

export function scriptForPermissionProbe(service: AppleServiceName): string {
  switch (service) {
    case "mail":
      return [
        'tell application "Mail"',
        "  set accountCount to count of accounts",
        "  set mailboxCount to 0",
        "  repeat with mailAccount in accounts",
        "    set mailboxCount to mailboxCount + (count of mailboxes of mailAccount)",
        "  end repeat",
        '  return "{\\"accountCount\\":" & accountCount & ",\\"mailboxCount\\":" & mailboxCount & "}"',
        "end tell"
      ].join("\n");
    case "calendar":
      return [
        'tell application "Calendar"',
        "  set calendarCount to count of calendars",
        '  return "{\\"calendarCount\\":" & calendarCount & "}"',
        "end tell"
      ].join("\n");
    case "reminders":
      return [
        'tell application "Reminders"',
        "  set listCount to count of lists",
        '  return "{\\"listCount\\":" & listCount & "}"',
        "end tell"
      ].join("\n");
  }
}

function parseProbeOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new AppleScriptPermissionError("AppleScript permission probe returned no output");
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new AppleScriptPermissionError(
      `AppleScript permission probe returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function sanitizeAppleScriptSummary(service: AppleServiceName, value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null) {
    throw new AppleScriptPermissionError("AppleScript permission probe returned an invalid summary");
  }

  switch (service) {
    case "mail":
      return {
        accountCount: numberField(value, "accountCount"),
        mailboxCount: numberField(value, "mailboxCount")
      };
    case "calendar":
      return { calendarCount: numberField(value, "calendarCount") };
    case "reminders":
      return { listCount: numberField(value, "listCount") };
  }
}

function numberField(value: object, key: string): number {
  const field = (value as Record<string, unknown>)[key];
  if (typeof field !== "number") {
    throw new AppleScriptPermissionError(`AppleScript permission probe did not return numeric ${key}`);
  }

  return field;
}
