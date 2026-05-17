import { describe, expect, it } from "vitest";
import { CalendarService } from "../calendar/calendarService.js";
import { encodeCalendarEventHandle } from "../calendar/handle.js";
import type { RuntimeConfig } from "../config.js";

class FakeBridge {
  calls: Array<{ action: string; input: unknown }> = [];

  constructor(private readonly response: unknown = { ok: true }) {}

  async run<T>(action: string, input: unknown): Promise<T> {
    this.calls.push({ action, input });
    return this.response as T;
  }
}

const baseConfig: RuntimeConfig = {
  writeMode: "ask",
  maxBodyChars: 500,
  retrievalCandidateLimit: 30,
  contextTopK: 5,
  helperTimeoutMs: 15000
};

const createArgs = {
  calendarId: "cal-1",
  summary: "Focus",
  start: "2026-05-16T08:00:00.000Z",
  end: "2026-05-16T09:00:00.000Z"
};

const handle = encodeCalendarEventHandle({
  calendarId: "cal-1",
  uid: "event-1",
  occurrenceStart: "2026-05-16T08:00:00.000Z"
});

describe("calendar service write policy", () => {
  it("forwards explicit access requests to the helper", async () => {
    const bridge = new FakeBridge({ authorizationStatus: "fullAccess" });
    const service = new CalendarService(bridge, baseConfig);

    const result = await service.requestAccess();

    expect(result).toEqual({ authorizationStatus: "fullAccess" });
    expect(bridge.calls).toEqual([{ action: "requestAccess", input: undefined }]);
  });

  it("previews create events in ask mode without calling the helper", async () => {
    const bridge = new FakeBridge();
    const service = new CalendarService(bridge, baseConfig);

    const result = await service.createEvent(createArgs);

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({ mode: "ask", allowed: false, created: false });
  });

  it("creates events in direct mode", async () => {
    const rawEvent = {
      handle: { calendarId: "cal-1", uid: "event-1" },
      calendarId: "cal-1",
      calendarName: "Work",
      calendarWritable: true,
      uid: "event-1",
      summary: "Focus",
      start: createArgs.start,
      end: createArgs.end,
      allDay: false,
      notesTruncated: false,
      attendees: [],
      alarms: [],
      recurring: false
    };
    const bridge = new FakeBridge({ created: true, event: rawEvent });
    const service = new CalendarService(bridge, { ...baseConfig, writeMode: "direct" });

    const result = await service.createEvent(createArgs);

    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]?.action).toBe("createEvent");
    expect(result).toMatchObject({ created: true, event: { calendarId: "cal-1", uid: "event-1" } });
    expect(result.event.handle).toEqual(expect.any(String));
  });

  it("blocks update in ask mode without explicit confirmation", async () => {
    const bridge = new FakeBridge();
    const service = new CalendarService(bridge, { ...baseConfig, writeMode: "ask" });

    const result = await service.updateEvent({ handle, span: "all", patch: { location: "ETH" } });

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({ mode: "ask", allowed: false, updated: false });
  });

  it("updates with confirmation", async () => {
    const rawEvent = {
      handle: { calendarId: "cal-1", uid: "event-1" },
      calendarId: "cal-1",
      calendarName: "Work",
      calendarWritable: true,
      uid: "event-1",
      summary: "Focus",
      start: createArgs.start,
      end: createArgs.end,
      allDay: false,
      notesTruncated: false,
      attendees: [],
      alarms: [],
      recurring: false
    };
    const bridge = new FakeBridge({ updated: true, span: "all", event: rawEvent });
    const service = new CalendarService(bridge, { ...baseConfig, writeMode: "ask" });

    await service.updateEvent({ handle, span: "all", patch: { location: "ETH" }, confirm: true });

    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]?.action).toBe("updateEvent");
  });

  it("previews delete dry-runs in direct mode", async () => {
    const bridge = new FakeBridge();
    const service = new CalendarService(bridge, { ...baseConfig, writeMode: "direct" });

    const result = await service.deleteEvent({ handle, span: "this", dryRun: true });

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({ mode: "direct", allowed: false, deleted: false });
  });

  it("deletes when direct mode allows it", async () => {
    const bridge = new FakeBridge({ deleted: true, span: "all", calendarId: "cal-1", uid: "event-1" });
    const service = new CalendarService(bridge, { ...baseConfig, writeMode: "direct" });

    await service.deleteEvent({ handle, span: "all" });

    expect(bridge.calls).toHaveLength(1);
    expect(bridge.calls[0]?.action).toBe("deleteEvent");
  });
});
