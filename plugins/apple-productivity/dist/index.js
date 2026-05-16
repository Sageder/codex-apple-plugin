#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AppleBridge } from "./appleBridge.js";
import { CalendarService } from "./calendar/calendarService.js";
import { SwiftCalendarBridge } from "./calendar/swiftCalendarBridge.js";
import { registerCalendarTools } from "./calendar/tools.js";
import { getRuntimeConfig } from "./config.js";
import { MailService } from "./mail/mailService.js";
import { registerMailTools } from "./mail/tools.js";
const config = getRuntimeConfig();
const bridge = new AppleBridge({ timeoutMs: config.osascriptTimeoutMs });
const server = new McpServer({
    name: "apple-productivity",
    version: "0.1.0"
});
registerMailTools(server, new MailService(bridge, config));
registerCalendarTools(server, new CalendarService(new SwiftCalendarBridge({ timeoutMs: config.osascriptTimeoutMs }), config));
await server.connect(new StdioServerTransport());
//# sourceMappingURL=index.js.map