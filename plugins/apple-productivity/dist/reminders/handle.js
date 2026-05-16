export function encodeReminderHandle(payload) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
export function decodeReminderHandle(handle) {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8"));
    if (!decoded.listId || !decoded.listName || !decoded.id) {
        throw new Error("Invalid reminder handle");
    }
    return decoded;
}
//# sourceMappingURL=handle.js.map