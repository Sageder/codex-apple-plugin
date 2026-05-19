import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import {
  registerAppleCalendarServerTools,
  registerAppleMailServerTools,
  registerAppleMessagesServerTools,
  registerAppleNotesServerTools,
  registerAppleRemindersServerTools
} from "../servers/register.js";

function fakeServer() {
  const names: string[] = [];
  const server = {
    registerTool(name: string) {
      names.push(name);
    }
  } as unknown as McpServer;

  return { server, names };
}

describe("split plugin server registrations", () => {
  it("registers only Mail tools on the Apple Mail server", () => {
    const { server, names } = fakeServer();

    registerAppleMailServerTools(server, {} as never, { request: vi.fn() });

    expect(names).toEqual([
      "mail_request_permissions",
      "mail_list_accounts",
      "mail_list_mailboxes",
      "mail_search",
      "mail_retrieve_context",
      "mail_read",
      "mail_compose",
      "mail_send",
      "mail_move",
      "mail_undo_move",
      "mail_archive",
      "mail_delete",
      "mail_junk"
    ]);
    expect(names.every((name) => name.startsWith("mail_"))).toBe(true);
  });

  it("registers only Calendar tools on the Apple Calendar server", () => {
    const { server, names } = fakeServer();

    registerAppleCalendarServerTools(server, {} as never, { request: vi.fn() });

    expect(names).toEqual([
      "calendar_request_permissions",
      "calendar_list_calendars",
      "calendar_search_events",
      "calendar_read_event",
      "calendar_create_event",
      "calendar_update_event",
      "calendar_delete_event",
      "calendar_show_event"
    ]);
    expect(names.every((name) => name.startsWith("calendar_"))).toBe(true);
  });

  it("registers only Reminders tools on the Apple Reminders server", () => {
    const { server, names } = fakeServer();

    registerAppleRemindersServerTools(server, {} as never, { request: vi.fn() });

    expect(names).toEqual([
      "reminders_request_permissions",
      "reminders_list_lists",
      "reminders_search",
      "reminders_read",
      "reminders_create",
      "reminders_update",
      "reminders_complete",
      "reminders_delete",
      "reminders_move"
    ]);
    expect(names.every((name) => name.startsWith("reminders_"))).toBe(true);
  });

  it("registers only Messages tools on the Apple Messages server", () => {
    const { server, names } = fakeServer();

    registerAppleMessagesServerTools(server, {} as never, { request: vi.fn() });

    expect(names).toEqual([
      "messages_request_permissions",
      "messages_list_chats",
      "messages_fetch_new",
      "messages_search",
      "messages_read",
      "messages_send"
    ]);
    expect(names.every((name) => name.startsWith("messages_"))).toBe(true);
  });

  it("registers only Notes tools on the Apple Notes server", () => {
    const { server, names } = fakeServer();

    registerAppleNotesServerTools(server, {} as never, { request: vi.fn() });

    expect(names).toEqual([
      "notes_request_permissions",
      "notes_list_accounts",
      "notes_list_folders",
      "notes_search",
      "notes_read",
      "notes_create_folder",
      "notes_rename_folder",
      "notes_delete_folder",
      "notes_create",
      "notes_update",
      "notes_append",
      "notes_move",
      "notes_delete",
      "notes_show"
    ]);
    expect(names.every((name) => name.startsWith("notes_"))).toBe(true);
  });
});
