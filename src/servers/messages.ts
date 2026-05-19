#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRuntimeConfig } from "../config.js";
import { MessagesService } from "../messages/messagesService.js";
import { MessagesAppleScriptSender } from "../messages/sender.js";
import { SqliteMessagesStore } from "../messages/sqliteStore.js";
import { AppleScriptPermissionBootstrap, OsascriptRunner } from "../permissions/appleScriptBootstrap.js";
import { PermissionsService, summarizeMessagesPermission } from "../permissions/permissionsService.js";
import { registerAppleMessagesServerTools } from "./register.js";

const config = getRuntimeConfig(process.env, "messages");
const messages = new MessagesService(
  new SqliteMessagesStore({
    dbPath: config.messagesDatabasePath,
    timeoutMs: config.helperTimeoutMs
  }),
  new MessagesAppleScriptSender(config.helperTimeoutMs),
  config
);
const appleScript = new AppleScriptPermissionBootstrap(new OsascriptRunner(config.helperTimeoutMs));

const server = new McpServer({
  name: "apple-messages",
  version: "0.2.0"
});

registerAppleMessagesServerTools(
  server,
  messages,
  new PermissionsService({
    service: "messages",
    nativeAction: "messages.requestAccess",
    appleScript,
    nativeProbe: () => messages.requestAccess(),
    summarizeNative: summarizeMessagesPermission,
    nextStep:
      "Approve the macOS Automation prompt for Messages, and grant Full Disk Access to Codex or the launching terminal in System Settings > Privacy & Security > Full Disk Access so the read-only Messages database can be queried."
  })
);

await server.connect(new StdioServerTransport());
