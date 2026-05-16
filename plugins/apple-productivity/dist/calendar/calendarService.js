import { decideWrite } from "../writeGuard.js";
import { decodeCalendarEventHandle, encodeCalendarEventHandle } from "./handle.js";
export class CalendarService {
    runtime;
    config;
    constructor(runtime, config) {
        this.runtime = runtime;
        this.config = config;
    }
    async listCalendars() {
        const calendars = await this.runtime.run("listCalendars");
        return { calendars };
    }
    async searchEvents(args) {
        const input = searchInput(args);
        const raw = await this.runtime.run("searchEvents", {
            ...input,
            notesLimit: this.config.maxBodyChars
        });
        return { events: raw.map(encodeSummary) };
    }
    async readEvent(args) {
        const raw = await this.runtime.run("readEvent", {
            handle: decodeCalendarEventHandle(args.handle),
            notesLimit: this.config.maxBodyChars
        });
        return { event: encodeBody(raw) };
    }
    async createEvent(args) {
        const decision = decideWrite(this.config, "calendar.create", args.confirm, args.dryRun);
        if (!decision.allowed) {
            return {
                mode: decision.mode,
                allowed: false,
                created: false,
                preview: previewCreate(args),
                reason: decision.reason
            };
        }
        const raw = await this.runtime.run("createEvent", {
            ...stripWriteArgs(args),
            notesLimit: this.config.maxBodyChars
        });
        return { ...raw, event: encodeBody(raw.event) };
    }
    async updateEvent(args) {
        const decision = decideWrite(this.config, "calendar.update", args.confirm, args.dryRun);
        const handle = decodeCalendarEventHandle(args.handle);
        if (!decision.allowed) {
            return {
                mode: decision.mode,
                allowed: false,
                updated: false,
                preview: {
                    handle,
                    span: args.span,
                    patch: previewPatch(args.patch)
                },
                reason: decision.reason
            };
        }
        const raw = await this.runtime.run("updateEvent", {
            handle,
            span: args.span,
            patch: args.patch,
            notesLimit: this.config.maxBodyChars
        });
        return { ...raw, event: encodeBody(raw.event) };
    }
    async deleteEvent(args) {
        const decision = decideWrite(this.config, "calendar.delete", args.confirm, args.dryRun);
        const handle = decodeCalendarEventHandle(args.handle);
        if (!decision.allowed) {
            return {
                mode: decision.mode,
                allowed: false,
                deleted: false,
                preview: {
                    handle,
                    span: args.span
                },
                reason: decision.reason
            };
        }
        return this.runtime.run("deleteEvent", {
            handle,
            span: args.span
        });
    }
    async showEvent(args) {
        return this.runtime.run("showEvent", {
            handle: decodeCalendarEventHandle(args.handle)
        });
    }
}
function searchInput(args) {
    const from = args.from ? new Date(args.from) : startOfToday();
    const to = args.to ? new Date(args.to) : addDays(from, 30);
    return {
        query: args.query,
        calendarId: args.calendarId,
        calendarName: args.calendarName,
        from: from.toISOString(),
        to: to.toISOString(),
        includeCancelled: args.includeCancelled ?? false,
        limit: args.limit ?? 50
    };
}
function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function encodeSummary(raw) {
    return {
        ...raw,
        handle: encodeCalendarEventHandle(raw.handle)
    };
}
function encodeBody(raw) {
    return {
        ...raw,
        handle: encodeCalendarEventHandle(raw.handle)
    };
}
function stripWriteArgs(args) {
    const { confirm: _confirm, dryRun: _dryRun, ...input } = args;
    return input;
}
function previewCreate(args) {
    return {
        calendarId: args.calendarId,
        calendarName: args.calendarName,
        summary: args.summary,
        start: args.start,
        end: args.end,
        allDay: args.allDay ?? false,
        hasLocation: Boolean(args.location),
        notesChars: args.notes?.length ?? 0,
        hasUrl: Boolean(args.url),
        hasRecurrence: Boolean(args.recurrence),
        alarmCount: args.alarms?.length ?? 0
    };
}
function previewPatch(patch) {
    return {
        fields: Object.keys(patch),
        notesChars: patch.notes?.length,
        alarmCount: patch.alarms?.length
    };
}
//# sourceMappingURL=calendarService.js.map