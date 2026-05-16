import { z } from "zod";
export declare const remindersListListsSchema: z.ZodObject<{
    maxCountPerList: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>;
export declare const remindersSearchSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    list: z.ZodOptional<z.ZodString>;
    completed: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        all: "all";
        completed: "completed";
        incomplete: "incomplete";
    }>>>;
    dueSince: z.ZodOptional<z.ZodString>;
    dueBefore: z.ZodOptional<z.ZodString>;
    remindSince: z.ZodOptional<z.ZodString>;
    remindBefore: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<{
        none: "none";
        low: "low";
        medium: "medium";
        high: "high";
    }>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxScanPerList: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>;
export declare const remindersReadSchema: z.ZodObject<{
    handles: z.ZodArray<z.ZodString>;
    maxBodyChars: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export declare const remindersCreateSchema: z.ZodObject<{
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    name: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    list: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    remindMeDate: z.ZodOptional<z.ZodString>;
    alarmDates: z.ZodOptional<z.ZodArray<z.ZodString>>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        none: "none";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    url: z.ZodOptional<z.ZodString>;
    recurrence: z.ZodOptional<z.ZodObject<{
        frequency: z.ZodEnum<{
            daily: "daily";
            weekly: "weekly";
            monthly: "monthly";
            yearly: "yearly";
        }>;
        interval: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        endDate: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export declare const remindersUpdateSchema: z.ZodObject<{
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    handle: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    list: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    remindMeDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    alarmDates: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    priority: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        none: "none";
        low: "low";
        medium: "medium";
        high: "high";
    }>>>;
    url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    recurrence: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        frequency: z.ZodEnum<{
            daily: "daily";
            weekly: "weekly";
            monthly: "monthly";
            yearly: "yearly";
        }>;
        interval: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        endDate: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    completed: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const remindersCompleteSchema: z.ZodObject<{
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    handles: z.ZodArray<z.ZodString>;
    completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export declare const remindersWriteSchema: z.ZodObject<{
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    handles: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const remindersMoveSchema: z.ZodObject<{
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    handles: z.ZodArray<z.ZodString>;
    list: z.ZodString;
}, z.core.$strict>;
