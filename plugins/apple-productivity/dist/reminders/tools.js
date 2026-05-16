import { errorResponse, jsonResponse } from "../toolResponse.js";
import { remindersCompleteSchema, remindersCreateSchema, remindersListListsSchema, remindersMoveSchema, remindersReadSchema, remindersSearchSchema, remindersUpdateSchema, remindersWriteSchema } from "./schemas.js";
export function registerRemindersTools(server, reminders) {
    server.registerTool("reminders_list_lists", {
        title: "List Apple Reminders lists",
        description: "List Apple Reminders lists and bounded reminder counts configured on this Mac.",
        inputSchema: remindersListListsSchema,
        annotations: { readOnlyHint: true }
    }, async (args) => safe(() => reminders.listLists(args)));
    server.registerTool("reminders_search", {
        title: "Search Apple Reminders",
        description: "Search live Apple Reminders metadata and return reminder handles for follow-up reads or actions. For nearest or upcoming scheduled reminders, use scheduled: scheduled, scheduledSince: now, sort: scheduled, and a small limit instead of putting words like nearest in query.",
        inputSchema: remindersSearchSchema,
        annotations: { readOnlyHint: true }
    }, async (args) => safe(() => reminders.search(args)));
    server.registerTool("reminders_read", {
        title: "Read Apple Reminders",
        description: "Read selected Apple Reminders by handle with notes/body length limits.",
        inputSchema: remindersReadSchema,
        annotations: { readOnlyHint: true }
    }, async (args) => safe(() => reminders.read(args)));
    server.registerTool("reminders_create", {
        title: "Create Apple Reminder",
        description: "Create an Apple Reminder when the write guard permits it; otherwise return a preview.",
        inputSchema: remindersCreateSchema,
        annotations: { readOnlyHint: false, destructiveHint: false }
    }, async (args) => safe(() => reminders.create(args)));
    server.registerTool("reminders_update", {
        title: "Update Apple Reminder",
        description: "Patch an Apple Reminder when the write guard permits it; otherwise return a preview.",
        inputSchema: remindersUpdateSchema,
        annotations: { readOnlyHint: false, destructiveHint: false }
    }, async (args) => safe(() => reminders.update(args)));
    server.registerTool("reminders_complete", {
        title: "Complete Apple Reminders",
        description: "Mark Apple Reminders complete or incomplete when the write guard permits it.",
        inputSchema: remindersCompleteSchema,
        annotations: { readOnlyHint: false, destructiveHint: false }
    }, async (args) => safe(() => reminders.complete(args)));
    server.registerTool("reminders_delete", {
        title: "Delete Apple Reminders",
        description: "Delete selected Apple Reminders when the write guard permits it.",
        inputSchema: remindersWriteSchema,
        annotations: { readOnlyHint: false, destructiveHint: true }
    }, async (args) => safe(() => reminders.delete(args)));
    server.registerTool("reminders_move", {
        title: "Move Apple Reminders",
        description: "Move selected Apple Reminders to another list when the write guard permits it.",
        inputSchema: remindersMoveSchema,
        annotations: { readOnlyHint: false, destructiveHint: false }
    }, async (args) => safe(() => reminders.move(args)));
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