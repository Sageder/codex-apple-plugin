export function decideWrite(config, action, confirm, dryRun) {
    const label = actionLabel(action);
    if (dryRun) {
        return {
            allowed: false,
            mode: config.writeMode,
            reason: `${label} dry run requested`
        };
    }
    if (config.writeMode === "direct") {
        return {
            allowed: true,
            mode: config.writeMode,
            reason: "direct write mode enabled"
        };
    }
    return {
        allowed: confirm === true,
        mode: config.writeMode,
        reason: confirm === true ? "explicit confirmation supplied" : "confirm: true required in ask mode"
    };
}
function actionLabel(action) {
    return action.includes(".") ? action : `mail.${action}`;
}
//# sourceMappingURL=writeGuard.js.map