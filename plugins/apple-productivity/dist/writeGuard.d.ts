import type { RuntimeConfig } from "./config.js";
export type ProductivityWriteAction = "mail.send" | "mail.archive" | "mail.delete" | "mail.move" | "calendar.create" | "calendar.update" | "calendar.delete" | "reminders.create" | "reminders.update" | "reminders.complete" | "reminders.delete" | "reminders.move";
export type WriteAction = ProductivityWriteAction | "send" | "archive" | "delete" | "move";
export interface WriteDecision {
    allowed: boolean;
    mode: RuntimeConfig["writeMode"];
    reason: string;
}
export declare function decideWrite(config: Pick<RuntimeConfig, "writeMode">, action: WriteAction, confirm?: boolean, dryRun?: boolean): WriteDecision;
