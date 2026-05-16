import { spawn } from "node:child_process";
export class AppleBridgeError extends Error {
    stderr;
    constructor(message, stderr) {
        super(message);
        this.stderr = stderr;
        this.name = "AppleBridgeError";
    }
}
export class AppleBridge {
    options;
    constructor(options) {
        this.options = options;
    }
    async runJxa(source, input = {}) {
        const stdout = await this.runRawJxa(source, input);
        const trimmed = stdout.trim();
        if (!trimmed) {
            return undefined;
        }
        try {
            return JSON.parse(trimmed);
        }
        catch (error) {
            throw new AppleBridgeError(`AppleScript returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    runRawJxa(source, input) {
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
//# sourceMappingURL=appleBridge.js.map