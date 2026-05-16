import type { ReminderHandlePayload } from "./types.js";
export declare function encodeReminderHandle(payload: ReminderHandlePayload): string;
export declare function decodeReminderHandle(handle: string): ReminderHandlePayload;
