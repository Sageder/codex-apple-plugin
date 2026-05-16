import { AppleBridge } from "../appleBridge.js";
import type { RuntimeConfig } from "../config.js";
import type { MailAccount, MailMessageBody, MailMessageSummary } from "./types.js";
export interface MailSearchArgs {
    query?: string;
    account?: string;
    mailbox?: string;
    scope?: "inbox" | "all" | "mailbox";
    unreadOnly?: boolean;
    since?: string;
    before?: string;
    includeTrash?: boolean;
    limit?: number;
    maxScanPerMailbox?: number;
}
export interface MailReadArgs {
    handles: string[];
    maxBodyChars?: number;
}
export interface MailComposeArgs {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    visible?: boolean;
}
export interface MailWriteArgs {
    handles: string[];
    confirm?: boolean;
    dryRun?: boolean;
}
export declare class MailService {
    private readonly bridge;
    private readonly config;
    constructor(bridge: AppleBridge, config: RuntimeConfig);
    listAccounts(): Promise<{
        accounts: MailAccount[];
    }>;
    search(args: MailSearchArgs): Promise<{
        messages: MailMessageSummary[];
    }>;
    retrieveContext(args: MailSearchArgs & {
        topK?: number;
        maxBodyChars?: number;
    }): Promise<{
        query: string;
        candidates: number;
        snippets: import("./retrieval.js").RetrievalSnippet[];
    }>;
    read(args: MailReadArgs): Promise<{
        messages: MailMessageBody[];
    }>;
    compose(args: MailComposeArgs): Promise<unknown>;
    send(args: MailComposeArgs & {
        confirm?: boolean;
        dryRun?: boolean;
    }): Promise<unknown>;
    archive(args: MailWriteArgs): Promise<unknown>;
    delete(args: MailWriteArgs): Promise<unknown>;
    private moveRole;
}
