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
//# sourceMappingURL=handle.js.map