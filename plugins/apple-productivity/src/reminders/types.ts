export type ReminderPriority = "none" | "low" | "medium" | "high";

export interface ReminderList {
  id: string;
  name: string;
  reminderCount: number;
}

export interface ReminderHandlePayload {
  listId: string;
  listName: string;
  id: string;
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
  score?: number;
}

export interface ReminderBody extends ReminderSummary {
  body: string;
  truncated: boolean;
}

export interface SearchRemindersInput {
  query?: string;
  list?: string;
  completed?: "all" | "completed" | "incomplete";
  dueSince?: string;
  dueBefore?: string;
  remindSince?: string;
  remindBefore?: string;
  priority?: ReminderPriority;
  limit: number;
  maxScanPerList: number;
}

export interface RawReminderSummary extends Omit<ReminderSummary, "handle"> {
  handle: ReminderHandlePayload;
}

export interface RawReminderBody extends Omit<ReminderBody, "handle"> {
  handle: ReminderHandlePayload;
}
