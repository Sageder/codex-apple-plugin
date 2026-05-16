export declare class AppleBridgeError extends Error {
    readonly stderr?: string | undefined;
    constructor(message: string, stderr?: string | undefined);
}
export interface AppleBridgeOptions {
    timeoutMs: number;
}
export declare class AppleBridge {
    private readonly options;
    constructor(options: AppleBridgeOptions);
    runJxa<T>(source: string, input?: unknown): Promise<T>;
    private runRawJxa;
}
