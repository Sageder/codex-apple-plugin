import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import {
  registerAppleCalendarServerTools,
  registerAppleMailServerTools,
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
});
