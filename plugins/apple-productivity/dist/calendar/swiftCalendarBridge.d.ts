export declare class SwiftCalendarBridgeError extends Error {
    readonly stderr?: string | undefined;
    constructor(message: string, stderr?: string | undefined);
}
export interface SwiftCalendarBridgeOptions {
    timeoutMs: number;
    helperPath?: string;
}
export declare class SwiftCalendarBridge {
    private readonly options;
    private readonly helperPath;
    constructor(options: SwiftCalendarBridgeOptions);
    run<T>(action: string, input?: unknown): Promise<T>;
    private runRaw;
}
