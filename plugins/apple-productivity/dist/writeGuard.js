export function decideWrite(config, action, confirm, dryRun) {
    if (dryRun) {
        return {
            allowed: false,
            mode: config.writeMode,
            reason: `${action} dry run requested`
        };
    }
    if (config.writeMode === "direct") {
        return {
            allowed: true,
            mode: config.writeMode,
            reason: "direct write mode enabled"
        };
    }
    if (config.writeMode === "confirm") {
        return {
            allowed: confirm === true,
            mode: config.writeMode,
            reason: confirm === true ? "explicit confirmation supplied" : "confirmation required"
        };
    }
    return {
        allowed: false,
        mode: config.writeMode,
        reason: "draft mode prevents irreversible writes"
    };
}
//# sourceMappingURL=writeGuard.js.map