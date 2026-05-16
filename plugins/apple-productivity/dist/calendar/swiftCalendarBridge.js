import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
export class SwiftCalendarBridgeError extends Error {
    stderr;
    constructor(message, stderr) {
        super(message);
        this.stderr = stderr;
        this.name = "SwiftCalendarBridgeError";
    }
}
function defaultHelperPath() {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const candidates = [
        resolve(moduleDir, "../../helpers/calendar-tool.swift"),
        resolve(moduleDir, "../helpers/calendar-tool.swift")
    ];
    return candidates.find(existsSync) ?? candidates[0];
}
export class SwiftCalendarBridge {
    options;
    helperPath;
    constructor(options) {
        this.options = options;
        this.helperPath = options.helperPath ?? defaultHelperPath();
    }
    async run(action, input = {}) {
        const stdout = await this.runRaw(action, input);
        const trimmed = stdout.trim();
        if (!trimmed) {
            return undefined;
        }
        try {
            return JSON.parse(trimmed);
        }
        catch (error) {
            throw new SwiftCalendarBridgeError(`Swift calendar helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    runRaw(action, input) {
        return new Promise((resolve, reject) => {
            const child = spawn("/usr/bin/xcrun", ["swift", this.helperPath, action], {
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
//# sourceMappingURL=swiftCalendarBridge.js.map