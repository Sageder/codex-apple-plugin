#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRuntimeConfig } from "../config.js";
import { MailService } from "../mail/mailService.js";
import { AppleScriptPermissionBootstrap, OsascriptRunner } from "../permissions/appleScriptBootstrap.js";
import { PermissionsService, summarizeMailPermission } from "../permissions/permissionsService.js";
import { SwiftBridge } from "../swiftBridge.js";
import { registerAppleMailServerTools } from "./register.js";

const config = getRuntimeConfig(process.env, "mail");
const bridge = new SwiftBridge({ timeoutMs: config.helperTimeoutMs });
const mail = new MailService(bridge, config);
const appleScript = new AppleScriptPermissionBootstrap(new OsascriptRunner(config.helperTimeoutMs));

const server = new McpServer({
  name: "apple-mail",
  version: "0.2.0"
});

registerAppleMailServerTools(
  server,
  mail,
  new PermissionsService({
    service: "mail",
    nativeAction: "mail.requestPermission",
    appleScript,
    nativeProbe: () => mail.requestPermission(),
    summarizeNative: summarizeMailPermission,
    nextStep:
      "Approve the macOS Automation prompt for Mail, or enable Codex for Mail in System Settings > Privacy & Security > Automation."
  })
);

await server.connect(new StdioServerTransport());
