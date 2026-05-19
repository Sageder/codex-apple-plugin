import { SwiftCalendarBridgeError } from "./calendar/swiftCalendarBridge.js";
import { NotesBridgeError } from "./notes/notesBridge.js";
import { AppleScriptPermissionError } from "./permissions/appleScriptBootstrap.js";
import { RemindersNativeBridgeError } from "./reminders/nativeBridge.js";
import { SwiftBridgeError } from "./swiftBridge.js";

export function jsonResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

export function errorResponse(error: unknown) {
  const data = withSetup(
    error instanceof SwiftBridgeError
      ? { error: error.message, details: error.stderr }
      : error instanceof SwiftCalendarBridgeError
        ? { error: error.message, details: error.stderr }
      : error instanceof RemindersNativeBridgeError
        ? { error: error.message, details: error.stderr }
      : error instanceof NotesBridgeError
        ? { error: error.message, details: error.stderr }
      : error instanceof AppleScriptPermissionError
        ? { error: error.message, details: error.stderr }
      : { error: error instanceof Error ? error.message : String(error) },
    error
  );

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function withSetup(data: Record<string, unknown>, error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null || !("setup" in error)) {
    return data;
  }

  const setup = (error as { setup?: unknown }).setup;
  if (typeof setup !== "object" || setup === null) {
    return data;
  }

  return { ...data, setup };
}
