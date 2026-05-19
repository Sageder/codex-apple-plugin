import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeAttributedBodyHex, SqliteMessagesStore } from "../messages/sqliteStore.js";

describe("Messages sqlite store", () => {
  it("decodes NSArchiver attributedBody text fallback", () => {
    const archivedFixture =
      "040B73747265616D747970656481E803840140848484124E5341747472696275746564537472696E67008484084E534F626A656374008592848484084E53537472696E67019484012B1148656C6C6F20666978747572652031323386840269490111928484840C4E5344696374696F6E6172790094840169008686";

    expect(decodeAttributedBodyHex(archivedFixture)).toBe("Hello fixture 123");
  });

  it("supports typedstream two-byte string lengths", () => {
    const prefix = Buffer.from("NSString", "utf8");
    const body = Buffer.from("x".repeat(130), "utf8");
    const fixture = Buffer.concat([prefix, Buffer.from([0x01, 0x94, 0x84, 0x01, 0x2b, 0x81, 0x82, 0x00]), body]);

    expect(decodeAttributedBodyHex(fixture.toString("hex"))).toBe("x".repeat(130));
  });

  it("searches decoded attributedBody content when message.text is empty", async () => {
    const dir = mkdtempSync(join(tmpdir(), "messages-store-"));
    const dbPath = join(dir, "chat.db");
    const body = Buffer.from("needle from attributed archive", "utf8");
    const attributedBodyHex = Buffer.concat([
      Buffer.from("NSString", "utf8"),
      Buffer.from([0x01, 0x94, 0x84, 0x01, 0x2b, body.length]),
      body
    ]).toString("hex");

    try {
      execFileSync("sqlite3", [
        dbPath,
        [
          "CREATE TABLE chat (ROWID INTEGER PRIMARY KEY, guid TEXT, chat_identifier TEXT, display_name TEXT, service_name TEXT);",
          "CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT);",
          "CREATE TABLE message (ROWID INTEGER PRIMARY KEY, guid TEXT, text TEXT, handle_id INTEGER, is_from_me INTEGER, date INTEGER, attributedBody BLOB, service TEXT, cache_has_attachments INTEGER, is_read INTEGER);",
          "CREATE TABLE chat_handle_join (chat_id INTEGER, handle_id INTEGER);",
          "CREATE TABLE chat_message_join (chat_id INTEGER, message_id INTEGER);",
          "CREATE TABLE message_attachment_join (message_id INTEGER, attachment_id INTEGER);",
          "INSERT INTO chat (ROWID, guid, chat_identifier, display_name, service_name) VALUES (1, 'chat-guid', 'fixture@example.com', 'Fixture Chat', 'iMessage');",
          "INSERT INTO handle (ROWID, id) VALUES (1, 'fixture@example.com');",
          `INSERT INTO message (ROWID, guid, text, handle_id, is_from_me, date, attributedBody, service, cache_has_attachments, is_read) VALUES (1, 'message-guid', NULL, 1, 0, 800000000000000000, X'${attributedBodyHex}', 'iMessage', 0, 0);`,
          "INSERT INTO chat_handle_join (chat_id, handle_id) VALUES (1, 1);",
          "INSERT INTO chat_message_join (chat_id, message_id) VALUES (1, 1);"
        ].join("\n")
      ]);

      const store = new SqliteMessagesStore({ dbPath, timeoutMs: 1000 });
      const messages = await store.search({ query: "needle", limit: 5, maxTextChars: 100 });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.text).toBe("needle from attributed archive");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
