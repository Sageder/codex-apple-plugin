export type WriteMode = "ask" | "direct";
export type AppleServiceName = "mail" | "calendar" | "reminders";

export interface RuntimeConfig {
  writeMode: WriteMode;
  maxBodyChars: number;
  retrievalCandidateLimit: number;
  contextTopK: number;
  helperTimeoutMs: number;
  defaultRemindersList?: string;
}

const SERVICE_ENV_PREFIX: Record<AppleServiceName, string> = {
  mail: "APPLE_MAIL",
  calendar: "APPLE_CALENDAR",
  reminders: "APPLE_REMINDERS"
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseWriteMode(value: string | undefined): WriteMode {
  if (value === "direct") {
    return "direct";
  }

  if (value === "ask" || value === "confirm") {
    return "ask";
  }

  return "ask";
}

function envValue(env: NodeJS.ProcessEnv, key: string, service?: AppleServiceName): string | undefined {
  if (!service) {
    return env[`APPLE_PRODUCTIVITY_${key}`];
  }

  return env[`${SERVICE_ENV_PREFIX[service]}_${key}`] ?? env[`APPLE_PRODUCTIVITY_${key}`];
}

export function getRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  service?: AppleServiceName
): RuntimeConfig {
  return {
    writeMode: parseWriteMode(envValue(env, "WRITE_MODE", service)),
    maxBodyChars: parsePositiveInt(envValue(env, "MAX_BODY_CHARS", service), 12000),
    retrievalCandidateLimit: parsePositiveInt(env.APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT, 30),
    contextTopK: parsePositiveInt(env.APPLE_PRODUCTIVITY_CONTEXT_TOP_K, 5),
    helperTimeoutMs: parsePositiveInt(env.APPLE_PRODUCTIVITY_HELPER_TIMEOUT_MS, 60000),
    defaultRemindersList:
      env.APPLE_REMINDERS_DEFAULT_LIST?.trim() || env.APPLE_PRODUCTIVITY_DEFAULT_REMINDERS_LIST?.trim() || undefined
  };
}
