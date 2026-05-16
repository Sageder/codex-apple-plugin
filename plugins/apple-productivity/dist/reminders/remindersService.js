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
    create(args) {
        return this.backend.run("create", this.withWriteConfig(args));
    }
    update(args) {
        return this.backend.run("update", this.withWriteConfig(args));
    }
    complete(args) {
        return this.backend.run("complete", this.withWriteConfig(args));
    }
    delete(args) {
        return this.backend.run("delete", this.withWriteConfig(args));
    }
    move(args) {
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
//# sourceMappingURL=remindersService.js.map