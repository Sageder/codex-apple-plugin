import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse, jsonResponse } from "../toolResponse.js";
import type { MessagesService } from "./messagesService.js";
import {
  messagesFetchNewSchema,
  messagesListChatsSchema,
  messagesReadSchema,
  messagesSearchSchema,
  messagesSendSchema
} from "./schemas.js";

export function registerMessagesTools(server: McpServer, messages: MessagesService): void {
  server.registerTool(
    "messages_list_chats",
    {
      title: "List Apple Messages chats",
      description: "List recent Apple Messages chats from the local Messages database without returning message text.",
      inputSchema: messagesListChatsSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => messages.listChats(args))
  );

  server.registerTool(
    "messages_fetch_new",
    {
      title: "Fetch new Apple Messages",
      description:
        "Fetch recent Apple Messages, defaulting to unread incoming messages. Use maxTextChars: 0 for metadata-only checks.",
      inputSchema: messagesFetchNewSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => messages.fetchNew(args))
  );

  server.registerTool(
    "messages_search",
    {
      title: "Search Apple Messages",
      description:
        "Search local Apple Messages by message text, participant, service, chat, date window, direction, or unread status. Returns handles for follow-up reads.",
      inputSchema: messagesSearchSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => messages.search(args))
  );

  server.registerTool(
    "messages_read",
    {
      title: "Read Apple Messages",
      description: "Read selected Apple Messages by message handle, or recent messages from a chat handle, with text length limits.",
      inputSchema: messagesReadSchema,
      annotations: { readOnlyHint: true }
    },
    async (args) => safe(() => messages.read(args))
  );

  server.registerTool(
    "messages_send",
    {
      title: "Send Apple Message",
      description: "Send an Apple Message through Messages.app when the write guard permits it; otherwise return a metadata-only preview.",
      inputSchema: messagesSendSchema,
      annotations: { readOnlyHint: false, destructiveHint: true }
    },
    async (args) => safe(() => messages.send(args))
  );
}

async function safe<T>(callback: () => Promise<T>): Promise<ReturnType<typeof jsonResponse>> {
  try {
    return jsonResponse(await callback());
  } catch (error) {
    return errorResponse(error) as ReturnType<typeof jsonResponse>;
  }
}
