import type { MailUndoToken, MessageHandlePayload } from "./types.js";
export declare function encodeMessageHandle(payload: MessageHandlePayload): string;
export declare function decodeMessageHandle(handle: string): MessageHandlePayload;
export declare function encodeUndoToken(payload: MailUndoToken): string;
export declare function decodeUndoToken(token: string): MailUndoToken;
