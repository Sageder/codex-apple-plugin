import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "../config.js";
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
  writeMode: "draft",
  maxBodyChars: 12000,
  retrievalCandidateLimit: 30,
  contextTopK: 5,
  helperTimeoutMs: 15000,
  defaultRemindersList: "Tasks"
};

const handle = "swift-owned-handle";

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
  it("forwards searches and wraps Swift results for MCP responses", async () => {
    const backend = new MockBackend([[summary()]]);
    const result = await service(backend).search({ query: "synthetic" });

    expect(backend.calls[0]).toEqual({ action: "search", input: { query: "synthetic" } });
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

  it("forwards creates to Swift with write config", async () => {
    const response = {
      mode: "draft",
      created: false,
      preview: { name: "Synthetic task", bodyChars: 5, list: "Tasks" },
      reason: "draft mode prevents irreversible writes"
    };
    const backend = new MockBackend([response]);
    const result = await service(backend).create({ name: "Synthetic task", body: "notes" });

    expect(backend.calls[0]).toEqual({
      action: "create",
      input: {
        name: "Synthetic task",
        body: "notes",
        writeMode: "draft",
        defaultList: "Tasks",
        maxBodyChars: 12000
      }
    });
    expect(result).toEqual(response);
  });

  it("forwards direct updates without decoding handles in TypeScript", async () => {
    const response = { updated: true, moved: false, reminder: body() };
    const backend = new MockBackend([response]);
    const result = await service(backend, { writeMode: "direct" }).update({
      handle,
      body: null,
      dueDate: null
    });

    expect(backend.calls[0]).toEqual({
      action: "update",
      input: {
        handle,
        body: null,
        dueDate: null,
        writeMode: "direct",
        defaultList: "Tasks",
        maxBodyChars: 12000
      }
    });
    expect(result).toEqual(response);
  });

  it("forwards batch writes to Swift for guard decisions", async () => {
    const backend = new MockBackend([
      { completed: false, requestedCompleted: true, count: 1 },
      { deleted: false, count: 1 },
      { moved: false, list: "Later", count: 1 }
    ]);

    await service(backend).complete({ handles: [handle] });
    await service(backend).delete({ handles: [handle], dryRun: true });
    await service(backend).move({ handles: [handle], list: "Later" });

    expect(backend.calls).toEqual([
      {
        action: "complete",
        input: { handles: [handle], writeMode: "draft", defaultList: "Tasks", maxBodyChars: 12000 }
      },
      {
        action: "delete",
        input: { handles: [handle], dryRun: true, writeMode: "draft", defaultList: "Tasks", maxBodyChars: 12000 }
      },
      {
        action: "move",
        input: { handles: [handle], list: "Later", writeMode: "draft", defaultList: "Tasks", maxBodyChars: 12000 }
      }
    ]);
  });
});
