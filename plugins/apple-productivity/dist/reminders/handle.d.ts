export interface ReminderHandlePayload {
    listId: string;
    listName: string;
    id: string;
}
export declare function encodeReminderHandle(payload: ReminderHandlePayload): string;
export declare function decodeReminderHandle(handle: string): ReminderHandlePayload;
