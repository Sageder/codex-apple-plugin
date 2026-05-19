import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CalendarService } from "../calendar/calendarService.js";
import { registerCalendarTools } from "../calendar/tools.js";
import type { MailService } from "../mail/mailService.js";
import { registerMailTools } from "../mail/tools.js";
import type { MessagesService } from "../messages/messagesService.js";
import { registerMessagesTools } from "../messages/tools.js";
import type { NotesService } from "../notes/notesService.js";
import { registerNotesTools } from "../notes/tools.js";
import {
  registerCalendarPermissionTool,
  registerMessagesPermissionTool,
  registerMailPermissionTool,
  registerNotesPermissionTool,
  registerRemindersPermissionTool
} from "../permissions/tools.js";
import type { RequestServicePermissionArgs } from "../permissions/schemas.js";
import type { RemindersService } from "../reminders/remindersService.js";
import { registerRemindersTools } from "../reminders/tools.js";

interface PermissionRequester {
  request(args?: RequestServicePermissionArgs): Promise<unknown>;
}

export function registerAppleMailServerTools(
  server: McpServer,
  mail: MailService,
  permissions: PermissionRequester
): void {
  registerMailPermissionTool(server, permissions);
  registerMailTools(server, mail);
}

export function registerAppleCalendarServerTools(
  server: McpServer,
  calendar: CalendarService,
  permissions: PermissionRequester
): void {
  registerCalendarPermissionTool(server, permissions);
  registerCalendarTools(server, calendar);
}

export function registerAppleRemindersServerTools(
  server: McpServer,
  reminders: RemindersService,
  permissions: PermissionRequester
): void {
  registerRemindersPermissionTool(server, permissions);
  registerRemindersTools(server, reminders);
}

export function registerAppleMessagesServerTools(
  server: McpServer,
  messages: MessagesService,
  permissions: PermissionRequester
): void {
  registerMessagesPermissionTool(server, permissions);
  registerMessagesTools(server, messages);
}

export function registerAppleNotesServerTools(
  server: McpServer,
  notes: NotesService,
  permissions: PermissionRequester
): void {
  registerNotesPermissionTool(server, permissions);
  registerNotesTools(server, notes);
}
