export type WriteMode = "ask" | "direct";
export interface RuntimeConfig {
    writeMode: WriteMode;
    maxBodyChars: number;
    retrievalCandidateLimit: number;
    contextTopK: number;
    helperTimeoutMs: number;
    defaultRemindersList?: string;
}
export declare function getRuntimeConfig(env?: NodeJS.ProcessEnv): RuntimeConfig;
