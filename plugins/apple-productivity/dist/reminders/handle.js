export function encodeReminderHandle(payload) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
export function decodeReminderHandle(handle) {
    try {
        const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8"));
        if (!decoded.listId || !decoded.listName || !decoded.id) {
            throw new Error("Invalid reminder handle");
        }
        return {
            listId: decoded.listId,
            listName: decoded.listName,
            id: decoded.id
        };
    }
    catch {
        throw new Error("Invalid reminder handle");
    }
}
//# sourceMappingURL=handle.js.map