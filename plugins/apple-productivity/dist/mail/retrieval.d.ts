import type { MailMessageBody, MailMessageSummary } from "./types.js";
export interface RetrievalSnippet {
    handle: string;
    subject: string;
    sender: string;
    recipients: string[];
    dateReceived?: string;
    dateSent?: string;
    mailbox: string;
    score: number;
    reason: string;
    snippet: string;
}
export declare function tokenize(value: string): string[];
export declare function scoreSummary(message: MailMessageSummary, query: string): number;
export declare function chunkText(content: string, maxChars?: number): string[];
export declare function rankContext(messages: MailMessageBody[], query: string, topK: number): RetrievalSnippet[];
