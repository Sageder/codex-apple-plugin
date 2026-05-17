export interface AppBundleRunOptions<E extends Error> {
    executablePath: string;
    action: string;
    input: unknown;
    timeoutMs: number;
    createError: (message: string, stderr?: string) => E;
}
export declare function appBundlePathForExecutable(executablePath: string): string | undefined;
export declare function helperContainerTmpDir(bundleId: string | undefined): string;
export declare function runAppBundleHelper<E extends Error>(options: AppBundleRunOptions<E>): Promise<string>;
