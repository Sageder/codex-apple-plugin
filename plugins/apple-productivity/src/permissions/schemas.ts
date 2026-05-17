import { z } from "zod";

export const permissionServiceSchema = z.enum(["mail", "calendar", "reminders"]);

export const requestPermissionsSchema = z
  .object({
    services: z
      .array(permissionServiceSchema)
      .min(1)
      .max(3)
      .optional()
      .describe("Apple app permission prompts to trigger. Defaults to Mail, Calendar, and Reminders.")
  })
  .strict();

export type PermissionServiceName = z.infer<typeof permissionServiceSchema>;
export type RequestPermissionsArgs = z.infer<typeof requestPermissionsSchema>;
