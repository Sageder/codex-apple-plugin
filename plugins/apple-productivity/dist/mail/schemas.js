import { z } from "zod";
const optionalDate = z.string().datetime().optional();
export const mailSearchSchema = z.object({
    query: z.string().optional().describe("Search terms for subject, sender, recipients, mailbox, or account metadata."),
    subject: z.string().optional().describe("Exact subject match. Prefer this when looking for a known message subject."),
    account: z.string().optional().describe("Optional Mail account name or email address."),
    mailbox: z.string().optional().describe("Exact mailbox name when scope is mailbox."),
    scope: z.enum(["inbox", "sent", "archive", "trash", "junk", "all", "mailbox"]).optional().default("inbox"),
    sender: z.string().optional().describe("Match sender name or address."),
    recipient: z.string().optional().describe("Match recipient name or address. Use this for questions like what did I send to someone."),
    participant: z.string().optional().describe("Match either sender or recipient name/address."),
    unreadOnly: z.boolean().optional().default(false),
    since: optionalDate,
    before: optionalDate,
    includeTrash: z.boolean().optional().default(false),
    limit: z.number().int().positive().max(100).optional().default(20),
    maxScanPerMailbox: z.number().int().positive().max(2000).optional().default(200)
});
export const mailRetrieveContextSchema = mailSearchSchema.extend({
    topK: z.number().int().positive().max(20).optional(),
    maxBodyChars: z.number().int().positive().max(100000).optional()
});
export const mailReadSchema = z.object({
    handles: z.array(z.string()).min(1).max(25),
    maxBodyChars: z.number().int().positive().max(100000).optional()
});
export const mailComposeSchema = z.object({
    from: z.string().email().optional().describe("Optional configured Apple Mail sender address."),
    to: z.array(z.string().email()).min(1),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    subject: z.string(),
    body: z.string(),
    visible: z.boolean().optional().default(true)
});
export const mailSendSchema = mailComposeSchema.extend({
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
});
export const mailWriteSchema = z.object({
    handles: z.array(z.string()).min(1).max(50),
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
});
export const mailMoveSchema = mailWriteSchema
    .extend({
    targetRole: z.enum(["inbox", "archive", "trash", "junk"]).optional(),
    targetMailbox: z.string().optional().describe("Exact target mailbox name on the same account.")
})
    .refine((value) => Boolean(value.targetRole) !== Boolean(value.targetMailbox), {
    message: "Provide exactly one of targetRole or targetMailbox."
});
export const mailUndoMoveSchema = z.object({
    undoTokens: z.array(z.string()).min(1).max(50),
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
});
//# sourceMappingURL=schemas.js.map