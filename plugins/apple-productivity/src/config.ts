export type WriteMode = "draft" | "confirm" | "direct";

export interface RuntimeConfig {
  writeMode: WriteMode;
  maxBodyChars: number;
  retrievalCandidateLimit: number;
  contextTopK: number;
  osascriptTimeoutMs: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseWriteMode(value: string | undefined): WriteMode {
  if (value === "confirm" || value === "direct" || value === "draft") {
    return value;
  }

  return "draft";
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    writeMode: parseWriteMode(env.APPLE_PRODUCTIVITY_WRITE_MODE),
    maxBodyChars: parsePositiveInt(env.APPLE_PRODUCTIVITY_MAX_BODY_CHARS, 12000),
    retrievalCandidateLimit: parsePositiveInt(env.APPLE_PRODUCTIVITY_RETRIEVAL_CANDIDATE_LIMIT, 30),
    contextTopK: parsePositiveInt(env.APPLE_PRODUCTIVITY_CONTEXT_TOP_K, 5),
    osascriptTimeoutMs: parsePositiveInt(env.APPLE_PRODUCTIVITY_OSASCRIPT_TIMEOUT_MS, 60000)
  };
}
