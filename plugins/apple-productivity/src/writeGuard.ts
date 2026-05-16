import type { RuntimeConfig } from "./config.js";

export type ProductivityWriteAction =
  | "mail.send"
  | "mail.archive"
  | "mail.delete"
  | "mail.move"
  | "calendar.create"
  | "calendar.update"
  | "calendar.delete"
  | "reminders.create"
  | "reminders.update"
  | "reminders.complete"
  | "reminders.delete"
  | "reminders.move";

export type WriteAction = ProductivityWriteAction | "send" | "archive" | "delete" | "move";

export interface WriteDecision {
  allowed: boolean;
  mode: RuntimeConfig["writeMode"];
  reason: string;
}

export function decideWrite(
  config: Pick<RuntimeConfig, "writeMode">,
  action: WriteAction,
  confirm?: boolean,
  dryRun?: boolean
): WriteDecision {
  const label = actionLabel(action);

  if (dryRun) {
    return {
      allowed: false,
      mode: config.writeMode,
      reason: `${label} dry run requested`
    };
  }

  if (config.writeMode === "direct") {
    return {
      allowed: true,
      mode: config.writeMode,
      reason: "direct write mode enabled"
    };
  }

  if (config.writeMode === "confirm") {
    return {
      allowed: confirm === true,
      mode: config.writeMode,
      reason: confirm === true ? "explicit confirmation supplied" : "confirmation required"
    };
  }

  return {
    allowed: false,
    mode: config.writeMode,
    reason: "draft mode prevents irreversible writes"
  };
}

function actionLabel(action: WriteAction): string {
  return action.includes(".") ? action : `mail.${action}`;
}
