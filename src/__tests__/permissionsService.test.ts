import { describe, expect, it } from "vitest";
import { PermissionsService, summarizeAccessStatus, summarizeMailPermission } from "../permissions/permissionsService.js";

describe("permissions service", () => {
  it("runs AppleScript first and returns only sanitized native summaries", async () => {
    const calls: string[] = [];
    const service = new PermissionsService({
      service: "mail",
      nativeAction: "mail.requestPermission",
      appleScript: {
        async request(serviceName) {
          calls.push(`appleScript:${serviceName}`);
          return {
            action: "osascript.mail.metadataProbe",
            summary: { accountCount: 1, mailboxCount: 8 }
          };
        }
      },
      async nativeProbe() {
        calls.push("native");
        return { accountCount: 1, mailboxCount: 8, privateBody: "secret" } as never;
      },
      summarizeNative: summarizeMailPermission,
      nextStep: "Enable Mail"
    });

    const result = await service.request();
    const json = JSON.stringify(result);

    expect(calls).toEqual(["appleScript:mail", "native"]);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({
      service: "mail",
      ok: true,
      appleScript: {
        action: "osascript.mail.metadataProbe",
        summary: { accountCount: 1, mailboxCount: 8 }
      },
      native: {
        action: "mail.requestPermission",
        summary: { accountCount: 1, mailboxCount: 8 }
      }
    });
    expect(json).not.toContain("secret");
  });

  it("reports AppleScript failures without running the native probe", async () => {
    const calls: string[] = [];
    const service = new PermissionsService({
      service: "calendar",
      nativeAction: "requestAccess",
      appleScript: {
        async request() {
          calls.push("appleScript");
          throw new Error("Automation denied");
        }
      },
      async nativeProbe() {
        calls.push("native");
        return { authorizationStatus: "fullAccess" };
      },
      summarizeNative: summarizeAccessStatus,
      nextStep: "Enable Calendar"
    });

    const result = await service.request();

    expect(calls).toEqual(["appleScript"]);
    expect(result).toMatchObject({
      ok: false,
      result: {
        service: "calendar",
        ok: false,
        error: "Automation denied",
        nextStep: "Enable Calendar"
      }
    });
  });

  it("supports AppleScript-only permission setup with explicit next-step guidance", async () => {
    const service = new PermissionsService({
      service: "calendar",
      appleScript: {
        async request(serviceName) {
          return {
            action: `osascript.${serviceName}.metadataProbe`,
            summary: { calendarCount: 3 }
          };
        }
      },
      nextStep: "Enable Full Access for Calendar."
    });

    const result = await service.request();

    expect(result).toMatchObject({
      ok: true,
      result: {
        service: "calendar",
        ok: true,
        appleScript: {
          action: "osascript.calendar.metadataProbe",
          summary: { calendarCount: 3 }
        },
        nextStep: "Enable Full Access for Calendar."
      }
    });
    expect(result.result).not.toHaveProperty("native");
  });

  it("includes native helper stderr in permission failures", async () => {
    const failure = Object.assign(new Error("Swift calendar helper exited with code 1"), {
      stderr: "Calendar access was not granted\n"
    });
    const service = new PermissionsService({
      service: "calendar",
      nativeAction: "requestAccess",
      appleScript: {
        async request() {
          return {
            action: "osascript.calendar.metadataProbe",
            summary: { calendarCount: 2 }
          };
        }
      },
      async nativeProbe() {
        throw failure;
      },
      summarizeNative: summarizeAccessStatus,
      nextStep: "Enable Calendar"
    });

    const result = await service.request();

    expect(result.result).toMatchObject({
      service: "calendar",
      ok: false,
      error: "Swift calendar helper exited with code 1: Calendar access was not granted"
    });
  });
});
