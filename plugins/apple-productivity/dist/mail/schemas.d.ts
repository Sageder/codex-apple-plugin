import { z } from "zod";
export declare const mailSearchSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    account: z.ZodOptional<z.ZodString>;
    mailbox: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        archive: "archive";
        inbox: "inbox";
        sent: "sent";
        trash: "trash";
        junk: "junk";
        all: "all";
        mailbox: "mailbox";
    }>>>;
    sender: z.ZodOptional<z.ZodString>;
    recipient: z.ZodOptional<z.ZodString>;
    participant: z.ZodOptional<z.ZodString>;
    unreadOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    since: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    includeTrash: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxScanPerMailbox: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const mailRetrieveContextSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    account: z.ZodOptional<z.ZodString>;
    mailbox: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        archive: "archive";
        inbox: "inbox";
        sent: "sent";
        trash: "trash";
        junk: "junk";
        all: "all";
        mailbox: "mailbox";
    }>>>;
    sender: z.ZodOptional<z.ZodString>;
    recipient: z.ZodOptional<z.ZodString>;
    participant: z.ZodOptional<z.ZodString>;
    unreadOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    since: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    includeTrash: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxScanPerMailbox: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    topK: z.ZodOptional<z.ZodNumber>;
    maxBodyChars: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const mailReadSchema: z.ZodObject<{
    handles: z.ZodArray<z.ZodString>;
    maxBodyChars: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const mailComposeSchema: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodArray<z.ZodString>;
    cc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject: z.ZodString;
    body: z.ZodString;
    visible: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const mailSendSchema: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodArray<z.ZodString>;
    cc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject: z.ZodString;
    body: z.ZodString;
    visible: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const mailWriteSchema: z.ZodObject<{
    handles: z.ZodArray<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const mailMoveSchema: z.ZodObject<{
    handles: z.ZodArray<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
    targetRole: z.ZodOptional<z.ZodEnum<{
        archive: "archive";
        inbox: "inbox";
        trash: "trash";
        junk: "junk";
    }>>;
    targetMailbox: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const mailUndoMoveSchema: z.ZodObject<{
    undoTokens: z.ZodArray<z.ZodString>;
    confirm: z.ZodOptional<z.ZodBoolean>;
    dryRun: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
