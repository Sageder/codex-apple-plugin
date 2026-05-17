#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRuntimeConfig } from "../config.js";
import { AppleScriptPermissionBootstrap, OsascriptRunner } from "../permissions/appleScriptBootstrap.js";
import { PermissionsService, summarizeAccessStatus } from "../permissions/permissionsService.js";
import { RemindersNativeBridge } from "../reminders/nativeBridge.js";
import { RemindersService } from "../reminders/remindersService.js";
import { registerAppleRemindersServerTools } from "./register.js";

const config = getRuntimeConfig(process.env, "reminders");
const reminders = new RemindersService(new RemindersNativeBridge({ timeoutMs: config.helperTimeoutMs }), config);
const appleScript = new AppleScriptPermissionBootstrap(new OsascriptRunner(config.helperTimeoutMs));

const server = new McpServer({
  name: "apple-reminders",
  version: "0.2.0"
});

registerAppleRemindersServerTools(
  server,
  reminders,
  new PermissionsService({
    service: "reminders",
    nativeAction: "requestAccess",
    appleScript,
    nativeProbe: () => reminders.requestAccess(),
    summarizeNative: summarizeAccessStatus,
    nextStep:
      "Approve the macOS Reminders prompt, or enable Codex in System Settings > Privacy & Security > Reminders."
  })
);

await server.connect(new StdioServerTransport());
