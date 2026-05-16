#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CalendarService } from "./calendar/calendarService.js";
import { SwiftCalendarBridge } from "./calendar/swiftCalendarBridge.js";
import { registerCalendarTools } from "./calendar/tools.js";
import { getRuntimeConfig } from "./config.js";
import { SwiftBridge } from "./swiftBridge.js";
import { MailService } from "./mail/mailService.js";
import { registerMailTools } from "./mail/tools.js";
import { RemindersNativeBridge } from "./reminders/nativeBridge.js";
import { RemindersService } from "./reminders/remindersService.js";
import { registerRemindersTools } from "./reminders/tools.js";

const config = getRuntimeConfig();
const bridge = new SwiftBridge({ timeoutMs: config.helperTimeoutMs });

const server = new McpServer({
  name: "apple-productivity",
  version: "0.1.0"
});

registerMailTools(server, new MailService(bridge, config));
registerCalendarTools(server, new CalendarService(new SwiftCalendarBridge({ timeoutMs: config.helperTimeoutMs }), config));
registerRemindersTools(server, new RemindersService(new RemindersNativeBridge({ timeoutMs: config.helperTimeoutMs }), config));

await server.connect(new StdioServerTransport());
