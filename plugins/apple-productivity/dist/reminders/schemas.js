import { z } from "zod";
const optionalDateString = z.string().min(1).optional().describe("ISO date or datetime string.");
const nullableDateString = z.string().min(1).nullable().optional().describe("ISO date or datetime string, or null to clear.");
const reminderPrioritySchema = z.enum(["none", "low", "medium", "high"]);
const reminderRecurrenceSchema = z
    .object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().positive().max(999).optional().default(1),
    endDate: optionalDateString
})
    .strict();
const writeOptions = {
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
};
export const remindersListListsSchema = z
    .object({
    maxCountPerList: z.number().int().positive().max(10000).optional().default(2000)
})
    .strict();
export const remindersSearchSchema = z
    .object({
    query: z.string().optional().describe("Search terms for reminder title, notes, list, or URL."),
    list: z.string().optional().describe("Reminder list name or identifier."),
    completed: z.enum(["all", "completed", "incomplete"]).optional().default("incomplete"),
    scheduled: z
        .enum(["all", "scheduled", "unscheduled"])
        .optional()
        .describe("Filter by whether the reminder has either a due date or reminder alarm."),
    scheduledSince: optionalDateString.describe("Match reminders whose dueDate or remindMeDate is on or after this date."),
    scheduledBefore: optionalDateString.describe("Match reminders whose dueDate or remindMeDate is on or before this date."),
    dueSince: optionalDateString,
    dueBefore: optionalDateString,
    remindSince: optionalDateString,
    remindBefore: optionalDateString,
    priority: reminderPrioritySchema.optional(),
    sort: z
        .enum(["relevance", "scheduled"])
        .optional()
        .describe("Use scheduled for nearest/upcoming reminders; sorts by the nearest matching dueDate or remindMeDate."),
    limit: z.number().int().positive().max(100).optional().default(20),
    maxScanPerList: z.number().int().positive().max(2000).optional().default(200)
})
    .strict();
export const remindersReadSchema = z
    .object({
    handles: z.array(z.string()).min(1).max(50),
    maxBodyChars: z.number().int().positive().max(100000).optional()
})
    .strict();
export const remindersCreateSchema = z
    .object({
    name: z.string().min(1),
    body: z.string().optional(),
    list: z.string().optional().describe("Reminder list name or identifier. Falls back to configured/default list."),
    dueDate: optionalDateString,
    remindMeDate: optionalDateString,
    alarmDates: z.array(z.string().min(1)).max(10).optional(),
    priority: reminderPrioritySchema.optional().default("none"),
    url: z.string().url().optional(),
    recurrence: reminderRecurrenceSchema.optional(),
    completed: z.boolean().optional().default(false),
    ...writeOptions
})
    .strict();
export const remindersUpdateSchema = z
    .object({
    handle: z.string(),
    name: z.string().min(1).optional(),
    body: z.string().nullable().optional(),
    list: z.string().optional().describe("Move to this reminder list name or identifier after patching fields."),
    dueDate: nullableDateString,
    remindMeDate: nullableDateString,
    alarmDates: z.array(z.string().min(1)).max(10).nullable().optional(),
    priority: reminderPrioritySchema.nullable().optional(),
    url: z.string().url().nullable().optional(),
    recurrence: reminderRecurrenceSchema.nullable().optional(),
    completed: z.boolean().optional(),
    ...writeOptions
})
    .strict();
export const remindersCompleteSchema = z
    .object({
    handles: z.array(z.string()).min(1).max(50),
    completed: z.boolean().optional().default(true),
    ...writeOptions
})
    .strict();
export const remindersWriteSchema = z
    .object({
    handles: z.array(z.string()).min(1).max(50),
    ...writeOptions
})
    .strict();
export const remindersMoveSchema = z
    .object({
    handles: z.array(z.string()).min(1).max(50),
    list: z.string().min(1).describe("Destination reminder list name or identifier."),
    ...writeOptions
})
    .strict();
//# sourceMappingURL=schemas.js.map