export interface MailAccount {
    name: string;
    emailAddresses: string[];
    mailboxes: string[];
}
export interface MessageHandlePayload {
    account: string;
    mailbox: string;
    id: number;
}
export interface MailMessageSummary {
    handle: string;
    account: string;
    mailbox: string;
    id: number;
    subject: string;
    sender: string;
    dateReceived?: string;
    dateSent?: string;
    read: boolean;
    flagged: boolean;
    size?: number;
    score?: number;
}
export interface MailMessageBody extends MailMessageSummary {
    content: string;
    truncated: boolean;
    attachments: Array<{
        name: string;
    }>;
}
export interface SearchMessagesInput {
    query?: string;
    account?: string;
    mailbox?: string;
    scope?: "inbox" | "all" | "mailbox";
    unreadOnly?: boolean;
    since?: string;
    before?: string;
    includeTrash?: boolean;
    limit: number;
    maxScanPerMailbox: number;
}
export interface RawMessageSummary extends Omit<MailMessageSummary, "handle"> {
    handle: MessageHandlePayload;
}
export interface RawMessageBody extends Omit<MailMessageBody, "handle"> {
    handle: MessageHandlePayload;
}
