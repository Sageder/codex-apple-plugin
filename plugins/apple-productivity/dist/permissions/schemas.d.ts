import { z } from "zod";
export declare const permissionServiceSchema: z.ZodEnum<{
    reminders: "reminders";
    mail: "mail";
    calendar: "calendar";
}>;
export declare const requestPermissionsSchema: z.ZodObject<{
    services: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        reminders: "reminders";
        mail: "mail";
        calendar: "calendar";
    }>>>;
}, z.core.$strict>;
export type PermissionServiceName = z.infer<typeof permissionServiceSchema>;
export type RequestPermissionsArgs = z.infer<typeof requestPermissionsSchema>;
