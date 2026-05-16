import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import { decodeReminderHandle, encodeReminderHandle } from "./handle.js";
import type { RemindersBackend } from "./nativeBridge.js";
import type {
  RawReminderBody,
  RawReminderSummary,
  ReminderBody,
  ReminderHandlePayload,
  ReminderList,
  ReminderPriority,
  ReminderRecurrence,
  ReminderSummary,
  SearchRemindersInput
} from "./types.js";

export interface RemindersListListsArgs {
  maxCountPerList?: number;
}

export interface RemindersSearchArgs {
  query?: string;
  list?: string;
  completed?: "all" | "completed" | "incomplete";
  dueSince?: string;
  dueBefore?: string;
  remindSince?: string;
  remindBefore?: string;
  priority?: ReminderPriority;
  limit?: number;
  maxScanPerList?: number;
}

export interface RemindersReadArgs {
  handles: string[];
  maxBodyChars?: number;
}

export interface RemindersCreateArgs {
  name: string;
  body?: string;
  list?: string;
  dueDate?: string;
  remindMeDate?: string;
  alarmDates?: string[];
  priority?: ReminderPriority;
  url?: string;
  recurrence?: ReminderRecurrence;
  completed?: boolean;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface RemindersUpdateArgs {
  handle: string;
  name?: string;
  body?: string | null;
  list?: string;
  dueDate?: string | null;
  remindMeDate?: string | null;
  alarmDates?: string[] | null;
  priority?: ReminderPriority | null;
  url?: string | null;
  recurrence?: ReminderRecurrence | null;
  completed?: boolean;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface RemindersCompleteArgs {
  handles: string[];
  completed?: boolean;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface RemindersWriteArgs {
  handles: string[];
  confirm?: boolean;
  dryRun?: boolean;
}

export interface RemindersMoveArgs extends RemindersWriteArgs {
  list: string;
}

interface RawCreateResult {
  created: boolean;
  list: { listId: string; listName: string };
  reminder: RawReminderBody;
}

interface RawUpdateResult {
  updated: boolean;
  moved: boolean;
  fromList?: { listId: string; listName: string };
  toList?: { listId: string; listName: string };
  reminder: RawReminderBody;
}

interface RawCompleteResult {
  completed: boolean;
  reminders: RawReminderSummary[];
}

interface RawMoveResult {
  moved: Array<{
    moved: boolean;
    fromList: { listId: string; listName: string };
    toList: { listId: string; listName: string };
    reminder: RawReminderSummary;
  }>;
}

export class RemindersService {
  constructor(
    private readonly backend: RemindersBackend,
    private readonly config: RuntimeConfig
  ) {}

  async listLists(args: RemindersListListsArgs = {}): Promise<{ lists: ReminderList[] }> {
    const lists = await this.backend.run<ReminderList[]>("listLists", {
      maxCountPerList: args.maxCountPerList ?? 2000
    });
    return { lists };
  }

  async search(args: RemindersSearchArgs): Promise<{ reminders: ReminderSummary[] }> {
    const input: SearchRemindersInput = {
      query: args.query,
      list: args.list,
      completed: args.completed ?? "incomplete",
      dueSince: args.dueSince,
      dueBefore: args.dueBefore,
      remindSince: args.remindSince,
      remindBefore: args.remindBefore,
      priority: args.priority,
      limit: args.limit ?? 20,
      maxScanPerList: args.maxScanPerList ?? 200
    };

    const raw = await this.backend.run<RawReminderSummary[]>("search", input);
    return {
      reminders: raw.map(encodeSummary).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    };
  }

  async read(args: RemindersReadArgs): Promise<{ reminders: ReminderBody[] }> {
    const rawHandles = args.handles.map(decodeReminderHandle);
    const raw = await this.backend.run<RawReminderBody[]>("read", {
      handles: rawHandles,
      maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
    });

    return { reminders: raw.map(encodeBody) };
  }

  async create(args: RemindersCreateArgs) {
    const decision = decideWrite(this.config, "create", args.confirm, args.dryRun);
    const input = {
      ...args,
      priority: args.priority ?? "none",
      completed: args.completed ?? false,
      defaultList: this.config.defaultRemindersList,
      maxBodyChars: this.config.maxBodyChars
    };

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        created: false,
        preview: previewCreate(args, this.config.defaultRemindersList),
        reason: decision.reason
      };
    }

    return encodeCreateResult(await this.backend.run<RawCreateResult>("create", input));
  }

  async update(args: RemindersUpdateArgs) {
    const decision = decideWrite(this.config, "update", args.confirm, args.dryRun);
    const decoded = decodeReminderHandle(args.handle);
    const input = {
      ...args,
      handle: decoded,
      maxBodyChars: this.config.maxBodyChars
    };

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        updated: false,
        target: decoded,
        preview: previewUpdate(args),
        reason: decision.reason
      };
    }

    return encodeUpdateResult(await this.backend.run<RawUpdateResult>("update", input));
  }

  async complete(args: RemindersCompleteArgs) {
    const decision = decideWrite(this.config, "complete", args.confirm, args.dryRun);
    const decoded = args.handles.map(decodeReminderHandle);
    const completed = args.completed ?? true;

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        completed: false,
        requestedCompleted: completed,
        count: decoded.length,
        targets: decoded,
        reason: decision.reason
      };
    }

    const raw = await this.backend.run<RawCompleteResult>("complete", {
      handles: decoded,
      completed
    });
    return {
      completed: raw.completed,
      reminders: raw.reminders.map(encodeSummary)
    };
  }

  async delete(args: RemindersWriteArgs) {
    const decision = decideWrite(this.config, "delete", args.confirm, args.dryRun);
    const decoded = args.handles.map(decodeReminderHandle);

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        deleted: false,
        count: decoded.length,
        targets: decoded,
        reason: decision.reason
      };
    }

    return this.backend.run("delete", { handles: decoded });
  }

  async move(args: RemindersMoveArgs) {
    const decision = decideWrite(this.config, "move", args.confirm, args.dryRun);
    const decoded = args.handles.map(decodeReminderHandle);

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        moved: false,
        list: args.list,
        count: decoded.length,
        targets: decoded,
        reason: decision.reason
      };
    }

    return encodeMoveResult(
      await this.backend.run<RawMoveResult>("move", {
        handles: decoded,
        list: args.list
      })
    );
  }
}

function encodeSummary(raw: RawReminderSummary): ReminderSummary {
  return {
    ...raw,
    handle: encodeReminderHandle(raw.handle)
  };
}

function encodeBody(raw: RawReminderBody): ReminderBody {
  return {
    ...raw,
    handle: encodeReminderHandle(raw.handle)
  };
}

function encodeCreateResult(raw: RawCreateResult) {
  return {
    ...raw,
    reminder: encodeBody(raw.reminder)
  };
}

function encodeUpdateResult(raw: RawUpdateResult) {
  return {
    ...raw,
    reminder: encodeBody(raw.reminder)
  };
}

function encodeMoveResult(raw: RawMoveResult) {
  return {
    moved: raw.moved.map((entry) => ({
      ...entry,
      reminder: encodeSummary(entry.reminder)
    }))
  };
}

function previewCreate(args: RemindersCreateArgs, defaultList?: string) {
  return {
    name: args.name,
    bodyChars: args.body?.length ?? 0,
    list: args.list ?? defaultList ?? null,
    dueDate: args.dueDate,
    remindMeDate: args.remindMeDate,
    alarmDates: args.alarmDates,
    priority: args.priority ?? "none",
    url: args.url,
    recurrence: args.recurrence,
    completed: args.completed ?? false
  };
}

function previewUpdate(args: RemindersUpdateArgs) {
  return {
    name: args.name,
    body: args.body === undefined ? undefined : args.body === null ? null : { bodyChars: args.body.length },
    list: args.list,
    dueDate: args.dueDate,
    remindMeDate: args.remindMeDate,
    alarmDates: args.alarmDates,
    priority: args.priority,
    url: args.url,
    recurrence: args.recurrence,
    completed: args.completed
  };
}

export function encodeReminderSummaryForTest(raw: RawReminderSummary): ReminderSummary {
  return encodeSummary(raw);
}

export function decodeReminderHandleForTest(handle: string): ReminderHandlePayload {
  return decodeReminderHandle(handle);
}
