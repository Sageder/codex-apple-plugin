import { describe, expect, it, vi } from "vitest";
import { encodeMessagesChatHandle, encodeMessagesMessageHandle } from "../messages/handle.js";
import { MessagesService, type MessagesSender, type MessagesStore } from "../messages/messagesService.js";

function fakeStore(): MessagesStore {
  return {
    async requestAccess() {
      return { chatCount: 2, messageCount: 10 };
    },
    async listChats() {
      return [
        {
          handle: { chatId: 7, guid: "chat-guid" },
          chatId: 7,
          guid: "chat-guid",
          chatIdentifier: "person@example.com",
          serviceName: "iMessage",
          participants: ["person@example.com"],
          participantCount: 1,
          messageCount: 3,
          unreadCount: 1,
          lastMessageDate: "2026-05-19T10:00:00.000Z"
        }
      ];
    },
    async fetchNew(args) {
      return [
        {
          handle: { messageId: 11, guid: "message-guid", chatId: args.chatHandle?.chatId },
          chatHandle: args.chatHandle,
          messageId: 11,
          guid: "message-guid",
          chatId: args.chatHandle?.chatId,
          service: "iMessage",
          sender: "person@example.com",
          isFromMe: false,
          date: "2026-05-19T10:01:00.000Z",
          text: "hello",
          textChars: 5,
          truncated: false,
          hasAttachments: false,
          attachmentCount: 0
        }
      ];
    },
    async search(args) {
      return this.fetchNew(args);
    },
    async read(args) {
      return [
        {
          handle: { messageId: args.handles?.[0]?.messageId ?? 11, guid: "message-guid" },
          messageId: args.handles?.[0]?.messageId ?? 11,
          guid: "message-guid",
          service: "iMessage",
          sender: "person@example.com",
          isFromMe: false,
          date: "2026-05-19T10:01:00.000Z",
          text: "hello",
          textChars: 5,
          truncated: false,
          hasAttachments: false,
          attachmentCount: 0
        }
      ];
    }
  };
}

describe("MessagesService", () => {
  it("encodes chat and message handles", async () => {
    const service = new MessagesService(fakeStore(), { send: vi.fn() } as MessagesSender, {
      writeMode: "ask",
      maxBodyChars: 1200,
      retrievalCandidateLimit: 30,
      contextTopK: 5,
      helperTimeoutMs: 1000
    });

    const chats = await service.listChats({});
    expect(chats.chats[0]?.handle).toBe(encodeMessagesChatHandle({ chatId: 7, guid: "chat-guid" }));

    const chatHandle = chats.chats[0]?.handle ?? "";
    const messages = await service.fetchNew({ chatHandle });
    expect(messages.messages[0]?.handle).toBe(
      encodeMessagesMessageHandle({ messageId: 11, guid: "message-guid", chatId: 7 })
    );
    expect(messages.messages[0]?.chatHandle).toBe(chatHandle);
  });

  it("returns a metadata-only send preview unless confirmed", async () => {
    const sender = { send: vi.fn() };
    const service = new MessagesService(fakeStore(), sender, {
      writeMode: "ask",
      maxBodyChars: 1200,
      retrievalCandidateLimit: 30,
      contextTopK: 5,
      helperTimeoutMs: 1000
    });

    const result = await service.send({ recipient: "+41790000000", text: "private text" });

    expect(result).toMatchObject({
      allowed: false,
      sent: false,
      preview: {
        recipient: "+41790000000",
        textChars: 12
      }
    });
    expect(JSON.stringify(result)).not.toContain("private text");
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("sends through the runtime after explicit confirmation", async () => {
    const sender = {
      send: vi.fn(async () => ({ sent: true, recipient: "+41790000000", service: "iMessage", textChars: 2 }))
    };
    const service = new MessagesService(fakeStore(), sender, {
      writeMode: "ask",
      maxBodyChars: 1200,
      retrievalCandidateLimit: 30,
      contextTopK: 5,
      helperTimeoutMs: 1000
    });

    const result = await service.send({ recipient: "+41790000000", text: "hi", service: "iMessage", confirm: true });

    expect(sender.send).toHaveBeenCalledWith({ recipient: "+41790000000", text: "hi", service: "iMessage" });
    expect(result).toEqual({ sent: true, recipient: "+41790000000", service: "iMessage", textChars: 2 });
  });
});
