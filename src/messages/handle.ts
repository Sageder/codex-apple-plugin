import type { MessagesChatHandlePayload, MessagesMessageHandlePayload } from "./types.js";

export function encodeMessagesChatHandle(payload: MessagesChatHandlePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeMessagesChatHandle(handle: string): MessagesChatHandlePayload {
  try {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8")) as Partial<
      MessagesChatHandlePayload
    >;
    if (typeof decoded.chatId !== "number" || !decoded.guid) {
      throw new Error("Invalid Apple Messages chat handle");
    }
    return {
      chatId: decoded.chatId,
      guid: decoded.guid
    };
  } catch {
    throw new Error("Invalid Apple Messages chat handle");
  }
}

export function encodeMessagesMessageHandle(payload: MessagesMessageHandlePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeMessagesMessageHandle(handle: string): MessagesMessageHandlePayload {
  try {
    const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8")) as Partial<
      MessagesMessageHandlePayload
    >;
    if (typeof decoded.messageId !== "number" || !decoded.guid) {
      throw new Error("Invalid Apple Messages message handle");
    }
    return {
      messageId: decoded.messageId,
      guid: decoded.guid,
      chatId: typeof decoded.chatId === "number" ? decoded.chatId : undefined
    };
  } catch {
    throw new Error("Invalid Apple Messages message handle");
  }
}
