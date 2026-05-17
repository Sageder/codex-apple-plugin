import { CalendarService } from "../src/calendar/calendarService.js";
import { SwiftCalendarBridge } from "../src/calendar/swiftCalendarBridge.js";
import { getRuntimeConfig } from "../src/config.js";
import { MailService } from "../src/mail/mailService.js";
import { PermissionsService } from "../src/permissions/permissionsService.js";
import { RemindersNativeBridge } from "../src/reminders/nativeBridge.js";
import { RemindersService } from "../src/reminders/remindersService.js";
import { SwiftBridge } from "../src/swiftBridge.js";

const config = getRuntimeConfig();
const permissions = new PermissionsService({
  mail: new MailService(new SwiftBridge({ timeoutMs: config.helperTimeoutMs }), config),
  calendar: new CalendarService(new SwiftCalendarBridge({ timeoutMs: config.helperTimeoutMs }), config),
  reminders: new RemindersService(new RemindersNativeBridge({ timeoutMs: config.helperTimeoutMs }), config)
});

const result = await permissions.request();

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
