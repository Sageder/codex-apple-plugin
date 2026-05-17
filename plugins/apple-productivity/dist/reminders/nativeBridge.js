import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { appBundlePathForExecutable, runAppBundleHelper } from "../appBundleRunner.js";
export class RemindersNativeBridgeError extends Error {
    stderr;
    constructor(message, stderr) {
        super(message);
        this.stderr = stderr;
        this.name = "RemindersNativeBridgeError";
    }
}
export class RemindersNativeBridge {
    options;
    helperPath;
    constructor(options) {
        this.options = options;
        this.helperPath = options.helperPath ?? defaultHelperPath();
    }
    run(action, input = {}) {
        if (appBundlePathForExecutable(this.helperPath)) {
            return this.runAppBundle(action, input);
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
            child.stdout.on("data", (chunk) => {
                stdout += chunk;
            });
            child.stderr.on("data", (chunk) => {
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
                    resolve(undefined);
                    return;
                }
                try {
                    resolve(parseRemindersOutput(trimmed));
                }
                catch (error) {
                    reject(error instanceof RemindersNativeBridgeError
                        ? error
                        : new RemindersNativeBridgeError(`Reminders helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
            child.stdin.end(JSON.stringify(input));
        });
    }
    async runAppBundle(action, input) {
        const stdout = await runAppBundleHelper({
            executablePath: this.helperPath,
            action,
            input,
            timeoutMs: this.options.timeoutMs,
            createError: (message, stderr) => new RemindersNativeBridgeError(message, stderr)
        });
        return parseRemindersOutput(stdout);
    }
}
function parseRemindersOutput(stdout) {
    const trimmed = stdout.trim();
    if (!trimmed) {
        return undefined;
    }
    try {
        return JSON.parse(trimmed);
    }
    catch (error) {
        throw new RemindersNativeBridgeError(`Reminders helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function defaultHelperPath() {
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
//# sourceMappingURL=nativeBridge.js.map