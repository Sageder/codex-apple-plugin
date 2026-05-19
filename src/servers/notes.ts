#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getRuntimeConfig } from "../config.js";
import { NotesAppleScriptBridge } from "../notes/notesBridge.js";
import { NotesService } from "../notes/notesService.js";
import { AppleScriptPermissionBootstrap, OsascriptRunner } from "../permissions/appleScriptBootstrap.js";
import { PermissionsService, summarizeNotesPermission } from "../permissions/permissionsService.js";
import { registerAppleNotesServerTools } from "./register.js";

const config = getRuntimeConfig(process.env, "notes");
const notes = new NotesService(new NotesAppleScriptBridge({ timeoutMs: config.helperTimeoutMs }), config);
const appleScript = new AppleScriptPermissionBootstrap(new OsascriptRunner(config.helperTimeoutMs));

const server = new McpServer({
  name: "apple-notes",
  version: "0.2.0"
});

registerAppleNotesServerTools(
  server,
  notes,
  new PermissionsService({
    service: "notes",
    nativeAction: "notes.requestAccess",
    appleScript,
    nativeProbe: () => notes.requestAccess(),
    summarizeNative: summarizeNotesPermission,
    nextStep:
      "Approve the macOS Automation prompt for Notes, or enable Codex for Notes in System Settings > Privacy & Security > Automation."
  })
);

await server.connect(new StdioServerTransport());
