import type { RuntimeConfig } from "../config.js";
import type { CalendarEventBody, CalendarEventFields, CalendarEventPatch, CalendarEventSummary, CalendarInfo, CalendarMutationSpan } from "./types.js";
export interface CalendarRuntime {
    run<T>(action: string, input?: unknown): Promise<T>;
}
export interface CalendarSearchArgs {
    query?: string;
    calendarId?: string;
    calendarName?: string;
    from?: string;
    to?: string;
    includeCancelled?: boolean;
    limit?: number;
}
export interface CalendarCreateArgs extends CalendarEventFields {
    calendarId?: string;
    calendarName?: string;
    confirm?: boolean;
    dryRun?: boolean;
}
export interface CalendarUpdateArgs {
    handle: string;
    span: CalendarMutationSpan;
    patch: CalendarEventPatch;
    confirm?: boolean;
    dryRun?: boolean;
}
export interface CalendarDeleteArgs {
    handle: string;
    span: CalendarMutationSpan;
    confirm?: boolean;
    dryRun?: boolean;
}
export interface CalendarReadArgs {
    handle: string;
}
export declare class CalendarService {
    private readonly runtime;
    private readonly config;
    constructor(runtime: CalendarRuntime, config: RuntimeConfig);
    listCalendars(): Promise<{
        calendars: CalendarInfo[];
    }>;
    searchEvents(args: CalendarSearchArgs): Promise<{
        events: CalendarEventSummary[];
    }>;
    readEvent(args: CalendarReadArgs): Promise<{
        event: CalendarEventBody;
    }>;
    createEvent(args: CalendarCreateArgs): Promise<{
        mode: import("../config.js").WriteMode;
        allowed: boolean;
        created: boolean;
        preview: {
            calendarId: string | undefined;
            calendarName: string | undefined;
            summary: string;
            start: string;
            end: string;
            allDay: boolean;
            hasLocation: boolean;
            notesChars: number;
            hasUrl: boolean;
            hasRecurrence: boolean;
            alarmCount: number;
        };
        reason: string;
    } | {
        event: CalendarEventBody;
        created: true;
        mode?: undefined;
        allowed?: undefined;
        preview?: undefined;
        reason?: undefined;
    }>;
    updateEvent(args: CalendarUpdateArgs): Promise<{
        mode: import("../config.js").WriteMode;
        allowed: boolean;
        updated: boolean;
        preview: {
            handle: import("./types.js").CalendarEventHandlePayload;
            span: CalendarMutationSpan;
            patch: {
                fields: string[];
                notesChars: number | undefined;
                alarmCount: number | undefined;
            };
        };
        reason: string;
    } | {
        event: CalendarEventBody;
        updated: true;
        span: CalendarMutationSpan;
        mode?: undefined;
        allowed?: undefined;
        preview?: undefined;
        reason?: undefined;
    }>;
    deleteEvent(args: CalendarDeleteArgs): Promise<unknown>;
    showEvent(args: CalendarReadArgs): Promise<unknown>;
}
