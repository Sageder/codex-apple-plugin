import { describe, expect, it } from "vitest";
import { rankContext, scoreSummary } from "../mail/retrieval.js";
import type { MailMessageBody, MailMessageSummary } from "../mail/types.js";

describe("retrieval ranking", () => {
  it("scores subject and sender matches", () => {
    const message: MailMessageSummary = {
      handle: "h",
      account: "iCloud",
      mailbox: "INBOX",
      id: 1,
      subject: "Stripe interview schedule",
      sender: "recruiting@example.com",
      recipients: [{ name: "Clemens", address: "clemens@example.com" }],
      read: false,
      flagged: false
    };

    expect(scoreSummary(message, "stripe schedule")).toBeGreaterThan(scoreSummary(message, "banana"));
  });

  it("scores recipient matches for sent-mail lookup", () => {
    const message: MailMessageSummary = {
      handle: "h",
      account: "College",
      mailbox: "Sent Items",
      id: 2,
      subject: "Remote ML work",
      sender: "clemens@example.com",
      recipients: [{ name: "Patrick Hsu", address: "pdhsu@example.com" }],
      read: true,
      flagged: false
    };

    expect(scoreSummary(message, "patrick hsu")).toBeGreaterThan(scoreSummary(message, "banana"));
  });

  it("returns useful body snippets", () => {
    const messages: MailMessageBody[] = [
      {
        handle: "a",
        account: "iCloud",
        mailbox: "INBOX",
        id: 1,
        subject: "Receipt",
        sender: "store@example.com",
        recipients: [{ name: "Clemens", address: "clemens@example.com" }],
        read: true,
        flagged: false,
        content: "Your package shipment and invoice are ready.",
        truncated: false,
        attachments: []
      },
      {
        handle: "b",
        account: "iCloud",
        mailbox: "INBOX",
        id: 2,
        subject: "Other",
        sender: "other@example.com",
        recipients: [{ name: "Clemens", address: "clemens@example.com" }],
        read: true,
        flagged: false,
        content: "Unrelated note.",
        truncated: false,
        attachments: []
      }
    ];

    const snippets = rankContext(messages, "shipment invoice", 1);
    expect(snippets).toHaveLength(1);
    expect(snippets[0]?.handle).toBe("a");
  });
});
