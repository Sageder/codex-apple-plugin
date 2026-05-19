export const MESSAGES_FULL_DISK_ACCESS_REQUIREMENT =
  "Apple Messages reads require Full Disk Access for Codex or the app that launches this MCP server.";

export const MESSAGES_FULL_DISK_ACCESS_CANNOT_PROMPT =
  "macOS does not provide an API or first-run prompt for Full Disk Access, so the user must grant it manually.";

export const MESSAGES_FULL_DISK_ACCESS_STEPS = [
  "Open System Settings > Privacy & Security > Full Disk Access.",
  "Enable Codex. If the MCP server is launched from Terminal, iTerm, or another host app, enable that app too.",
  "Quit and reopen Codex or the launching app.",
  "Run messages_request_permissions or npm run smoke:messages again."
];

export const MESSAGES_AUTOMATION_STEP =
  "For sending, also approve the macOS Automation prompt for Messages or enable Codex > Messages in System Settings > Privacy & Security > Automation.";

export const MESSAGES_PERMISSION_NEXT_STEP = [
  MESSAGES_FULL_DISK_ACCESS_REQUIREMENT,
  MESSAGES_FULL_DISK_ACCESS_CANNOT_PROMPT,
  ...MESSAGES_FULL_DISK_ACCESS_STEPS,
  MESSAGES_AUTOMATION_STEP
].join(" ");

export function messagesFullDiskAccessSetup() {
  return {
    requiredAccess: "Full Disk Access",
    cannotAutoPrompt: true,
    reason: MESSAGES_FULL_DISK_ACCESS_REQUIREMENT,
    steps: MESSAGES_FULL_DISK_ACCESS_STEPS,
    automationForSending: MESSAGES_AUTOMATION_STEP
  };
}
