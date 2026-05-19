export type MessagesServiceKind = "iMessage" | "SMS" | string;
export type MessageDirection = "all" | "incoming" | "outgoing";

export interface MessagesChatHandlePayload {
  chatId: number;
  guid: string;
}

export interface MessagesMessageHandlePayload {
  messageId: number;
  guid: string;
  chatId?: number;
}

export interface RawMessagesChatSummary {
  handle: MessagesChatHandlePayload;
  chatId: number;
  guid: string;
  chatIdentifier?: string;
  displayName?: string;
  serviceName?: string;
  participants: string[];
  participantCount: number;
  messageCount: number;
  unreadCount?: number;
  lastMessageDate?: string;
}

export interface MessagesChatSummary extends Omit<RawMessagesChatSummary, "handle"> {
  handle: string;
}

export interface RawMessagesMessageSummary {
  handle: MessagesMessageHandlePayload;
  chatHandle?: MessagesChatHandlePayload;
  messageId: number;
  guid: string;
  chatId?: number;
  chatIdentifier?: string;
  displayName?: string;
  service?: MessagesServiceKind;
  sender?: string;
  isFromMe: boolean;
  date?: string;
  text: string;
  textChars: number;
  truncated: boolean;
  hasAttachments: boolean;
  attachmentCount: number;
}

export interface MessagesMessageSummary extends Omit<RawMessagesMessageSummary, "handle" | "chatHandle"> {
  handle: string;
  chatHandle?: string;
}
