import { z } from "zod";

const optionalDate = z.string().datetime().optional();
const maxTextChars = z.number().int().min(0).max(100000).optional();

export const messagesServiceSchema = z.enum(["iMessage", "SMS"]).optional();

export const messagesListChatsSchema = z
  .object({
    query: z.string().optional().describe("Match chat display names, chat identifiers, or participant handles."),
    participant: z.string().optional().describe("Match a phone number, email address, or participant fragment."),
    service: messagesServiceSchema,
    limit: z.number().int().positive().max(100).optional().default(20)
  })
  .strict();

export const messagesFetchNewSchema = z
  .object({
    since: optionalDate,
    before: optionalDate,
    participant: z.string().optional().describe("Match a phone number, email address, or participant fragment."),
    chatHandle: z.string().optional().describe("Limit results to a chat handle returned by messages_list_chats."),
    service: messagesServiceSchema,
    unreadOnly: z.boolean().optional().describe("Defaults to true unless includeSent is true."),
    includeSent: z.boolean().optional().default(false),
    limit: z.number().int().positive().max(100).optional().default(20),
    maxTextChars
  })
  .strict();

export const messagesSearchSchema = z
  .object({
    query: z.string().optional().describe("Search message text, chat display names, chat identifiers, and handles."),
    participant: z.string().optional().describe("Match a phone number, email address, or participant fragment."),
    chatHandle: z.string().optional().describe("Limit results to a chat handle returned by messages_list_chats."),
    service: messagesServiceSchema,
    direction: z.enum(["all", "incoming", "outgoing"]).optional().default("all"),
    unreadOnly: z.boolean().optional().default(false),
    since: optionalDate,
    before: optionalDate,
    limit: z.number().int().positive().max(100).optional().default(20),
    maxTextChars
  })
  .strict();

export const messagesReadSchema = z
  .object({
    handles: z.array(z.string()).min(1).max(50).optional(),
    chatHandle: z.string().optional().describe("Read recent messages from a chat handle returned by messages_list_chats."),
    since: optionalDate,
    before: optionalDate,
    direction: z.enum(["all", "incoming", "outgoing"]).optional().default("all"),
    limit: z.number().int().positive().max(100).optional().default(25),
    maxTextChars
  })
  .strict()
  .refine((value) => Boolean(value.handles?.length) !== Boolean(value.chatHandle), {
    message: "Provide exactly one of handles or chatHandle."
  });

export const messagesSendSchema = z
  .object({
    recipient: z.string().min(1).describe("Phone number or Apple ID email address."),
    text: z.string().min(1),
    service: messagesServiceSchema,
    confirm: z.boolean().optional(),
    dryRun: z.boolean().optional()
  })
  .strict();
