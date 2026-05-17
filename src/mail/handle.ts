import type { MailUndoToken, MessageHandlePayload } from "./types.js";

export function encodeMessageHandle(payload: MessageHandlePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeMessageHandle(handle: string): MessageHandlePayload {
  const decoded = JSON.parse(Buffer.from(handle, "base64url").toString("utf8")) as MessageHandlePayload;

  if (!decoded.account || !decoded.mailbox || typeof decoded.id !== "number") {
    throw new Error("Invalid mail message handle");
  }

  return decoded;
}

export function encodeUndoToken(payload: MailUndoToken): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeUndoToken(token: string): MailUndoToken {
  const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as MailUndoToken;

  if (!decoded.account || !decoded.fromMailbox || !decoded.toMailbox || typeof decoded.id !== "number") {
    throw new Error("Invalid mail undo token");
  }

  return decoded;
}
