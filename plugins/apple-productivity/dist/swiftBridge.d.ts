export declare class SwiftBridgeError extends Error {
    readonly stderr?: string | undefined;
    constructor(message: string, stderr?: string | undefined);
}
export interface SwiftBridgeOptions {
    timeoutMs: number;
}
export declare class SwiftBridge {
    private readonly options;
    private readonly pluginRoot;
    constructor(options: SwiftBridgeOptions);
    call<T>(command: string, input?: unknown): Promise<T>;
    private runHelper;
}
