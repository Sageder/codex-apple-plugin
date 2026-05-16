import { z } from "zod";

const optionalDate = z.string().datetime().optional();

export const mailSearchSchema = z.object({
  query: z.string().optional().describe("Search terms for sender, subject, mailbox, or metadata."),
  account: z.string().optional().describe("Optional Mail account name or email address."),
  mailbox: z.string().optional().describe("Exact mailbox name when scope is mailbox."),
  scope: z.enum(["inbox", "all", "mailbox"]).optional().default("inbox"),
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

