import type { RuntimeConfig } from "./config.js";

export type WriteAction =
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
  | "reminders.move"
  | "messages.send";

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

  return {
    allowed: confirm === true,
    mode: config.writeMode,
    reason: confirm === true ? "explicit confirmation supplied" : "confirm: true required in ask mode"
  };
}

function actionLabel(action: WriteAction): string {
  return action;
}
