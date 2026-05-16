import { describe, expect, it } from "vitest";
import {
  remindersCreateSchema,
  remindersSearchSchema,
  remindersUpdateSchema,
  remindersWriteSchema
} from "../reminders/schemas.js";

describe("reminder schemas", () => {
  it("defaults searches to incomplete reminders with bounded scans", () => {
    expect(remindersSearchSchema.parse({})).toMatchObject({
      completed: "incomplete",
      limit: 20,
      maxScanPerList: 200
    });
  });

  it("accepts power-user fields supported by the JXA backend", () => {
    expect(
      remindersCreateSchema.parse({
        name: "Synthetic task",
        body: "Private test body is not stored here",
        list: "Tasks",
        dueDate: "2026-05-17T10:00:00+02:00",
        remindMeDate: "2026-05-17T09:30:00+02:00",
        priority: "high",
        completed: false
      })
    ).toMatchObject({ name: "Synthetic task", priority: "high" });
  });

  it("rejects unsupported advanced fields instead of hiding them in notes", () => {
    expect(() =>
      remindersCreateSchema.parse({
        name: "Synthetic task",
        recurrence: { frequency: "daily" }
      })
    ).toThrow();
  });

  it("allows update fields to be cleared explicitly", () => {
    expect(
      remindersUpdateSchema.parse({
        handle: "abc",
        body: null,
        dueDate: null,
        remindMeDate: null,
        priority: null
      })
    ).toMatchObject({ body: null, dueDate: null, remindMeDate: null, priority: null });
  });

  it("requires at least one handle for write operations", () => {
    expect(() => remindersWriteSchema.parse({ handles: [] })).toThrow();
  });
});
