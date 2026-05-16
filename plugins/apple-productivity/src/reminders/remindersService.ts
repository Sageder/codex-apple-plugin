import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import { decodeReminderHandle } from "./handle.js";
import type { RemindersBackend } from "./nativeBridge.js";
import type { ReminderBody, ReminderList, ReminderPriority, ReminderRecurrence, ReminderSummary } from "./types.js";

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

export class RemindersService {
  constructor(
    private readonly backend: RemindersBackend,
    private readonly config: RuntimeConfig
  ) {}

  async listLists(args: RemindersListListsArgs = {}): Promise<{ lists: ReminderList[] }> {
    const lists = await this.backend.run<ReminderList[]>("listLists", args);
    return { lists };
  }

  async search(args: RemindersSearchArgs): Promise<{ reminders: ReminderSummary[] }> {
    const reminders = await this.backend.run<ReminderSummary[]>("search", args);
    return { reminders };
  }

  async read(args: RemindersReadArgs): Promise<{ reminders: ReminderBody[] }> {
    const reminders = await this.backend.run<ReminderBody[]>("read", {
      ...args,
      maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
    });
    return { reminders };
  }

  async create(args: RemindersCreateArgs) {
    const decision = decideWrite(this.config, "reminders.create", args.confirm, args.dryRun);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        created: false,
        preview: previewCreate(args, this.config.defaultRemindersList),
        reason: decision.reason
      };
    }

    return this.backend.run("create", this.withWriteConfig(args));
  }

  async update(args: RemindersUpdateArgs) {
    const decision = decideWrite(this.config, "reminders.update", args.confirm, args.dryRun);
    const target = decodeReminderHandle(args.handle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        updated: false,
        target,
        preview: previewUpdate(args),
        reason: decision.reason
      };
    }

    return this.backend.run("update", this.withWriteConfig(args));
  }

  async complete(args: RemindersCompleteArgs) {
    const decision = decideWrite(this.config, "reminders.complete", args.confirm, args.dryRun);
    const targets = args.handles.map(decodeReminderHandle);
    const completed = args.completed ?? true;
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        completed: false,
        requestedCompleted: completed,
        count: targets.length,
        targets,
        reason: decision.reason
      };
    }

    return this.backend.run("complete", this.withWriteConfig(args));
  }

  async delete(args: RemindersWriteArgs) {
    const decision = decideWrite(this.config, "reminders.delete", args.confirm, args.dryRun);
    const targets = args.handles.map(decodeReminderHandle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        deleted: false,
        count: targets.length,
        targets,
        reason: decision.reason
      };
    }

    return this.backend.run("delete", this.withWriteConfig(args));
  }

  async move(args: RemindersMoveArgs) {
    const decision = decideWrite(this.config, "reminders.move", args.confirm, args.dryRun);
    const targets = args.handles.map(decodeReminderHandle);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        moved: false,
        list: args.list,
        count: targets.length,
        targets,
        reason: decision.reason
      };
    }

    return this.backend.run("move", this.withWriteConfig(args));
  }

  private withWriteConfig<T extends object>(args: T) {
    return {
      ...args,
      writeMode: this.config.writeMode,
      defaultList: this.config.defaultRemindersList,
      maxBodyChars: this.config.maxBodyChars
    };
  }
}

function previewCreate(args: RemindersCreateArgs, defaultList?: string) {
  return {
    name: args.name,
    bodyChars: args.body?.length ?? 0,
    list: args.list ?? defaultList,
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
    body: bodyPreview(args),
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

function bodyPreview(args: RemindersUpdateArgs) {
  if (!Object.hasOwn(args, "body")) {
    return undefined;
  }
  if (args.body === null) {
    return { bodyChars: undefined, cleared: true };
  }
  return { bodyChars: args.body?.length ?? 0, cleared: false };
}
