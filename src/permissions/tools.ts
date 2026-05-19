import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse, jsonResponse } from "../toolResponse.js";
import type { RequestServicePermissionArgs } from "./schemas.js";
import { requestServicePermissionSchema } from "./schemas.js";

interface PermissionRequester {
  request(args?: RequestServicePermissionArgs): Promise<unknown>;
}

export function registerMailPermissionTool(server: McpServer, permissions: PermissionRequester): void {
  registerPermissionTool(
    server,
    "mail_request_permissions",
    "Request Apple Mail permissions",
    "First-run setup tool that triggers macOS Apple Mail Automation permission prompts through a metadata-only AppleScript probe, then verifies native Mail access.",
    permissions
  );
}

export function registerCalendarPermissionTool(server: McpServer, permissions: PermissionRequester): void {
  registerPermissionTool(
    server,
    "calendar_request_permissions",
    "Request Apple Calendar permissions",
    "First-run setup tool that triggers macOS Apple Calendar permission prompts through a metadata-only AppleScript probe, then tells the user to enable Full Access before using Calendar tools.",
    permissions
  );
}

export function registerRemindersPermissionTool(server: McpServer, permissions: PermissionRequester): void {
  registerPermissionTool(
    server,
    "reminders_request_permissions",
    "Request Apple Reminders permissions",
    "First-run setup tool that triggers macOS Apple Reminders permission prompts through a metadata-only AppleScript probe, then verifies native Reminders access.",
    permissions
  );
}

export function registerMessagesPermissionTool(server: McpServer, permissions: PermissionRequester): void {
  registerPermissionTool(
    server,
    "messages_request_permissions",
    "Request Apple Messages permissions",
    "First-run setup tool that triggers macOS Apple Messages Automation permission prompts through a metadata-only AppleScript probe, then verifies read-only Messages database access. Full Disk Access cannot be auto-prompted by macOS; failures include manual setup steps.",
    permissions
  );
}

export function registerNotesPermissionTool(server: McpServer, permissions: PermissionRequester): void {
  registerPermissionTool(
    server,
    "notes_request_permissions",
    "Request Apple Notes permissions",
    "First-run setup tool that triggers macOS Apple Notes Automation permission prompts through a metadata-only AppleScript probe, then verifies local Notes access.",
    permissions
  );
}

function registerPermissionTool(
  server: McpServer,
  name: string,
  title: string,
  description: string,
  permissions: PermissionRequester
): void {
  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema: requestServicePermissionSchema,
      annotations: { readOnlyHint: true, destructiveHint: false }
    },
    async (args) => {
      try {
        return jsonResponse(await permissions.request(args));
      } catch (error) {
        return errorResponse(error) as ReturnType<typeof jsonResponse>;
      }
    }
  );
}
