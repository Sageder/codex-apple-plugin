import { getRuntimeConfig } from "../src/config.js";
import { MessagesService } from "../src/messages/messagesService.js";
import { MessagesAppleScriptSender } from "../src/messages/sender.js";
import { SqliteMessagesStore } from "../src/messages/sqliteStore.js";

const config = getRuntimeConfig(process.env, "messages");
const messages = new MessagesService(
  new SqliteMessagesStore({
    dbPath: config.messagesDatabasePath,
    timeoutMs: config.helperTimeoutMs
  }),
  new MessagesAppleScriptSender(config.helperTimeoutMs),
  config
);

const access = await messages.requestAccess();
console.log(`Apple Messages chats: ${access.chatCount}`);
console.log(`Apple Messages stored message rows: ${access.messageCount}`);

const chats = await messages.listChats({ limit: 3 });
console.log(`Recent chats sampled: ${chats.chats.length}`);

const recent = await messages.fetchNew({ unreadOnly: false, includeSent: false, limit: 3, maxTextChars: 0 });
console.log(`Recent incoming messages sampled: ${recent.messages.length}`);
