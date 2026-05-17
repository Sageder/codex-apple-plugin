import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
export function appBundlePathForExecutable(executablePath) {
    const marker = ".app/Contents/MacOS/";
    const index = executablePath.indexOf(marker);
    if (index === -1) {
        return undefined;
    }
    return executablePath.slice(0, index + ".app".length);
}
export function helperContainerTmpDir(bundleId) {
    if (!bundleId) {
        return tmpdir();
    }
    return join(homedir(), "Library", "Containers", bundleId, "Data", "tmp");
}
export async function runAppBundleHelper(options) {
    const appPath = appBundlePathForExecutable(options.executablePath);
    if (!appPath) {
        throw options.createError(`Helper path is not inside an app bundle: ${options.executablePath}`);
    }
    const tempRoot = helperContainerTmpDir(bundleIdForAppPath(appPath));
    await mkdir(tempRoot, { recursive: true });
    const tempDir = await mkdtemp(join(tempRoot, "apple-productivity-helper-"));
    const inputPath = join(tempDir, "input.json");
    const outputPath = join(tempDir, "output.json");
    const errorPath = join(tempDir, "error.json");
    try {
        await writeFile(inputPath, JSON.stringify(options.input), "utf8");
        return await openAppBundle({
            ...options,
            appPath,
            inputPath,
            outputPath,
            errorPath
        });
    }
    finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}
function bundleIdForAppPath(appPath) {
    if (appPath.endsWith("/CalendarHelper.app")) {
        return "com.local.codex.apple-productivity.calendar-helper";
    }
    if (appPath.endsWith("/RemindersHelper.app")) {
        return "com.local.codex.apple-productivity.reminders-helper";
    }
    return undefined;
}
function openAppBundle(options) {
    return new Promise((resolve, reject) => {
        const child = spawn("/usr/bin/open", [
            "-W",
            "-n",
            options.appPath,
            "--args",
            options.action,
            "--input-file",
            options.inputPath,
            "--output-file",
            options.outputPath,
            "--error-file",
            options.errorPath
        ], {
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
            reject(options.createError(`App helper timed out after ${options.timeoutMs}ms`));
        }, options.timeoutMs);
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
            reject(options.createError(`Failed to launch app helper: ${error.message}`));
        });
        child.on("close", (code) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            void finishAppBundleRun(options, code, stdout, stderr).then(resolve, reject);
        });
    });
}
async function finishAppBundleRun(options, code, stdout, stderr) {
    const helperError = await readOptionalFile(options.errorPath);
    if (helperError.trim()) {
        throw options.createError(`App helper exited with an error`, helperError.trim().slice(0, 2000));
    }
    if (code !== 0) {
        throw options.createError(`App helper launcher exited with code ${code}`, stderr.trim().slice(0, 2000));
    }
    const output = await readOptionalFile(options.outputPath);
    return output.trim() ? output : stdout;
}
async function readOptionalFile(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
            return "";
        }
        throw error;
    }
}
//# sourceMappingURL=appBundleRunner.js.map