import { AppleBridgeError } from "./appleBridge.js";
import { SwiftCalendarBridgeError } from "./calendar/swiftCalendarBridge.js";

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
  const data =
    error instanceof AppleBridgeError
      ? { error: error.message, details: error.stderr }
      : error instanceof SwiftCalendarBridgeError
        ? { error: error.message, details: error.stderr }
      : { error: error instanceof Error ? error.message : String(error) };

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
