import { describe, expect, it } from "vitest";
import { PermissionsService } from "../permissions/permissionsService.js";

describe("permissions service", () => {
  it("triggers all permission probes and returns only summaries", async () => {
    const service = new PermissionsService({
      mail: {
        async requestPermission() {
          return { accountCount: 1, mailboxCount: 8 };
        }
      },
      calendar: {
        async requestAccess() {
          return { authorizationStatus: "fullAccess", calendars: [{ name: "Private calendar" }] } as never;
        }
      },
      reminders: {
        async requestAccess() {
          return { authorizationStatus: "fullAccess", lists: [{ name: "Private list" }] } as never;
        }
      }
    });

    const result = await service.request();
    const json = JSON.stringify(result);

    expect(result.ok).toBe(true);
    expect(result.results).toEqual([
      { service: "mail", ok: true, action: "mail.requestPermission", summary: { accounts: 1, mailboxes: 8 } },
      { service: "calendar", ok: true, action: "requestAccess", summary: { authorizationStatus: "fullAccess" } },
      { service: "reminders", ok: true, action: "requestAccess", summary: { authorizationStatus: "fullAccess" } }
    ]);
    expect(json).not.toContain("Private calendar");
    expect(json).not.toContain("Private list");
  });

  it("continues through other services when one permission probe fails", async () => {
    const service = new PermissionsService({
      mail: {
        async requestPermission() {
          throw new Error("Automation denied");
        }
      },
      calendar: {
        async requestAccess() {
          return { authorizationStatus: "fullAccess" };
        }
      },
      reminders: {
        async requestAccess() {
          return { authorizationStatus: "fullAccess" };
        }
      }
    });

    const result = await service.request();

    expect(result.ok).toBe(false);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]).toMatchObject({
      service: "mail",
      ok: false,
      error: "Automation denied"
    });
    expect(result.results[1]).toMatchObject({ service: "calendar", ok: true });
    expect(result.results[2]).toMatchObject({ service: "reminders", ok: true });
  });

  it("can request a selected subset", async () => {
    const calls: string[] = [];
    const service = new PermissionsService({
      mail: {
        async requestPermission() {
          calls.push("mail");
          return { accountCount: 0, mailboxCount: 0 };
        }
      },
      calendar: {
        async requestAccess() {
          calls.push("calendar");
          return { authorizationStatus: "fullAccess" };
        }
      },
      reminders: {
        async requestAccess() {
          calls.push("reminders");
          return { authorizationStatus: "fullAccess" };
        }
      }
    });

    await service.request({ services: ["calendar"] });

    expect(calls).toEqual(["calendar"]);
  });
});
