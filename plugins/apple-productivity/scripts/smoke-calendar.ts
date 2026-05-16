import { CalendarService } from "../src/calendar/calendarService.js";
import { SwiftCalendarBridge } from "../src/calendar/swiftCalendarBridge.js";
import { getRuntimeConfig } from "../src/config.js";

const config = getRuntimeConfig();
const calendar = new CalendarService(new SwiftCalendarBridge({ timeoutMs: config.osascriptTimeoutMs }), config);

const calendars = await calendar.listCalendars();
const writableCount = calendars.calendars.filter((entry) => entry.writable).length;
console.log(`Apple Calendar calendars: ${calendars.calendars.length}`);
console.log(`Writable calendars: ${writableCount}`);

const from = new Date();
const to = new Date(from);
to.setDate(to.getDate() + 7);

const search = await calendar.searchEvents({
  from: from.toISOString(),
  to: to.toISOString(),
  limit: 10
});

console.log(`Apple Calendar events in next 7 days: ${search.events.length}`);
