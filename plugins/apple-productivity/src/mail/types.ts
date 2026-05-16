export interface MailAccount {
  name: string;
  emailAddresses: string[];
  mailboxes: string[];
}

export type MailboxRole = "inbox" | "sent" | "archive" | "trash" | "junk" | "other";
export type MailSearchScope = "inbox" | "sent" | "archive" | "trash" | "junk" | "all" | "mailbox";
export type MailMoveRole = "inbox" | "archive" | "trash" | "junk";

export interface MailboxInfo {
  account: string;
  name: string;
  role: MailboxRole;
}

export interface MessageHandlePayload {
  account: string;
  mailbox: string;
  id: number;
  messageId?: string;
}

export interface MailRecipient {
  name: string;
  address: string;
}

export interface MailMessageSummary {
  handle: string;
  account: string;
  mailbox: string;
  id: number;
  messageId?: string;
  subject: string;
  sender: string;
  recipients: MailRecipient[];
  dateReceived?: string;
  dateSent?: string;
  read: boolean;
  flagged: boolean;
  size?: number;
  score?: number;
}

export interface MailMessageBody extends MailMessageSummary {
  content: string;
  truncated: boolean;
  attachments: Array<{ name: string }>;
}

export interface SearchMessagesInput {
  query?: string;
  subject?: string;
  account?: string;
  mailbox?: string;
  scope?: MailSearchScope;
  sender?: string;
  recipient?: string;
  participant?: string;
  unreadOnly?: boolean;
  since?: string;
  before?: string;
  includeTrash?: boolean;
  limit: number;
  maxScanPerMailbox: number;
}

export interface MoveResult {
  id: number;
  messageId?: string;
  account: string;
  fromMailbox: string;
  toMailbox: string;
}

export interface MailUndoToken {
  action: string;
  account: string;
  id: number;
  messageId?: string;
  fromMailbox: string;
  toMailbox: string;
  createdAt: string;
}

export interface RawMessageSummary extends Omit<MailMessageSummary, "handle"> {
  handle: MessageHandlePayload;
}

export interface RawMessageBody extends Omit<MailMessageBody, "handle"> {
  handle: MessageHandlePayload;
}
