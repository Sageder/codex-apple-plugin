function parsePositiveInt(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function parseWriteMode(value) {
    if (value === "direct") {
        return "direct";
    }
    if (value === "ask" || value === "confirm") {
        return "ask";
    }
    return "ask";
}
export function getRuntimeConfig(env = process.env) {
    return {
        writeMode: parseWriteMode(env.APPLE_PRODUCTIVITY_WRITE_MODE),
        maxBodyChars: parsePositiveInt(env.APPLE_PRODUCTIVITY_MAX_BODY_CHARS, 12000),
        retrievalCandidateLimit: parsePositiveInt(env.APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT, 30),
        contextTopK: parsePositiveInt(env.APPLE_PRODUCTIVITY_CONTEXT_TOP_K, 5),
        helperTimeoutMs: parsePositiveInt(env.APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS, 60000),
        defaultRemindersList: env.APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST?.trim() || undefined
    };
}
//# sourceMappingURL=config.js.map