import type { AppleServiceName } from "../config.js";
import type { AppleScriptProbeResult } from "./appleScriptBootstrap.js";
import type { RequestServicePermissionArgs } from "./schemas.js";

export interface PermissionCheckResult {
  service: AppleServiceName;
  ok: boolean;
  appleScript?: AppleScriptProbeResult;
  native?: {
    action: string;
    summary: Record<string, number | string | boolean>;
  };
  error?: string;
  nextStep?: string;
}

export interface ServicePermissionOptions<TNativeResult> {
  service: AppleServiceName;
  nativeAction?: string;
  appleScript: {
    request(service: AppleServiceName): Promise<AppleScriptProbeResult>;
  };
  nativeProbe?: () => Promise<TNativeResult>;
  summarizeNative?: (result: TNativeResult) => Record<string, number | string | boolean>;
  nextStep: string;
}

export class PermissionsService<TNativeResult> {
  constructor(private readonly options: ServicePermissionOptions<TNativeResult>) {}

  async request(_args: RequestServicePermissionArgs = {}) {
    const result = await this.requestOne();

    return {
      ok: result.ok,
      result,
      note: this.options.nativeProbe
        ? "This runs an AppleScript metadata-only permission trigger, then verifies native access. It does not read mail bodies, calendar notes, or reminder notes."
        : "This runs an AppleScript metadata-only permission trigger and returns explicit setup guidance. It does not read mail bodies, calendar notes, or reminder notes."
    };
  }

  private async requestOne(): Promise<PermissionCheckResult> {
    try {
      const appleScript = await this.options.appleScript.request(this.options.service);

      if (!this.options.nativeProbe || !this.options.nativeAction || !this.options.summarizeNative) {
        return {
          service: this.options.service,
          ok: true,
          appleScript,
          nextStep: this.options.nextStep
        };
      }

      const nativeResult = await this.options.nativeProbe();

      return {
        service: this.options.service,
        ok: true,
        appleScript,
        native: {
          action: this.options.nativeAction,
          summary: this.options.summarizeNative(nativeResult)
        }
      };
    } catch (error) {
      return {
        service: this.options.service,
        ok: false,
        error: formatError(error),
        nextStep: this.options.nextStep
      };
    }
  }
}

export function summarizeMailPermission(result: { accountCount: number; mailboxCount: number }) {
  return {
    accountCount: result.accountCount,
    mailboxCount: result.mailboxCount
  };
}

export function summarizeAccessStatus(result: { authorizationStatus: string }) {
  return {
    authorizationStatus: result.authorizationStatus
  };
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof error === "object" && error !== null && "stderr" in error && typeof error.stderr === "string") {
    const detail = error.stderr.trim();
    if (detail) {
      return `${message}: ${detail.slice(0, 1000)}`;
    }
  }
  return message;
}
