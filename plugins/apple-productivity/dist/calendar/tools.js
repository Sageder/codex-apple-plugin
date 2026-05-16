import { errorResponse, jsonResponse } from "../toolResponse.js";
import { calendarCreateEventSchema, calendarDeleteEventSchema, calendarReadEventSchema, calendarSearchEventsSchema, calendarShowEventSchema, calendarUpdateEventSchema } from "./schemas.js";
export function registerCalendarTools(server, calendar) {
    server.registerTool("calendar_list_calendars", {
        title: "List Apple Calendar calendars",
        description: "List calendars configured in Apple Calendar.app, including identifiers and writable status.",
        annotations: { readOnlyHint: true }
    }, async () => safe(() => calendar.listCalendars()));
    server.registerTool("calendar_search_events", {
        title: "Search Apple Calendar events",
        description: "Search live Apple Calendar.app events by date window, calendar, and metadata. Returns event handles for reads or actions.",
        inputSchema: calendarSearchEventsSchema,
        annotations: { readOnlyHint: true }
    }, async (args) => safe(() => calendar.searchEvents(args)));
    server.registerTool("calendar_read_event", {
        title: "Read Apple Calendar event",
        description: "Read one Apple Calendar.app event by handle, including notes preview, attendees, alarms, recurrence, and status.",
        inputSchema: calendarReadEventSchema,
        annotations: { readOnlyHint: true }
    }, async (args) => safe(() => calendar.readEvent(args)));
    server.registerTool("calendar_create_event", {
        title: "Create Apple Calendar event",
        description: "Create an Apple Calendar.app event when the shared write policy permits it; otherwise return a dry preview.",
        inputSchema: calendarCreateEventSchema,
        annotations: { readOnlyHint: false, destructiveHint: false }
    }, async (args) => safe(() => calendar.createEvent(args)));
    server.registerTool("calendar_update_event", {
        title: "Update Apple Calendar event",
        description: "Update an Apple Calendar.app event or occurrence when the shared write policy permits it; otherwise return a dry preview.",
        inputSchema: calendarUpdateEventSchema,
        annotations: { readOnlyHint: false, destructiveHint: true }
    }, async (args) => safe(() => calendar.updateEvent(args)));
    server.registerTool("calendar_delete_event", {
        title: "Delete Apple Calendar event",
        description: "Delete an Apple Calendar.app event or exclude one occurrence when the shared write policy permits it.",
        inputSchema: calendarDeleteEventSchema,
        annotations: { readOnlyHint: false, destructiveHint: true }
    }, async (args) => safe(() => calendar.deleteEvent(args)));
    server.registerTool("calendar_show_event", {
        title: "Show Apple Calendar event",
        description: "Open Apple Calendar.app and show the selected event.",
        inputSchema: calendarShowEventSchema,
        annotations: { readOnlyHint: true }
    }, async (args) => safe(() => calendar.showEvent(args)));
}
async function safe(callback) {
    try {
        return jsonResponse(await callback());
    }
    catch (error) {
        return errorResponse(error);
    }
}
//# sourceMappingURL=tools.js.map