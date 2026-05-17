import { getRuntimeConfig } from "../src/config.js";
import { MailService } from "../src/mail/mailService.js";
import { AppleScriptPermissionBootstrap, OsascriptRunner } from "../src/permissions/appleScriptBootstrap.js";
import {
  PermissionsService,
  summarizeAccessStatus,
  summarizeMailPermission
} from "../src/permissions/permissionsService.js";
import { RemindersNativeBridge } from "../src/reminders/nativeBridge.js";
import { RemindersService } from "../src/reminders/remindersService.js";
import { SwiftBridge } from "../src/swiftBridge.js";

const mailConfig = getRuntimeConfig(process.env, "mail");
const remindersConfig = getRuntimeConfig(process.env, "reminders");

const mail = new MailService(new SwiftBridge({ timeoutMs: mailConfig.helperTimeoutMs }), mailConfig);
const reminders = new RemindersService(
  new RemindersNativeBridge({ timeoutMs: remindersConfig.helperTimeoutMs }),
  remindersConfig
);

const sharedAppleScript = new AppleScriptPermissionBootstrap(new OsascriptRunner(mailConfig.helperTimeoutMs));
const checks = [
  new PermissionsService({
    service: "mail",
    nativeAction: "mail.requestPermission",
    appleScript: sharedAppleScript,
    nativeProbe: () => mail.requestPermission(),
    summarizeNative: summarizeMailPermission,
    nextStep:
      "Approve the macOS Automation prompt for Mail, or enable Codex for Mail in System Settings > Privacy & Security > Automation."
  }),
  new PermissionsService({
    service: "calendar",
    appleScript: sharedAppleScript,
    nextStep:
      "After accepting the Calendar prompt, open System Settings > Privacy & Security > Calendars and enable Full Access for Codex or the apple-calendar helper entry shown by macOS before using Calendar tools."
  }),
  new PermissionsService({
    service: "reminders",
    nativeAction: "requestAccess",
    appleScript: sharedAppleScript,
    nativeProbe: () => reminders.requestAccess(),
    summarizeNative: summarizeAccessStatus,
    nextStep:
      "Approve the macOS Reminders prompt, or enable Codex in System Settings > Privacy & Security > Reminders."
  })
];

const results = [];
for (const check of checks) {
  results.push(await check.request());
}

const result = {
  ok: results.every((entry) => entry.ok),
  results,
  note:
    "Each check runs an AppleScript metadata-only permission trigger. Mail and Reminders also verify native access; Calendar returns explicit Full Access setup guidance instead of running a native probe. No mail bodies, calendar notes, or reminder notes are printed."
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}
