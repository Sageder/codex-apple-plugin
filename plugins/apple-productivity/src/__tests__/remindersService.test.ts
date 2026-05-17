import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "../config.js";
import { encodeReminderHandle } from "../reminders/handle.js";
import type { RemindersBackend } from "../reminders/nativeBridge.js";
import { RemindersService } from "../reminders/remindersService.js";
import type { ReminderBody, ReminderSummary } from "../reminders/types.js";

class MockBackend {
  calls: Array<{ action: string; input: unknown }> = [];

  constructor(private readonly responses: unknown[] = []) {}

  async run<T>(action: string, input: unknown): Promise<T> {
    this.calls.push({ action, input });
    return this.responses.shift() as T;
  }
}

const baseConfig: RuntimeConfig = {
  writeMode: "ask",
  maxBodyChars: 12000,
  retrievalCandidateLimit: 30,
  contextTopK: 5,
  helperTimeoutMs: 15000,
  defaultRemindersList: "Tasks"
};

const handle = "swift-owned-handle";
const encodedHandle = encodeReminderHandle({
  listId: "list-1",
  listName: "Tasks",
  id: "reminder-1"
});

function service(backend: MockBackend, config: Partial<RuntimeConfig> = {}) {
  return new RemindersService(backend as unknown as RemindersBackend, { ...baseConfig, ...config });
}

function summary(): ReminderSummary {
  return {
    handle,
    id: "reminder-1",
    listId: "list-1",
    listName: "Tasks",
    name: "Synthetic task",
    completed: false,
    priority: "none"
  };
}

function body(): ReminderBody {
  return {
    ...summary(),
    body: "Synthetic notes",
    truncated: false
  };
}

describe("reminders service", () => {
  it("forwards explicit access requests to Swift", async () => {
    const backend = new MockBackend([{ authorizationStatus: "fullAccess" }]);
    const result = await service(backend).requestAccess();

    expect(backend.calls[0]).toEqual({ action: "requestAccess", input: undefined });
    expect(result).toEqual({ authorizationStatus: "fullAccess" });
  });

  it("forwards searches and wraps Swift results for MCP responses", async () => {
    const backend = new MockBackend([[summary()]]);
    const result = await service(backend).search({
      query: "synthetic",
      scheduled: "scheduled",
      scheduledSince: "2026-05-16T22:00:00+02:00",
      sort: "scheduled"
    });

    expect(backend.calls[0]).toEqual({
      action: "search",
      input: {
        query: "synthetic",
        scheduled: "scheduled",
        scheduledSince: "2026-05-16T22:00:00+02:00",
        sort: "scheduled"
      }
    });
    expect(result).toEqual({ reminders: [summary()] });
  });

  it("adds max body chars for reads", async () => {
    const backend = new MockBackend([[body()]]);
    const result = await service(backend).read({ handles: [handle] });

    expect(backend.calls[0]).toEqual({
      action: "read",
      input: { handles: [handle], maxBodyChars: 12000 }
    });
    expect(result).toEqual({ reminders: [body()] });
  });

  it("previews creates in ask mode without calling Swift", async () => {
    const response = {
      mode: "ask",
      created: false,
      preview: { name: "Synthetic task", bodyChars: 5, list: "Tasks" },
      reason: "confirm: true required in ask mode"
    };
    const backend = new MockBackend([response]);
    const result = await service(backend).create({ name: "Synthetic task", body: "notes" });

    expect(backend.calls).toHaveLength(0);
    expect(result).toMatchObject({ ...response, allowed: false });
  });

  it("forwards direct updates after the shared write guard allows them", async () => {
    const response = { updated: true, moved: false, reminder: body() };
    const backend = new MockBackend([response]);
    const result = await service(backend, { writeMode: "direct" }).update({
      handle: encodedHandle,
      body: null,
      dueDate: null
    });

    expect(backend.calls[0]).toEqual({
      action: "update",
      input: {
        handle: encodedHandle,
        body: null,
        dueDate: null,
        writeMode: "direct",
        defaultList: "Tasks",
        maxBodyChars: 12000
      }
    });
    expect(result).toEqual(response);
  });

  it("previews batch writes in TypeScript when the shared write guard blocks", async () => {
    const backend = new MockBackend();

    const complete = await service(backend).complete({ handles: [encodedHandle] });
    const deletion = await service(backend).delete({ handles: [encodedHandle], dryRun: true });
    const move = await service(backend).move({ handles: [encodedHandle], list: "Later" });

    expect(backend.calls).toHaveLength(0);
    expect(complete).toMatchObject({ mode: "ask", allowed: false, completed: false, requestedCompleted: true });
    expect(deletion).toMatchObject({ mode: "ask", allowed: false, deleted: false, count: 1 });
    expect(move).toMatchObject({ mode: "ask", allowed: false, moved: false, list: "Later", count: 1 });
  });

  it("forwards batch writes to Swift once the shared write guard allows them", async () => {
    const backend = new MockBackend([
      { completed: true, reminders: [] },
      { deleted: [{ listId: "list-1", listName: "Tasks", id: "reminder-1" }] },
      { moved: [] }
    ]);

    await service(backend, { writeMode: "direct" }).complete({ handles: [encodedHandle] });
    await service(backend, { writeMode: "direct" }).delete({ handles: [encodedHandle] });
    await service(backend, { writeMode: "direct" }).move({ handles: [encodedHandle], list: "Later" });

    expect(backend.calls).toEqual([
      {
        action: "complete",
        input: { handles: [encodedHandle], writeMode: "direct", defaultList: "Tasks", maxBodyChars: 12000 }
      },
      {
        action: "delete",
        input: { handles: [encodedHandle], writeMode: "direct", defaultList: "Tasks", maxBodyChars: 12000 }
      },
      {
        action: "move",
        input: { handles: [encodedHandle], list: "Later", writeMode: "direct", defaultList: "Tasks", maxBodyChars: 12000 }
      }
    ]);
  });
});
