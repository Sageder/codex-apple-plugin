import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "../config.js";
import { encodeReminderHandle } from "../reminders/handle.js";
import type { RemindersBackend } from "../reminders/nativeBridge.js";
import { RemindersService } from "../reminders/remindersService.js";
import type { RawReminderBody, RawReminderSummary } from "../reminders/types.js";

class MockBridge {
  calls: Array<{ action: string; input: unknown }> = [];

  constructor(private readonly responses: unknown[] = []) {}

  async run<T>(action: string, input: unknown): Promise<T> {
    this.calls.push({ action, input });
    return this.responses.shift() as T;
  }
}

const baseConfig: RuntimeConfig = {
  writeMode: "draft",
  maxBodyChars: 12000,
  retrievalCandidateLimit: 30,
  contextTopK: 5,
  osascriptTimeoutMs: 15000,
  defaultRemindersList: "Tasks"
};

const rawHandle = { listId: "list-1", listName: "Tasks", id: "reminder-1" };
const encodedHandle = encodeReminderHandle(rawHandle);

function service(bridge: MockBridge, config: Partial<RuntimeConfig> = {}) {
  return new RemindersService(bridge as unknown as RemindersBackend, { ...baseConfig, ...config });
}

function rawSummary(): RawReminderSummary {
  return {
    handle: rawHandle,
    id: rawHandle.id,
    listId: rawHandle.listId,
    listName: rawHandle.listName,
    name: "Synthetic task",
    completed: false,
    priority: "none"
  };
}

function rawBody(): RawReminderBody {
  return {
    ...rawSummary(),
    body: "Synthetic notes",
    truncated: false
  };
}

describe("reminders service", () => {
  it("previews creates in draft mode and does not call the native helper", async () => {
    const bridge = new MockBridge();
    const result = await service(bridge).create({ name: "Synthetic task", body: "notes" });

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({
      mode: "draft",
      created: false,
      preview: { name: "Synthetic task", bodyChars: 5, list: "Tasks" }
    });
  });

  it("normalizes create arguments and encodes returned handles in direct mode", async () => {
    const bridge = new MockBridge([{ created: true, list: { listId: "list-1", listName: "Tasks" }, reminder: rawBody() }]);
    const result = await service(bridge, { writeMode: "direct" }).create({
      name: "Synthetic task",
      url: "https://example.com/task",
      alarmDates: ["2026-05-17T08:45:00+02:00"],
      recurrence: { frequency: "daily", interval: 1 }
    });

    expect(bridge.calls[0]?.action).toBe("create");
    expect(bridge.calls[0]?.input).toMatchObject({
      name: "Synthetic task",
      priority: "none",
      url: "https://example.com/task",
      alarmDates: ["2026-05-17T08:45:00+02:00"],
      recurrence: { frequency: "daily", interval: 1 },
      completed: false,
      defaultList: "Tasks",
      maxBodyChars: 12000
    });
    expect(result.reminder.handle).toBe(encodedHandle);
  });

  it("requires confirmation for completions in confirm mode", async () => {
    const bridge = new MockBridge();
    const result = await service(bridge, { writeMode: "confirm" }).complete({ handles: [encodedHandle] });

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({
      mode: "confirm",
      completed: false,
      requestedCompleted: true,
      targets: [rawHandle]
    });
  });

  it("executes confirmed completions and encodes returned handles", async () => {
    const bridge = new MockBridge([{ completed: true, reminders: [rawSummary()] }]);
    const result = await service(bridge, { writeMode: "confirm" }).complete({
      handles: [encodedHandle],
      confirm: true
    });

    expect(bridge.calls[0]?.action).toBe("complete");
    expect(bridge.calls[0]?.input).toMatchObject({ handles: [rawHandle], completed: true });
    expect(result.reminders[0]?.handle).toBe(encodedHandle);
  });

  it("decodes update targets and encodes updated reminders", async () => {
    const bridge = new MockBridge([{ updated: true, moved: false, reminder: rawBody() }]);
    const result = await service(bridge, { writeMode: "direct" }).update({
      handle: encodedHandle,
      body: null,
      dueDate: null
    });

    expect(bridge.calls[0]?.action).toBe("update");
    expect(bridge.calls[0]?.input).toMatchObject({ handle: rawHandle, body: null, dueDate: null });
    expect(result.reminder.handle).toBe(encodedHandle);
  });

  it("honors dry runs even in direct mode", async () => {
    const bridge = new MockBridge();
    const result = await service(bridge, { writeMode: "direct" }).delete({
      handles: [encodedHandle],
      dryRun: true
    });

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({
      mode: "direct",
      deleted: false,
      count: 1,
      targets: [rawHandle]
    });
  });

  it("previews moves in draft mode", async () => {
    const bridge = new MockBridge();
    const result = await service(bridge).move({ handles: [encodedHandle], list: "Later" });

    expect(bridge.calls).toHaveLength(0);
    expect(result).toMatchObject({
      mode: "draft",
      moved: false,
      list: "Later",
      count: 1,
      targets: [rawHandle]
    });
  });
});
