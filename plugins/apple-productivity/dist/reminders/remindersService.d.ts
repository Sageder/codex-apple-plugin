import type { RuntimeConfig } from "../config.js";
import type { RemindersBackend } from "./nativeBridge.js";
import type { ReminderBody, ReminderList, ReminderPriority, ReminderRecurrence, ReminderSummary } from "./types.js";
export interface RemindersListListsArgs {
    maxCountPerList?: number;
}
export interface RemindersSearchArgs {
    query?: string;
    list?: string;
    completed?: "all" | "completed" | "incomplete";
    scheduled?: "all" | "scheduled" | "unscheduled";
    scheduledSince?: string;
    scheduledBefore?: string;
    dueSince?: string;
    dueBefore?: string;
    remindSince?: string;
    remindBefore?: string;
    priority?: ReminderPriority;
    sort?: "relevance" | "scheduled";
    limit?: number;
    maxScanPerList?: number;
}
export interface RemindersReadArgs {
    handles: string[];
    maxBodyChars?: number;
}
export interface RemindersCreateArgs {
    name: string;
    body?: string;
    list?: string;
    dueDate?: string;
    remindMeDate?: string;
    alarmDates?: string[];
    priority?: ReminderPriority;
    url?: string;
    recurrence?: ReminderRecurrence;
    completed?: boolean;
    confirm?: boolean;
    dryRun?: boolean;
}
export interface RemindersUpdateArgs {
    handle: string;
    name?: string;
    body?: string | null;
    list?: string;
    dueDate?: string | null;
    remindMeDate?: string | null;
    alarmDates?: string[] | null;
    priority?: ReminderPriority | null;
    url?: string | null;
    recurrence?: ReminderRecurrence | null;
    completed?: boolean;
    confirm?: boolean;
    dryRun?: boolean;
}
export interface RemindersCompleteArgs {
    handles: string[];
    completed?: boolean;
    confirm?: boolean;
    dryRun?: boolean;
}
export interface RemindersWriteArgs {
    handles: string[];
    confirm?: boolean;
    dryRun?: boolean;
}
export interface RemindersMoveArgs extends RemindersWriteArgs {
    list: string;
}
export declare class RemindersService {
    private readonly backend;
    private readonly config;
    constructor(backend: RemindersBackend, config: RuntimeConfig);
    listLists(args?: RemindersListListsArgs): Promise<{
        lists: ReminderList[];
    }>;
    requestAccess(): Promise<{
        authorizationStatus: string;
    }>;
    search(args: RemindersSearchArgs): Promise<{
        reminders: ReminderSummary[];
    }>;
    read(args: RemindersReadArgs): Promise<{
        reminders: ReminderBody[];
    }>;
    create(args: RemindersCreateArgs): Promise<unknown>;
    update(args: RemindersUpdateArgs): Promise<unknown>;
    complete(args: RemindersCompleteArgs): Promise<unknown>;
    delete(args: RemindersWriteArgs): Promise<unknown>;
    move(args: RemindersMoveArgs): Promise<unknown>;
    private withWriteConfig;
}
