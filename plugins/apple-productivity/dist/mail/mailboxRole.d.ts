export type MailboxRole = "archive" | "trash";
export declare function rankMailboxForRole(name: string, role: MailboxRole): number;
export declare function resolveMailboxName(names: string[], role: MailboxRole): string | undefined;
