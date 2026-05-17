import { z } from "zod";

export const requestServicePermissionSchema = z.object({}).strict();

export type RequestServicePermissionArgs = z.infer<typeof requestServicePermissionSchema>;
