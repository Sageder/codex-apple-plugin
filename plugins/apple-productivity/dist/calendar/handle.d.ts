import type { CalendarEventHandlePayload } from "./types.js";
export declare function encodeCalendarEventHandle(payload: CalendarEventHandlePayload): string;
export declare function decodeCalendarEventHandle(handle: string): CalendarEventHandlePayload;
