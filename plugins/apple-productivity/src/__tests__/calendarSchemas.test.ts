import { describe, expect, it } from "vitest";
import {
  calendarCreateEventSchema,
  calendarDeleteEventSchema,
  calendarSearchEventsSchema,
  calendarUpdateEventSchema
} from "../calendar/schemas.js";

const start = "2026-05-16T08:00:00.000Z";
const end = "2026-05-16T09:00:00.000Z";

describe("calendar schemas", () => {
  it("accepts date-window searches with limits", () => {
    const parsed = calendarSearchEventsSchema.parse({ from: start, to: end, limit: 25 });
    expect(parsed.limit).toBe(25);
    expect(parsed.includeCancelled).toBe(false);
  });

  it("requires calendar targeting for create", () => {
    expect(() => calendarCreateEventSchema.parse({ summary: "Focus", start, end })).toThrow();
    expect(calendarCreateEventSchema.parse({ calendarId: "cal-1", summary: "Focus", start, end }).calendarId).toBe(
      "cal-1"
    );
  });

  it("rejects invalid event date ranges", () => {
    expect(() =>
      calendarCreateEventSchema.parse({ calendarId: "cal-1", summary: "Focus", start: end, end: start })
    ).toThrow("end must be at or after start");
  });

  it("requires update span and non-empty patches", () => {
    expect(() => calendarUpdateEventSchema.parse({ handle: "h", span: "all", patch: {} })).toThrow();
    const parsed = calendarUpdateEventSchema.parse({ handle: "h", span: "this", patch: { location: "ETH" } });
    expect(parsed.span).toBe("this");
  });

  it("requires delete span", () => {
    expect(() => calendarDeleteEventSchema.parse({ handle: "h" })).toThrow();
    expect(calendarDeleteEventSchema.parse({ handle: "h", span: "all" }).span).toBe("all");
  });

  it("rejects attendee mutations", () => {
    expect(() =>
      calendarCreateEventSchema.parse({
        calendarId: "cal-1",
        summary: "Focus",
        start,
        end,
        attendees: []
      })
    ).toThrow();
  });
});
