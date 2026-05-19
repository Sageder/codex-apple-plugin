import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import { decodeMessagesChatHandle, decodeMessagesMessageHandle, encodeMessagesChatHandle, encodeMessagesMessageHandle } from "./handle.js";
import type { MessagesSendResult, MessagesSendRuntimeArgs } from "./sender.js";
import type {
  MessageDirection,
  MessagesChatSummary,
  MessagesMessageSummary,
  RawMessagesChatSummary,
  RawMessagesMessageSummary
} from "./types.js";

export interface MessagesStore {
  requestAccess(): Promise<{ chatCount: number; messageCount: number }>;
  listChats(args: MessagesListChatsArgs): Promise<RawMessagesChatSummary[]>;
  fetchNew(args: MessagesStoreQueryArgs): Promise<RawMessagesMessageSummary[]>;
  search(args: MessagesStoreQueryArgs): Promise<RawMessagesMessageSummary[]>;
  read(args: MessagesStoreReadArgs): Promise<RawMessagesMessageSummary[]>;
}

export interface MessagesSender {
  send(args: MessagesSendRuntimeArgs): Promise<MessagesSendResult>;
}

export interface MessagesListChatsArgs {
  query?: string;
  participant?: string;
  service?: "iMessage" | "SMS";
  limit?: number;
}

export interface MessagesFetchNewArgs {
  since?: string;
  before?: string;
  participant?: string;
  chatHandle?: string;
  service?: "iMessage" | "SMS";
  unreadOnly?: boolean;
  includeSent?: boolean;
  limit?: number;
  maxTextChars?: number;
}

export interface MessagesSearchArgs {
  query?: string;
  participant?: string;
  chatHandle?: string;
  service?: "iMessage" | "SMS";
  direction?: MessageDirection;
  unreadOnly?: boolean;
  since?: string;
  before?: string;
  limit?: number;
  maxTextChars?: number;
}

export interface MessagesReadArgs {
  handles?: string[];
  chatHandle?: string;
  since?: string;
  before?: string;
  direction?: MessageDirection;
  limit?: number;
  maxTextChars?: number;
}

export interface MessagesSendArgs {
  recipient: string;
  text: string;
  service?: "iMessage" | "SMS";
  confirm?: boolean;
  dryRun?: boolean;
}

export type MessagesStoreQueryArgs = Omit<MessagesSearchArgs, "chatHandle"> & {
  chatHandle?: ReturnType<typeof decodeMessagesChatHandle>;
};

export type MessagesStoreReadArgs = Omit<MessagesReadArgs, "handles" | "chatHandle"> & {
  handles?: ReturnType<typeof decodeMessagesMessageHandle>[];
  chatHandle?: ReturnType<typeof decodeMessagesChatHandle>;
};

export class MessagesService {
  constructor(
    private readonly store: MessagesStore,
    private readonly sender: MessagesSender,
    private readonly config: RuntimeConfig
  ) {}

  async requestAccess(): Promise<{ chatCount: number; messageCount: number }> {
    return this.store.requestAccess();
  }

  async listChats(args: MessagesListChatsArgs): Promise<{ chats: MessagesChatSummary[] }> {
    const chats = await this.store.listChats(args);
    return { chats: chats.map(encodeChat) };
  }

  async fetchNew(args: MessagesFetchNewArgs): Promise<{ messages: MessagesMessageSummary[] }> {
    const messages = await this.store.fetchNew({
      ...args,
      chatHandle: args.chatHandle ? decodeMessagesChatHandle(args.chatHandle) : undefined,
      maxTextChars: args.maxTextChars ?? this.config.maxBodyChars
    });
    return { messages: messages.map(encodeMessage) };
  }

  async search(args: MessagesSearchArgs): Promise<{ messages: MessagesMessageSummary[] }> {
    const messages = await this.store.search({
      ...args,
      chatHandle: args.chatHandle ? decodeMessagesChatHandle(args.chatHandle) : undefined,
      maxTextChars: args.maxTextChars ?? this.config.maxBodyChars
    });
    return { messages: messages.map(encodeMessage) };
  }

  async read(args: MessagesReadArgs): Promise<{ messages: MessagesMessageSummary[] }> {
    const messages = await this.store.read({
      ...args,
      handles: args.handles?.map(decodeMessagesMessageHandle),
      chatHandle: args.chatHandle ? decodeMessagesChatHandle(args.chatHandle) : undefined,
      maxTextChars: args.maxTextChars ?? this.config.maxBodyChars
    });
    return { messages: messages.map(encodeMessage) };
  }

  async send(args: MessagesSendArgs) {
    const decision = decideWrite(this.config, "messages.send", args.confirm, args.dryRun);
    if (!decision.allowed) {
      return {
        mode: decision.mode,
        allowed: false,
        sent: false,
        preview: {
          recipient: args.recipient,
          service: args.service,
          textChars: args.text.length
        },
        reason: decision.reason
      };
    }

    return this.sender.send({
      recipient: args.recipient,
      text: args.text,
      service: args.service
    });
  }
}

function encodeChat(raw: RawMessagesChatSummary): MessagesChatSummary {
  return {
    ...raw,
    handle: encodeMessagesChatHandle(raw.handle)
  };
}

function encodeMessage(raw: RawMessagesMessageSummary): MessagesMessageSummary {
  return {
    ...raw,
    handle: encodeMessagesMessageHandle(raw.handle),
    chatHandle: raw.chatHandle ? encodeMessagesChatHandle(raw.chatHandle) : undefined
  };
}
