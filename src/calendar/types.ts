export interface CalendarInfo {
  id: string;
  name: string;
  writable: boolean;
  description?: string;
  color?: string;
  eventCount?: number;
}

export interface CalendarEventHandlePayload {
  calendarId: string;
  uid: string;
  occurrenceStart?: string;
}

export type CalendarEventStatus = "cancelled" | "confirmed" | "none" | "tentative";

export interface CalendarAttendee {
  displayName: string;
  email: string;
  participationStatus: string;
}

export interface CalendarAlarm {
  type: "display" | "sound";
  triggerInterval?: number;
  triggerDate?: string;
  soundName?: string;
}

export interface CalendarEventSummary {
  handle: string;
  calendarId: string;
  calendarName: string;
  calendarWritable: boolean;
  uid: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  notesPreview?: string;
  notesTruncated: boolean;
  url?: string;
  recurrence?: string;
  status?: string;
  modified?: string;
  attendees: CalendarAttendee[];
  alarms: CalendarAlarm[];
  recurring: boolean;
  score?: number;
}

export interface CalendarEventBody extends CalendarEventSummary {}

export interface RawCalendarEventSummary extends Omit<CalendarEventSummary, "handle"> {
  handle: CalendarEventHandlePayload;
}

export interface RawCalendarEventBody extends Omit<CalendarEventBody, "handle"> {
  handle: CalendarEventHandlePayload;
}

export interface CalendarSearchInput {
  query?: string;
  calendarId?: string;
  calendarName?: string;
  from: string;
  to: string;
  includeCancelled: boolean;
  limit: number;
}

export interface CalendarEventFields {
  summary: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
  url?: string;
  recurrence?: string;
  status?: CalendarEventStatus;
  alarms?: CalendarAlarm[];
}

export type CalendarEventPatch = Partial<CalendarEventFields>;

export type CalendarMutationSpan = "this" | "all";
