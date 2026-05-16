import { z } from "zod";
export declare const mailSearchSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    account: z.ZodOptional<z.ZodString>;
    mailbox: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        inbox: "inbox";
        all: "all";
        mailbox: "mailbox";
    }>>>;
    unreadOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    since: z.ZodOptional<z.ZodString>;
    before: z.ZodOptional<z.ZodString>;
    includeTrash: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxScanPerMailbox: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const mailRetrieveContextSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    account: z.ZodOptional<z.ZodString>;
    mailbox: z.ZodOptional<z.ZodString>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        inbox: "inbox";
        all: "all";
        mailbox: "mailbox";
    }>>>;
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
    to: z.ZodArray<z.ZodString>;
    cc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject: z.ZodString;
    body: z.ZodString;
    visible: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const mailSendSchema: z.ZodObject<{
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
