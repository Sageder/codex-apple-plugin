import { decideWrite } from "../writeGuard.js";
import { decodeReminderHandle } from "./handle.js";
export class RemindersService {
    backend;
    config;
    constructor(backend, config) {
        this.backend = backend;
        this.config = config;
    }
    async listLists(args = {}) {
        const lists = await this.backend.run("listLists", args);
        return { lists };
    }
    async requestAccess() {
        return this.backend.run("requestAccess");
    }
    async search(args) {
        const reminders = await this.backend.run("search", args);
        return { reminders };
    }
    async read(args) {
        const reminders = await this.backend.run("read", {
            ...args,
            maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
        });
        return { reminders };
    }
    async create(args) {
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
    async update(args) {
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
    async complete(args) {
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
    async delete(args) {
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
    async move(args) {
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
    withWriteConfig(args) {
        return {
            ...args,
            writeMode: this.config.writeMode,
            defaultList: this.config.defaultRemindersList,
            maxBodyChars: this.config.maxBodyChars
        };
    }
}
function previewCreate(args, defaultList) {
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
function previewUpdate(args) {
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
function bodyPreview(args) {
    if (!Object.hasOwn(args, "body")) {
        return undefined;
    }
    if (args.body === null) {
        return { bodyChars: undefined, cleared: true };
    }
    return { bodyChars: args.body?.length ?? 0, cleared: false };
}
//# sourceMappingURL=remindersService.js.map