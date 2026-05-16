import { AppleBridge } from "../appleBridge.js";
import type { RuntimeConfig } from "../config.js";
import type { RawReminderSummary, ReminderBody, ReminderHandlePayload, ReminderList, ReminderPriority, ReminderSummary } from "./types.js";
export interface RemindersListListsArgs {
    maxCountPerList?: number;
}
export interface RemindersSearchArgs {
    query?: string;
    list?: string;
    completed?: "all" | "completed" | "incomplete";
    dueSince?: string;
    dueBefore?: string;
    remindSince?: string;
    remindBefore?: string;
    priority?: ReminderPriority;
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
    priority?: ReminderPriority;
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
    priority?: ReminderPriority | null;
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
    private readonly bridge;
    private readonly config;
    constructor(bridge: AppleBridge, config: RuntimeConfig);
    listLists(args?: RemindersListListsArgs): Promise<{
        lists: ReminderList[];
    }>;
    search(args: RemindersSearchArgs): Promise<{
        reminders: ReminderSummary[];
    }>;
    read(args: RemindersReadArgs): Promise<{
        reminders: ReminderBody[];
    }>;
    create(args: RemindersCreateArgs): Promise<{
        reminder: ReminderBody;
        created: boolean;
        list: {
            listId: string;
            listName: string;
        };
    } | {
        mode: import("../config.js").WriteMode;
        created: boolean;
        preview: {
            name: string;
            bodyChars: number;
            list: string | null;
            dueDate: string | undefined;
            remindMeDate: string | undefined;
            priority: ReminderPriority;
            completed: boolean;
        };
        reason: string;
    }>;
    update(args: RemindersUpdateArgs): Promise<{
        reminder: ReminderBody;
        updated: boolean;
        moved: boolean;
        fromList?: {
            listId: string;
            listName: string;
        };
        toList?: {
            listId: string;
            listName: string;
        };
    } | {
        mode: import("../config.js").WriteMode;
        updated: boolean;
        target: ReminderHandlePayload;
        preview: {
            name: string | undefined;
            body: {
                bodyChars: number;
            } | null | undefined;
            list: string | undefined;
            dueDate: string | null | undefined;
            remindMeDate: string | null | undefined;
            priority: ReminderPriority | null | undefined;
            completed: boolean | undefined;
        };
        reason: string;
    }>;
    complete(args: RemindersCompleteArgs): Promise<{
        mode: import("../config.js").WriteMode;
        completed: boolean;
        requestedCompleted: boolean;
        count: number;
        targets: ReminderHandlePayload[];
        reason: string;
        reminders?: undefined;
    } | {
        completed: boolean;
        reminders: ReminderSummary[];
        mode?: undefined;
        requestedCompleted?: undefined;
        count?: undefined;
        targets?: undefined;
        reason?: undefined;
    }>;
    delete(args: RemindersWriteArgs): Promise<unknown>;
    move(args: RemindersMoveArgs): Promise<{
        moved: {
            reminder: ReminderSummary;
            moved: boolean;
            fromList: {
                listId: string;
                listName: string;
            };
            toList: {
                listId: string;
                listName: string;
            };
        }[];
    } | {
        mode: import("../config.js").WriteMode;
        moved: boolean;
        list: string;
        count: number;
        targets: ReminderHandlePayload[];
        reason: string;
    }>;
}
export declare function encodeReminderSummaryForTest(raw: RawReminderSummary): ReminderSummary;
export declare function decodeReminderHandleForTest(handle: string): ReminderHandlePayload;
