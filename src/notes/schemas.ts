import { z } from "zod";

const optionalDateString = z.string().min(1).optional().describe("ISO date or datetime string.");
const writeOptions = {
  confirm: z.boolean().optional(),
  dryRun: z.boolean().optional()
};
const folderTargetFields = {
  account: z.string().optional().describe("Apple Notes account name or identifier."),
  folder: z.string().optional().describe("Apple Notes folder name or slash-separated folder path."),
  folderHandle: z.string().optional().describe("Folder handle returned by notes_list_folders.")
};
const bodyFormatSchema = z.enum(["plain", "html"]).optional().default("plain");

export const notesListAccountsSchema = z
  .object({
    includeCounts: z.boolean().optional().default(true)
  })
  .strict();

export const notesListFoldersSchema = z
  .object({
    account: z.string().optional().describe("Filter by Apple Notes account name or identifier."),
    parentFolder: z.string().optional().describe("Optional parent folder name or slash-separated path."),
    parentFolderHandle: z.string().optional().describe("Optional parent folder handle returned by notes_list_folders."),
    includeCounts: z.boolean().optional().default(true),
    maxDepth: z.number().int().nonnegative().max(20).optional()
  })
  .strict();

export const notesSearchSchema = z
  .object({
    query: z.string().optional().describe("Search terms for title, plaintext body, account, folder, or attachment names."),
    title: z.string().optional().describe("Exact or partial note title filter."),
    account: z.string().optional().describe("Apple Notes account name or identifier."),
    folder: z.string().optional().describe("Apple Notes folder name or slash-separated folder path."),
    folderHandle: z.string().optional().describe("Folder handle returned by notes_list_folders."),
    createdSince: optionalDateString,
    createdBefore: optionalDateString,
    modifiedSince: optionalDateString,
    modifiedBefore: optionalDateString,
    includePasswordProtected: z.boolean().optional().default(false),
    sort: z.enum(["relevance", "modified", "created", "title"]).optional().default("relevance"),
    limit: z.number().int().positive().max(100).optional().default(20),
    maxScan: z.number().int().positive().max(5000).optional().default(1000),
    maxSnippetChars: z.number().int().nonnegative().max(5000).optional().default(500)
  })
  .strict();

export const notesReadSchema = z
  .object({
    handles: z.array(z.string()).min(1).max(50),
    format: z.enum(["text", "html", "both"]).optional().default("text"),
    includeAttachments: z.boolean().optional().default(true),
    maxBodyChars: z.number().int().positive().max(200000).optional()
  })
  .strict();

export const notesCreateFolderSchema = z
  .object({
    name: z.string().min(1),
    account: z.string().optional().describe("Apple Notes account name or identifier. Defaults to the Notes default account."),
    parentFolder: z.string().optional().describe("Optional parent folder name or slash-separated path."),
    parentFolderHandle: z.string().optional().describe("Optional parent folder handle returned by notes_list_folders."),
    ...writeOptions
  })
  .strict();

export const notesRenameFolderSchema = z
  .object({
    folderHandle: z.string(),
    name: z.string().min(1),
    ...writeOptions
  })
  .strict();

export const notesDeleteFolderSchema = z
  .object({
    folderHandle: z.string(),
    ...writeOptions
  })
  .strict();

export const notesCreateSchema = z
  .object({
    title: z.string().min(1),
    body: z.string().optional().default(""),
    bodyFormat: bodyFormatSchema,
    ...folderTargetFields,
    ...writeOptions
  })
  .strict();

export const notesUpdateSchema = z
  .object({
    handle: z.string(),
    title: z.string().min(1).optional(),
    body: z.string().nullable().optional(),
    bodyFormat: bodyFormatSchema,
    ...folderTargetFields,
    ...writeOptions
  })
  .strict();

export const notesAppendSchema = z
  .object({
    handle: z.string(),
    body: z.string().min(1),
    bodyFormat: bodyFormatSchema,
    separator: z.string().optional().default("\n"),
    ...writeOptions
  })
  .strict();

export const notesWriteSchema = z
  .object({
    handles: z.array(z.string()).min(1).max(50),
    ...writeOptions
  })
  .strict();

export const notesMoveSchema = z
  .object({
    handles: z.array(z.string()).min(1).max(50),
    ...folderTargetFields,
    ...writeOptions
  })
  .strict()
  .refine((value) => Boolean(value.folder || value.folderHandle), {
    message: "folder or folderHandle is required"
  });

export const notesShowSchema = z
  .object({
    handle: z.string(),
    separately: z.boolean().optional().default(false)
  })
  .strict();
