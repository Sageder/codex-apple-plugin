import type { RuntimeConfig } from "../config.js";
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

  create(args: RemindersCreateArgs) {
    return this.backend.run("create", this.withWriteConfig(args));
  }

  update(args: RemindersUpdateArgs) {
    return this.backend.run("update", this.withWriteConfig(args));
  }

  complete(args: RemindersCompleteArgs) {
    return this.backend.run("complete", this.withWriteConfig(args));
  }

  delete(args: RemindersWriteArgs) {
    return this.backend.run("delete", this.withWriteConfig(args));
  }

  move(args: RemindersMoveArgs) {
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
