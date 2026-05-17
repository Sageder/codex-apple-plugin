import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import { decodeCalendarEventHandle, encodeCalendarEventHandle } from "./handle.js";
import type {
  CalendarEventBody,
  CalendarEventFields,
  CalendarEventPatch,
  CalendarEventSummary,
  CalendarInfo,
  CalendarMutationSpan,
  CalendarSearchInput,
  RawCalendarEventBody,
  RawCalendarEventSummary
} from "./types.js";

export interface CalendarRuntime {
  run<T>(action: string, input?: unknown): Promise<T>;
}

export interface CalendarSearchArgs {
  query?: string;
  calendarId?: string;
  calendarName?: string;
  from?: string;
  to?: string;
  includeCancelled?: boolean;
  limit?: number;
}

export interface CalendarCreateArgs extends CalendarEventFields {
  calendarId?: string;
  calendarName?: string;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface CalendarUpdateArgs {
  handle: string;
  span: CalendarMutationSpan;
  patch: CalendarEventPatch;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface CalendarDeleteArgs {
  handle: string;
  span: CalendarMutationSpan;
  confirm?: boolean;
  dryRun?: boolean;
}

export interface CalendarReadArgs {
  handle: string;
}

export class CalendarService {
  constructor(
    private readonly runtime: CalendarRuntime,
    private readonly config: RuntimeConfig
  ) {}

  async listCalendars(): Promise<{ calendars: CalendarInfo[] }> {
    const calendars = await this.runtime.run<CalendarInfo[]>("listCalendars");
    return { calendars };
  }

  async requestAccess(): Promise<{ authorizationStatus: string }> {
    return this.runtime.run<{ authorizationStatus: string }>("requestAccess");
  }

  async searchEvents(args: CalendarSearchArgs): Promise<{ events: CalendarEventSummary[] }> {
    const input = searchInput(args);
    const raw = await this.runtime.run<RawCalendarEventSummary[]>("searchEvents", {
      ...input,
      notesLimit: this.config.maxBodyChars
    });

    return { events: raw.map(encodeSummary) };
  }

  async readEvent(args: CalendarReadArgs): Promise<{ event: CalendarEventBody }> {
    const raw = await this.runtime.run<RawCalendarEventBody>("readEvent", {
      handle: decodeCalendarEventHandle(args.handle),
      notesLimit: this.config.maxBodyChars
    });

    return { event: encodeBody(raw) };
  }

  async createEvent(args: CalendarCreateArgs) {
    const decision = decideWrite(this.config, "calendar.create", args.confirm, args.dryRun);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        created: false,
        preview: previewCreate(args),
        reason: decision.reason
      };
    }

    const raw = await this.runtime.run<{ created: true; event: RawCalendarEventBody }>("createEvent", {
      ...stripWriteArgs(args),
      notesLimit: this.config.maxBodyChars
    });
    return { ...raw, event: encodeBody(raw.event) };
  }

  async updateEvent(args: CalendarUpdateArgs) {
    const decision = decideWrite(this.config, "calendar.update", args.confirm, args.dryRun);
    const handle = decodeCalendarEventHandle(args.handle);

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        updated: false,
        preview: {
          handle,
          span: args.span,
          patch: previewPatch(args.patch)
        },
        reason: decision.reason
      };
    }

    const raw = await this.runtime.run<{ updated: true; span: CalendarMutationSpan; event: RawCalendarEventBody }>(
      "updateEvent",
      {
        handle,
        span: args.span,
        patch: args.patch,
        notesLimit: this.config.maxBodyChars
      }
    );
    return { ...raw, event: encodeBody(raw.event) };
  }

  async deleteEvent(args: CalendarDeleteArgs) {
    const decision = decideWrite(this.config, "calendar.delete", args.confirm, args.dryRun);
    const handle = decodeCalendarEventHandle(args.handle);

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        deleted: false,
        preview: {
          handle,
          span: args.span
        },
        reason: decision.reason
      };
    }

    return this.runtime.run("deleteEvent", {
      handle,
      span: args.span
    });
  }

  async showEvent(args: CalendarReadArgs) {
    return this.runtime.run("showEvent", {
      handle: decodeCalendarEventHandle(args.handle)
    });
  }
}

function searchInput(args: CalendarSearchArgs): CalendarSearchInput {
  const from = args.from ? new Date(args.from) : startOfToday();
  const to = args.to ? new Date(args.to) : addDays(from, 30);

  return {
    query: args.query,
    calendarId: args.calendarId,
    calendarName: args.calendarName,
    from: from.toISOString(),
    to: to.toISOString(),
    includeCancelled: args.includeCancelled ?? false,
    limit: args.limit ?? 50
  };
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function encodeSummary(raw: RawCalendarEventSummary): CalendarEventSummary {
  return {
    ...raw,
    handle: encodeCalendarEventHandle(raw.handle)
  };
}

function encodeBody(raw: RawCalendarEventBody): CalendarEventBody {
  return {
    ...raw,
    handle: encodeCalendarEventHandle(raw.handle)
  };
}

function stripWriteArgs(args: CalendarCreateArgs) {
  const { confirm: _confirm, dryRun: _dryRun, ...input } = args;
  return input;
}

function previewCreate(args: CalendarCreateArgs) {
  return {
    calendarId: args.calendarId,
    calendarName: args.calendarName,
    summary: args.summary,
    start: args.start,
    end: args.end,
    allDay: args.allDay ?? false,
    hasLocation: Boolean(args.location),
    notesChars: args.notes?.length ?? 0,
    hasUrl: Boolean(args.url),
    hasRecurrence: Boolean(args.recurrence),
    alarmCount: args.alarms?.length ?? 0
  };
}

function previewPatch(patch: CalendarEventPatch) {
  return {
    fields: Object.keys(patch),
    notesChars: patch.notes?.length,
    alarmCount: patch.alarms?.length
  };
}
