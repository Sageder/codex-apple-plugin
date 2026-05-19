import { spawn } from "node:child_process";

export class MessagesSenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagesSenderError";
  }
}

export interface MessagesSendRuntimeArgs {
  recipient: string;
  text: string;
  service?: "iMessage" | "SMS";
}

export interface MessagesSendResult {
  sent: boolean;
  recipient: string;
  service?: "iMessage" | "SMS";
  textChars: number;
}

export class MessagesAppleScriptSender {
  constructor(private readonly timeoutMs: number) {}

  send(args: MessagesSendRuntimeArgs): Promise<MessagesSendResult> {
    const script = sendScript(args);
    return new Promise((resolve, reject) => {
      const child = spawn("/usr/bin/osascript", [], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        child.kill("SIGTERM");
        reject(new MessagesSenderError(`Apple Messages send timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(new MessagesSenderError(`Failed to start Apple Messages send script: ${error.message}`));
      });
      child.on("close", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (code !== 0) {
          reject(
            new MessagesSenderError(
              "Apple Messages send failed. Ensure Messages is signed in and Codex has Automation access to Messages."
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(stdout.trim()) as MessagesSendResult);
        } catch (error) {
          reject(
            new MessagesSenderError(
              `Apple Messages send returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
            )
          );
        }
      });

      child.stdin.end(script);
    });
  }
}

function sendScript(args: MessagesSendRuntimeArgs): string {
  const service = args.service ?? "";
  return [
    `set targetRecipient to ${appleScriptString(args.recipient)}`,
    `set messageText to ${appleScriptString(args.text)}`,
    `set preferredServiceType to ${appleScriptString(service)}`,
    'tell application "Messages"',
    "  set targetService to missing value",
    "  if preferredServiceType is not \"\" then",
    "    repeat with candidateService in services",
    "      if (service type of candidateService as text) is preferredServiceType then",
    "        set targetService to candidateService",
    "        exit repeat",
    "      end if",
    "    end repeat",
    "  end if",
    "  if targetService is missing value then",
    "    repeat with candidateService in services",
    "      if (service type of candidateService as text) is \"iMessage\" then",
    "        set targetService to candidateService",
    "        exit repeat",
    "      end if",
    "    end repeat",
    "  end if",
    "  if targetService is missing value then set targetService to first service",
    "  set chosenServiceType to service type of targetService as text",
    "  set targetBuddy to buddy targetRecipient of targetService",
    "  send messageText to targetBuddy",
    "end tell",
    `return "{\\"sent\\":true,\\"recipient\\":${jsonStringFragment(args.recipient)},\\"service\\":\\"" & chosenServiceType & "\\",\\"textChars\\":${args.text.length}}"`
  ].join("\n");
}

function appleScriptString(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized.split("\n").map((part) => `"${part.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return parts.join(" & linefeed & ");
}

function jsonStringFragment(value: string): string {
  return JSON.stringify(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
