import { AppleBridge } from "../appleBridge.js";
import type { RuntimeConfig } from "../config.js";
import type { MailAccount, MailboxInfo, MailMoveRole, MailMessageBody, MailMessageSummary } from "./types.js";
export interface MailSearchArgs {
    query?: string;
    subject?: string;
    account?: string;
    mailbox?: string;
    scope?: "inbox" | "sent" | "archive" | "trash" | "junk" | "all" | "mailbox";
    sender?: string;
    recipient?: string;
    participant?: string;
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
    from?: string;
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
export interface MailMoveArgs extends MailWriteArgs {
    targetRole?: MailMoveRole;
    targetMailbox?: string;
}
export interface MailUndoMoveArgs {
    undoTokens: string[];
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
    listMailboxes(): Promise<{
        mailboxes: MailboxInfo[];
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
    archive(args: MailWriteArgs): Promise<{
        mode: import("../config.js").WriteMode;
        moved: boolean;
        targetRole: MailMoveRole | undefined;
        targetMailbox: string | undefined;
        count: number;
        targets: import("./types.js").MessageHandlePayload[];
        reason: string;
    } | {
        moved: {
            handle: string;
            previousHandle: string;
            undoToken: string;
            id: number;
            messageId?: string;
            account: string;
            fromMailbox: string;
            toMailbox: string;
        }[];
        mode?: undefined;
        targetRole?: undefined;
        targetMailbox?: undefined;
        count?: undefined;
        targets?: undefined;
        reason?: undefined;
    }>;
    delete(args: MailWriteArgs): Promise<{
        mode: import("../config.js").WriteMode;
        moved: boolean;
        targetRole: MailMoveRole | undefined;
        targetMailbox: string | undefined;
        count: number;
        targets: import("./types.js").MessageHandlePayload[];
        reason: string;
    } | {
        moved: {
            handle: string;
            previousHandle: string;
            undoToken: string;
            id: number;
            messageId?: string;
            account: string;
            fromMailbox: string;
            toMailbox: string;
        }[];
        mode?: undefined;
        targetRole?: undefined;
        targetMailbox?: undefined;
        count?: undefined;
        targets?: undefined;
        reason?: undefined;
    }>;
    moveToJunk(args: MailWriteArgs): Promise<{
        mode: import("../config.js").WriteMode;
        moved: boolean;
        targetRole: MailMoveRole | undefined;
        targetMailbox: string | undefined;
        count: number;
        targets: import("./types.js").MessageHandlePayload[];
        reason: string;
    } | {
        moved: {
            handle: string;
            previousHandle: string;
            undoToken: string;
            id: number;
            messageId?: string;
            account: string;
            fromMailbox: string;
            toMailbox: string;
        }[];
        mode?: undefined;
        targetRole?: undefined;
        targetMailbox?: undefined;
        count?: undefined;
        targets?: undefined;
        reason?: undefined;
    }>;
    move(args: MailMoveArgs, action?: "archive" | "delete" | "move"): Promise<{
        mode: import("../config.js").WriteMode;
        moved: boolean;
        targetRole: MailMoveRole | undefined;
        targetMailbox: string | undefined;
        count: number;
        targets: import("./types.js").MessageHandlePayload[];
        reason: string;
    } | {
        moved: {
            handle: string;
            previousHandle: string;
            undoToken: string;
            id: number;
            messageId?: string;
            account: string;
            fromMailbox: string;
            toMailbox: string;
        }[];
        mode?: undefined;
        targetRole?: undefined;
        targetMailbox?: undefined;
        count?: undefined;
        targets?: undefined;
        reason?: undefined;
    }>;
    undoMove(args: MailUndoMoveArgs): Promise<{
        mode: import("../config.js").WriteMode;
        moved: boolean;
        count: number;
        targets: import("./types.js").MailUndoToken[];
        reason: string;
    } | {
        moved: {
            handle: string;
            previousHandle: string;
            undoToken: string;
            id: number;
            messageId?: string;
            account: string;
            fromMailbox: string;
            toMailbox: string;
        }[];
        mode?: undefined;
        count?: undefined;
        targets?: undefined;
        reason?: undefined;
    }>;
}
