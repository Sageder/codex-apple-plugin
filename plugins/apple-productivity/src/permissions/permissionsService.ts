import type { CalendarService } from "../calendar/calendarService.js";
import type { MailService } from "../mail/mailService.js";
import type { RemindersService } from "../reminders/remindersService.js";
import type { PermissionServiceName, RequestPermissionsArgs } from "./schemas.js";

const ALL_SERVICES: PermissionServiceName[] = ["mail", "calendar", "reminders"];

export interface PermissionCheckResult {
  service: PermissionServiceName;
  ok: boolean;
  action: string;
  summary?: Record<string, number | string | boolean>;
  error?: string;
  nextStep?: string;
}

export class PermissionsService {
  constructor(
    private readonly services: {
      mail: Pick<MailService, "requestPermission">;
      calendar: Pick<CalendarService, "requestAccess">;
      reminders: Pick<RemindersService, "requestAccess">;
    }
  ) {}

  async request(args: RequestPermissionsArgs = {}) {
    const serviceNames = args.services ?? ALL_SERVICES;
    const results: PermissionCheckResult[] = [];

    for (const serviceName of serviceNames) {
      results.push(await this.requestOne(serviceName));
    }

    return {
      ok: results.every((result) => result.ok),
      results,
      note:
        "This only triggers macOS permission prompts and verifies basic access. It does not read mail bodies, calendar notes, or reminder notes."
    };
  }

  private async requestOne(service: PermissionServiceName): Promise<PermissionCheckResult> {
    try {
      switch (service) {
        case "mail":
          return this.mailResult(await this.services.mail.requestPermission());
        case "calendar":
          return this.calendarResult(await this.services.calendar.requestAccess());
        case "reminders":
          return this.remindersResult(await this.services.reminders.requestAccess());
      }
    } catch (error) {
      return {
        service,
        ok: false,
        action: actionFor(service),
        error: formatError(error),
        nextStep: nextStepFor(service)
      };
    }
  }

  private mailResult(result: MailPermissionProbe): PermissionCheckResult {
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

  private calendarResult(result: AccessProbe): PermissionCheckResult {
    return {
      service: "calendar",
      ok: true,
      action: "requestAccess",
      summary: {
        authorizationStatus: result.authorizationStatus
      }
    };
  }

  private remindersResult(result: AccessProbe): PermissionCheckResult {
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

interface MailPermissionProbe {
  accountCount: number;
  mailboxCount: number;
}

interface AccessProbe {
  authorizationStatus: string;
}

function actionFor(service: PermissionServiceName): string {
  if (service === "mail") {
    return "mail.requestPermission";
  }
  return "requestAccess";
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof error === "object" && error !== null && "stderr" in error && typeof error.stderr === "string") {
    const detail = error.stderr.trim();
    if (detail) {
      return `${message}: ${detail.slice(0, 1000)}`;
    }
  }
  return message;
}

function nextStepFor(service: PermissionServiceName): string {
  switch (service) {
    case "mail":
      return "Approve the macOS Automation prompt for Mail, or enable it in System Settings > Privacy & Security > Automation.";
    case "calendar":
      return "Approve the macOS Calendar prompt, or enable it in System Settings > Privacy & Security > Calendars.";
    case "reminders":
      return "Approve the macOS Reminders prompt, or enable it in System Settings > Privacy & Security > Reminders.";
  }
}
