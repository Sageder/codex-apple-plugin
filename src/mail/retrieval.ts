import type { MailMessageBody, MailMessageSummary } from "./types.js";

export interface RetrievalSnippet {
  handle: string;
  subject: string;
  sender: string;
  recipients: string[];
  dateReceived?: string;
  dateSent?: string;
  mailbox: string;
  score: number;
  reason: string;
  snippet: string;
}

const stopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "you"
]);

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_@.+-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

export function scoreSummary(message: MailMessageSummary, query: string): number {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return 0;
  }

  const subject = message.subject.toLowerCase();
  const sender = message.sender.toLowerCase();
  const recipients = message.recipients.map((recipient) => `${recipient.name} ${recipient.address}`.toLowerCase()).join(" ");
  const mailbox = message.mailbox.toLowerCase();

  return terms.reduce((score, term) => {
    let next = score;
    if (subject.includes(term)) next += 5;
    if (sender.includes(term)) next += 3;
    if (recipients.includes(term)) next += 4;
    if (mailbox.includes(term)) next += 1;
    return next;
  }, 0);
}

export function chunkText(content: string, maxChars = 1200): string[] {
  const clean = content.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean) {
    return [];
  }

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const normalized = paragraph.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }

    if ((current + " " + normalized).trim().length > maxChars && current) {
      chunks.push(current);
      current = "";
    }

    if (normalized.length > maxChars) {
      for (let index = 0; index < normalized.length; index += maxChars) {
        chunks.push(normalized.slice(index, index + maxChars));
      }
      continue;
    }

    current = (current + " " + normalized).trim();
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function rankContext(messages: MailMessageBody[], query: string, topK: number): RetrievalSnippet[] {
  const terms = tokenize(query);
  const snippets: RetrievalSnippet[] = [];

  for (const message of messages) {
    const baseScore = scoreSummary(message, query);
    const chunks = chunkText(message.content);

    for (const chunk of chunks.length ? chunks : [""]) {
      const lowerChunk = chunk.toLowerCase();
      const bodyScore = terms.reduce((score, term) => score + occurrences(lowerChunk, term), 0);
      const score = baseScore + bodyScore;

      snippets.push({
        handle: message.handle,
        subject: message.subject,
        sender: message.sender,
        recipients: message.recipients.map((recipient) => recipient.name || recipient.address).filter(Boolean),
        dateReceived: message.dateReceived,
        dateSent: message.dateSent,
        mailbox: message.mailbox,
        score,
        reason: buildReason({ baseScore, bodyScore, matchedTerms: terms.filter((term) => lowerChunk.includes(term)) }),
        snippet: chunk.slice(0, 1200)
      });
    }
  }

  return snippets
    .filter((snippet) => snippet.score > 0 || terms.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function occurrences(value: string, term: string): number {
  let count = 0;
  let index = value.indexOf(term);

  while (index !== -1) {
    count += 1;
    index = value.indexOf(term, index + term.length);
  }

  return count;
}

function buildReason(input: { baseScore: number; bodyScore: number; matchedTerms: string[] }): string {
  const reasons: string[] = [];
  if (input.baseScore > 0) reasons.push("metadata matched");
  if (input.bodyScore > 0) reasons.push(`body matched ${input.matchedTerms.slice(0, 6).join(", ")}`);
  return reasons.length ? reasons.join("; ") : "recent candidate";
}
