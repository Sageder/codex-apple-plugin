import { decideWrite } from "../writeGuard.js";
import { decodeReminderHandle, encodeReminderHandle } from "./handle.js";
export class RemindersService {
    backend;
    config;
    constructor(backend, config) {
        this.backend = backend;
        this.config = config;
    }
    async listLists(args = {}) {
        const lists = await this.backend.run("listLists", {
            maxCountPerList: args.maxCountPerList ?? 2000
        });
        return { lists };
    }
    async search(args) {
        const input = {
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
        const raw = await this.backend.run("search", input);
        return {
            reminders: raw.map(encodeSummary).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        };
    }
    async read(args) {
        const rawHandles = args.handles.map(decodeReminderHandle);
        const raw = await this.backend.run("read", {
            handles: rawHandles,
            maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
        });
        return { reminders: raw.map(encodeBody) };
    }
    async create(args) {
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
        return encodeCreateResult(await this.backend.run("create", input));
    }
    async update(args) {
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
        return encodeUpdateResult(await this.backend.run("update", input));
    }
    async complete(args) {
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
        const raw = await this.backend.run("complete", {
            handles: decoded,
            completed
        });
        return {
            completed: raw.completed,
            reminders: raw.reminders.map(encodeSummary)
        };
    }
    async delete(args) {
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
    async move(args) {
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
        return encodeMoveResult(await this.backend.run("move", {
            handles: decoded,
            list: args.list
        }));
    }
}
function encodeSummary(raw) {
    return {
        ...raw,
        handle: encodeReminderHandle(raw.handle)
    };
}
function encodeBody(raw) {
    return {
        ...raw,
        handle: encodeReminderHandle(raw.handle)
    };
}
function encodeCreateResult(raw) {
    return {
        ...raw,
        reminder: encodeBody(raw.reminder)
    };
}
function encodeUpdateResult(raw) {
    return {
        ...raw,
        reminder: encodeBody(raw.reminder)
    };
}
function encodeMoveResult(raw) {
    return {
        moved: raw.moved.map((entry) => ({
            ...entry,
            reminder: encodeSummary(entry.reminder)
        }))
    };
}
function previewCreate(args, defaultList) {
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
function previewUpdate(args) {
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
export function encodeReminderSummaryForTest(raw) {
    return encodeSummary(raw);
}
export function decodeReminderHandleForTest(handle) {
    return decodeReminderHandle(handle);
}
//# sourceMappingURL=remindersService.js.map