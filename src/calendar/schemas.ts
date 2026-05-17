import { z } from "zod";

const optionalDate = z.string().datetime().optional();
const requiredDate = z.string().datetime();

export const calendarAlarmSchema = z
  .object({
    type: z.enum(["display", "sound"]).default("display"),
    triggerInterval: z.number().int().optional(),
    triggerDate: optionalDate,
    soundName: z.string().optional()
  })
  .strict()
  .refine((alarm) => alarm.triggerInterval !== undefined || alarm.triggerDate !== undefined, {
    message: "Calendar alarms require triggerInterval or triggerDate"
  });

export const calendarSearchEventsSchema = z
  .object({
    query: z.string().optional().describe("Search terms for event summary, location, notes preview, calendar, URL, or attendee metadata."),
    calendarId: z.string().optional().describe("Calendar identifier returned by calendar_list_calendars."),
    calendarName: z.string().optional().describe("Exact Calendar.app calendar name."),
    from: requiredDate.optional().describe("Inclusive search window start. Defaults to start of today."),
    to: requiredDate.optional().describe("Inclusive search window end. Defaults to 30 days after from."),
    includeCancelled: z.boolean().optional().default(false),
    limit: z.number().int().positive().max(200).optional().default(50)
  })
  .strict();

export const calendarReadEventSchema = z
  .object({
    handle: z.string()
  })
  .strict();

const eventFieldsSchema = z
  .object({
    summary: z.string().min(1),
    start: requiredDate,
    end: requiredDate,
    allDay: z.boolean().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    url: z.string().url().optional(),
    recurrence: z.string().optional().describe("Simple iCalendar RRULE recurrence string accepted by the Swift/EventKit helper."),
    status: z.enum(["cancelled", "confirmed", "none", "tentative"]).optional(),
    alarms: z.array(calendarAlarmSchema).max(10).optional(),
    attendees: z.never().optional().describe("Attendee mutation is not supported by EventKit in v1.")
  })
  .strict();

export const calendarCreateEventSchema = eventFieldsSchema
  .extend({
    allDay: z.boolean().optional().default(false),
    calendarId: z.string().optional().describe("Calendar identifier returned by calendar_list_calendars."),
    calendarName: z.string().optional().describe("Exact Calendar.app calendar name."),
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
  })
  .strict()
  .refine((input) => Boolean(input.calendarId || input.calendarName), {
    message: "calendarId or calendarName is required"
  })
  .refine((input) => new Date(input.end).getTime() >= new Date(input.start).getTime(), {
    message: "end must be at or after start"
  });

const eventPatchSchema = eventFieldsSchema
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "patch must include at least one event field"
  });

export const calendarUpdateEventSchema = z
  .object({
    handle: z.string(),
    span: z.enum(["this", "all"]),
    patch: eventPatchSchema,
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
  })
  .strict();

export const calendarDeleteEventSchema = z
  .object({
    handle: z.string(),
    span: z.enum(["this", "all"]),
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
  })
  .strict();

export const calendarShowEventSchema = calendarReadEventSchema;
