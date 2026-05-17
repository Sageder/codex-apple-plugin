import { z } from "zod";
export declare const permissionServiceSchema: z.ZodEnum<{
    calendar: "calendar";
    reminders: "reminders";
    mail: "mail";
}>;
export declare const requestPermissionsSchema: z.ZodObject<{
    services: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        calendar: "calendar";
        reminders: "reminders";
        mail: "mail";
    }>>>;
}, z.core.$strict>;
export type PermissionServiceName = z.infer<typeof permissionServiceSchema>;
export type RequestPermissionsArgs = z.infer<typeof requestPermissionsSchema>;
