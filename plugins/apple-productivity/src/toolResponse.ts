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
  const data =
    error instanceof SwiftBridgeError
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
