import type { CalendarService } from "../calendar/calendarService.js";
import type { MailService } from "../mail/mailService.js";
import type { RemindersService } from "../reminders/remindersService.js";
import type { PermissionServiceName, RequestPermissionsArgs } from "./schemas.js";
export interface PermissionCheckResult {
    service: PermissionServiceName;
    ok: boolean;
    action: string;
    summary?: Record<string, number | string | boolean>;
    error?: string;
    nextStep?: string;
}
export declare class PermissionsService {
    private readonly services;
    constructor(services: {
        mail: Pick<MailService, "requestPermission">;
        calendar: Pick<CalendarService, "requestAccess">;
        reminders: Pick<RemindersService, "requestAccess">;
    });
    request(args?: RequestPermissionsArgs): Promise<{
        ok: boolean;
        results: PermissionCheckResult[];
        note: string;
    }>;
    private requestOne;
    private mailResult;
    private calendarResult;
    private remindersResult;
}
