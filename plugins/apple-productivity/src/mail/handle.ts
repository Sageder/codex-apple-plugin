import type { MessageHandlePayload } from "./types.js";

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

