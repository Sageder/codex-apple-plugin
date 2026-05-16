#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRuntimeConfig } from "./config.js";
import { SwiftBridge } from "./swiftBridge.js";
import { MailService } from "./mail/mailService.js";
import { registerMailTools } from "./mail/tools.js";
const config = getRuntimeConfig();
const bridge = new SwiftBridge({ timeoutMs: config.helperTimeoutMs });
const server = new McpServer({
    name: "apple-productivity",
    version: "0.1.0"
});
registerMailTools(server, new MailService(bridge, config));
await server.connect(new StdioServerTransport());
//# sourceMappingURL=index.js.map