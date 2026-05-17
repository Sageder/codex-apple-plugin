const ALL_SERVICES = ["mail", "calendar", "reminders"];
export class PermissionsService {
    services;
    constructor(services) {
        this.services = services;
    }
    async request(args = {}) {
        const serviceNames = args.services ?? ALL_SERVICES;
        const results = [];
        for (const serviceName of serviceNames) {
            results.push(await this.requestOne(serviceName));
        }
        return {
            ok: results.every((result) => result.ok),
            results,
            note: "This only triggers macOS permission prompts and verifies basic access. It does not read mail bodies, calendar notes, or reminder notes."
        };
    }
    async requestOne(service) {
        try {
            switch (service) {
                case "mail":
                    return this.mailResult(await this.services.mail.requestPermission());
                case "calendar":
                    return this.calendarResult(await this.services.calendar.requestAccess());
                case "reminders":
                    return this.remindersResult(await this.services.reminders.requestAccess());
            }
        }
        catch (error) {
            return {
                service,
                ok: false,
                action: actionFor(service),
                error: formatError(error),
                nextStep: nextStepFor(service)
            };
        }
    }
    mailResult(result) {
        return {
            service: "mail",
            ok: true,
            action: "mail.requestPermission",
            summary: {
                accounts: result.accountCount,
                mailboxes: result.mailboxCount
            }
        };
    }
    calendarResult(result) {
        return {
            service: "calendar",
            ok: true,
            action: "requestAccess",
            summary: {
                authorizationStatus: result.authorizationStatus
            }
        };
    }
    remindersResult(result) {
        return {
            service: "reminders",
            ok: true,
            action: "requestAccess",
            summary: {
                authorizationStatus: result.authorizationStatus
            }
        };
    }
}
function actionFor(service) {
    if (service === "mail") {
        return "mail.requestPermission";
    }
    return "requestAccess";
}
function formatError(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (typeof error === "object" && error !== null && "stderr" in error && typeof error.stderr === "string") {
        const detail = error.stderr.trim();
        if (detail) {
            return `${message}: ${detail.slice(0, 1000)}`;
        }
    }
    return message;
}
function nextStepFor(service) {
    switch (service) {
        case "mail":
            return "Approve the macOS Automation prompt for Mail, or enable it in System Settings > Privacy & Security > Automation.";
        case "calendar":
            return "Approve the macOS Calendar prompt, or enable it in System Settings > Privacy & Security > Calendars.";
        case "reminders":
            return "Approve the macOS Reminders prompt, or enable it in System Settings > Privacy & Security > Reminders.";
    }
}
//# sourceMappingURL=permissionsService.js.map