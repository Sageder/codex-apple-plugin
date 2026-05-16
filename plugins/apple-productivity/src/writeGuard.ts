import type { RuntimeConfig } from "./config.js";

export type WriteAction = "send" | "archive" | "delete" | "move";

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
  if (dryRun) {
    return {
      allowed: false,
      mode: config.writeMode,
      reason: `${action} dry run requested`
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
