import { AppleBridgeError } from "./appleBridge.js";
import { SwiftCalendarBridgeError } from "./calendar/swiftCalendarBridge.js";
export function jsonResponse(data) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2)
            }
        ]
    };
}
export function errorResponse(error) {
    const data = error instanceof AppleBridgeError
        ? { error: error.message, details: error.stderr }
        : error instanceof SwiftCalendarBridgeError
            ? { error: error.message, details: error.stderr }
            : { error: error instanceof Error ? error.message : String(error) };
    return {
        isError: true,
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2)
            }
        ]
    };
}
//# sourceMappingURL=toolResponse.js.map