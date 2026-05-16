export type WriteMode = "draft" | "confirm" | "direct";
export interface RuntimeConfig {
    writeMode: WriteMode;
    maxBodyChars: number;
    retrievalCandidateLimit: number;
    contextTopK: number;
    osascriptTimeoutMs: number;
    defaultRemindersList?: string;
}
export declare function getRuntimeConfig(env?: NodeJS.ProcessEnv): RuntimeConfig;
