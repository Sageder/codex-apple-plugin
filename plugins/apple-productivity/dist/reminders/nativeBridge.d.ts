export declare class RemindersNativeBridgeError extends Error {
    readonly stderr?: string | undefined;
    constructor(message: string, stderr?: string | undefined);
}
export interface RemindersNativeBridgeOptions {
    helperPath?: string;
    timeoutMs: number;
}
export interface RemindersBackend {
    run<T>(action: string, input?: unknown): Promise<T>;
}
export declare class RemindersNativeBridge implements RemindersBackend {
    private readonly options;
    private readonly helperPath;
    constructor(options: RemindersNativeBridgeOptions);
    run<T>(action: string, input?: unknown): Promise<T>;
    private runAppBundle;
}
