export function encodeCalendarEventHandle(payload) {
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}
export function decodeCalendarEventHandle(handle) {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8"));
    if (!decoded.calendarId || !decoded.uid) {
        throw new Error("Invalid calendar event handle");
    }
    if (decoded.occurrenceStart !== undefined && typeof decoded.occurrenceStart !== "string") {
        throw new Error("Invalid calendar event handle");
    }
    return decoded;
}
//# sourceMappingURL=handle.js.map