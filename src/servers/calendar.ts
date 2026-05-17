#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CalendarService } from "../calendar/calendarService.js";
import { SwiftCalendarBridge } from "../calendar/swiftCalendarBridge.js";
import { getRuntimeConfig } from "../config.js";
import { AppleScriptPermissionBootstrap, OsascriptRunner } from "../permissions/appleScriptBootstrap.js";
import { PermissionsService } from "../permissions/permissionsService.js";
import { registerAppleCalendarServerTools } from "./register.js";

const config = getRuntimeConfig(process.env, "calendar");
const calendar = new CalendarService(new SwiftCalendarBridge({ timeoutMs: config.helperTimeoutMs }), config);
const appleScript = new AppleScriptPermissionBootstrap(new OsascriptRunner(config.helperTimeoutMs));

const server = new McpServer({
  name: "apple-calendar",
  version: "0.2.0"
});

registerAppleCalendarServerTools(
  server,
  calendar,
  new PermissionsService({
    service: "calendar",
    appleScript,
    nextStep:
      "After accepting the Calendar prompt, open System Settings > Privacy & Security > Calendars and enable Full Access for Codex or the apple-calendar helper entry shown by macOS before using Calendar tools."
  })
);

await server.connect(new StdioServerTransport());
