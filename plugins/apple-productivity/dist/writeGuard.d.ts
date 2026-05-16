import type { RuntimeConfig } from "./config.js";
export type WriteAction = "send" | "archive" | "delete" | "move";
export interface WriteDecision {
    allowed: boolean;
    mode: RuntimeConfig["writeMode"];
    reason: string;
}
export declare function decideWrite(config: Pick<RuntimeConfig, "writeMode">, action: WriteAction, confirm?: boolean, dryRun?: boolean): WriteDecision;
