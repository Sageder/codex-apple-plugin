import { z } from "zod";
export declare const calendarAlarmSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodEnum<{
        display: "display";
        sound: "sound";
    }>>;
    triggerInterval: z.ZodOptional<z.ZodNumber>;
    triggerDate: z.ZodOptional<z.ZodString>;
    soundName: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const calendarSearchEventsSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    calendarId: z.ZodOptional<z.ZodString>;
    calendarName: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    includeCancelled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>;
export declare const calendarReadEventSchema: z.ZodObject<{
    handle: z.ZodString;
}, z.core.$strict>;
export declare const calendarCreateEventSchema: z.ZodObject<{
    summary: z.ZodString;
    start: z.ZodString;
    end: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    recurrence: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        cancelled: "cancelled";
        confirmed: "confirmed";
        none: "none";
        tentative: "tentative";
    }>>;
    alarms: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<{
            display: "display";
            sound: "sound";
        }>>;
        triggerInterval: z.ZodOptional<z.ZodNumber>;
        triggerDate: z.ZodOptional<z.ZodString>;
        soundName: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    attendees: z.ZodOptional<z.ZodNever>;
    allDay: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    calendarId: z.ZodOptional<z.ZodString>;
    calendarName: z.ZodOptional<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const calendarUpdateEventSchema: z.ZodObject<{
    handle: z.ZodString;
    span: z.ZodEnum<{
        this: "this";
        all: "all";
    }>;
    patch: z.ZodObject<{
        summary: z.ZodOptional<z.ZodString>;
        start: z.ZodOptional<z.ZodString>;
        end: z.ZodOptional<z.ZodString>;
        allDay: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
        location: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        notes: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        url: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        recurrence: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
            cancelled: "cancelled";
            confirmed: "confirmed";
            none: "none";
            tentative: "tentative";
        }>>>;
        alarms: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodDefault<z.ZodEnum<{
                display: "display";
                sound: "sound";
            }>>;
            triggerInterval: z.ZodOptional<z.ZodNumber>;
            triggerDate: z.ZodOptional<z.ZodString>;
            soundName: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>>;
        attendees: z.ZodOptional<z.ZodOptional<z.ZodNever>>;
    }, z.core.$strict>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const calendarDeleteEventSchema: z.ZodObject<{
    handle: z.ZodString;
    span: z.ZodEnum<{
        this: "this";
        all: "all";
    }>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const calendarShowEventSchema: z.ZodObject<{
    handle: z.ZodString;
}, z.core.$strict>;
