export function encodeMessageHandle(payload) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
export function decodeMessageHandle(handle) {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8"));
    if (!decoded.account || !decoded.mailbox || typeof decoded.id !== "number") {
        throw new Error("Invalid mail message handle");
    }
    return decoded;
}
export function encodeUndoToken(payload) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
export function decodeUndoToken(token) {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (!decoded.account || !decoded.fromMailbox || !decoded.toMailbox || typeof decoded.id !== "number") {
        throw new Error("Invalid mail undo token");
    }
    return decoded;
}
//# sourceMappingURL=handle.js.map