import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse, jsonResponse } from "../toolResponse.js";
import { MailService } from "./mailService.js";
import {
  mailComposeSchema,
  mailReadSchema,
  mailRetrieveContextSchema,
  mailSearchSchema,
  mailSendSchema,
  mailWriteSchema
} from "./schemas.js";

export function registerMailTools(server: McpServer, mail: MailService): void {
  server.registerTool(
    "mail_list_accounts",
    {
      title: "List Apple Mail accounts",
      description: "List Apple Mail accounts, addresses, and mailbox names configured on this Mac.",
      annotations: { readOnlyHint: true }
    },
    async () => safe(() => mail.listAccounts())
  );

  server.registerTool(
    "mail_search",
    {
      title: "Search Apple Mail",
      description: "Search live Apple Mail metadata and return message handles for follow-up reads or actions.",
      inputSchema: mailSearchSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => mail.search(args))
  );

  server.registerTool(
    "mail_retrieve_context",
    {
      title: "Retrieve Apple Mail context",
      description: "Perform live RAG-style retrieval over Apple Mail by searching candidates, reading bodies in memory, and returning ranked useful snippets.",
      inputSchema: mailRetrieveContextSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => mail.retrieveContext(args))
  );

  server.registerTool(
    "mail_read",
    {
      title: "Read Apple Mail messages",
      description: "Read selected Apple Mail messages by handle with body length limits.",
      inputSchema: mailReadSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => mail.read(args))
  );

  server.registerTool(
    "mail_compose",
    {
      title: "Compose Apple Mail draft",
      description: "Create a visible Apple Mail compose window or draft.",
      inputSchema: mailComposeSchema,
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async (args) => safe(() => mail.compose(args))
  );

  server.registerTool(
    "mail_send",
    {
      title: "Send Apple Mail message",
      description: "Send an email through Apple Mail when the write guard permits it; otherwise draft or preview.",
      inputSchema: mailSendSchema,
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    async (args) => safe(() => mail.send(args))
  );

  server.registerTool(
    "mail_archive",
    {
      title: "Archive Apple Mail messages",
      description: "Move selected Apple Mail messages to the account archive mailbox when the write guard permits it.",
      inputSchema: mailWriteSchema,
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    async (args) => safe(() => mail.archive(args))
  );

  server.registerTool(
    "mail_delete",
    {
      title: "Delete Apple Mail messages",
      description: "Move selected Apple Mail messages to Trash or Deleted Items when the write guard permits it. This does not permanently expunge mail.",
      inputSchema: mailWriteSchema,
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    async (args) => safe(() => mail.delete(args))
  );
}

async function safe<T>(callback: () => Promise<T>): Promise<ReturnType<typeof jsonResponse>> {
  try {
    return jsonResponse(await callback());
  } catch (error) {
    return errorResponse(error) as ReturnType<typeof jsonResponse>;
  }
}

