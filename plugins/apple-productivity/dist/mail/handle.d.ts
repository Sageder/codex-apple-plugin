import type { MessageHandlePayload } from "./types.js";
export declare function encodeMessageHandle(payload: MessageHandlePayload): string;
export declare function decodeMessageHandle(handle: string): MessageHandlePayload;
