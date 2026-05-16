export type ReminderPriority = "none" | "low" | "medium" | "high";
export type ReminderRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";
export interface ReminderRecurrence {
    frequency: ReminderRecurrenceFrequency;
    interval?: number;
    endDate?: string;
}
export interface ReminderList {
    id: string;
    name: string;
    reminderCount: number;
}
export interface ReminderSummary {
    handle: string;
    id: string;
    listId: string;
    listName: string;
    name: string;
    completed: boolean;
    completionDate?: string;
    dueDate?: string;
    remindMeDate?: string;
    priority: ReminderPriority;
    creationDate?: string;
    modificationDate?: string;
    url?: string;
    alarmDates?: string[];
    recurrence?: ReminderRecurrence;
    score?: number;
}
export interface ReminderBody extends ReminderSummary {
    body: string;
    truncated: boolean;
}
