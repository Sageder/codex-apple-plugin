import { errorResponse, jsonResponse } from "../toolResponse.js";
import { requestPermissionsSchema } from "./schemas.js";
export function registerPermissionTools(server, permissions) {
    server.registerTool("apple_productivity_request_permissions", {
        title: "Request Apple Productivity permissions",
        description: "First-run setup tool that triggers macOS permission prompts for Apple Mail Automation, Calendar, and Reminders. Run this when Apple Productivity is newly installed or a user reports permission failures.",
        inputSchema: requestPermissionsSchema,
        annotations: { readOnlyHint: true, destructiveHint: false }
    }, async (args) => {
        try {
            return jsonResponse(await permissions.request(args));
        }
        catch (error) {
            return errorResponse(error);
        }
    });
}
//# sourceMappingURL=tools.js.map