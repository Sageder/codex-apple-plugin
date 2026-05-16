import { AppleBridge } from "../appleBridge.js";
import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import { encodeMessageHandle, decodeMessageHandle } from "./handle.js";
import { rankContext, scoreSummary } from "./retrieval.js";
import {
  composeMessageScript,
  listAccountsScript,
  moveMessagesScript,
  readMessagesScript,
  searchMessagesScript,
  sendMessageScript
} from "./jxaScripts.js";
import type {
  MailAccount,
  MailMessageBody,
  MailMessageSummary,
  RawMessageBody,
  RawMessageSummary,
  SearchMessagesInput
} from "./types.js";

export interface MailSearchArgs {
  query?: string;
  account?: string;
  mailbox?: string;
  scope?: "inbox" | "all" | "mailbox";
  unreadOnly?: boolean;
  since?: string;
  before?: string;
  includeTrash?: boolean;
  limit?: number;
  maxScanPerMailbox?: number;
}

export interface MailReadArgs {
  handles: string[];
  maxBodyChars?: number;
}

export interface MailComposeArgs {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  visible?: boolean;
}

export interface MailWriteArgs {
  handles: string[];
  confirm?: boolean;
  dryRun?: boolean;
}

export class MailService {
  constructor(
    private readonly bridge: AppleBridge,
    private readonly config: RuntimeConfig
  ) {}

  async listAccounts(): Promise<{ accounts: MailAccount[] }> {
    const accounts = await this.bridge.runJxa<MailAccount[]>(listAccountsScript);
    return { accounts };
  }

  async search(args: MailSearchArgs): Promise<{ messages: MailMessageSummary[] }> {
    const input: SearchMessagesInput = {
      query: args.query,
      account: args.account,
      mailbox: args.mailbox,
      scope: args.scope,
      unreadOnly: args.unreadOnly,
      since: args.since,
      before: args.before,
      includeTrash: args.includeTrash,
      limit: args.limit ?? 20,
      maxScanPerMailbox: args.maxScanPerMailbox ?? 200
    };

    const raw = await this.bridge.runJxa<RawMessageSummary[]>(searchMessagesScript, input);
    return {
      messages: raw.map(encodeSummary).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    };
  }

  async retrieveContext(args: MailSearchArgs & { topK?: number; maxBodyChars?: number }) {
    const candidateLimit = args.limit ?? this.config.retrievalCandidateLimit;
    const search = await this.search({ ...args, limit: candidateLimit });
    const ranked = search.messages
      .map((message) => ({ message, score: scoreSummary(message, args.query ?? "") + (message.score ?? 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateLimit)
      .map((entry) => entry.message);

    const bodies = ranked.length
      ? await this.read({
          handles: ranked.map((message) => message.handle),
          maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
        })
      : { messages: [] };

    return {
      query: args.query ?? "",
      candidates: search.messages.length,
      snippets: rankContext(bodies.messages, args.query ?? "", args.topK ?? this.config.contextTopK)
    };
  }

  async read(args: MailReadArgs): Promise<{ messages: MailMessageBody[] }> {
    const rawHandles = args.handles.map(decodeMessageHandle);
    const raw = await this.bridge.runJxa<RawMessageBody[]>(readMessagesScript, {
      handles: rawHandles,
      maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
    });

    return { messages: raw.map(encodeBody) };
  }

  async compose(args: MailComposeArgs) {
    return this.bridge.runJxa(composeMessageScript, {
      ...args,
      cc: args.cc ?? [],
      bcc: args.bcc ?? [],
      visible: args.visible ?? true
    });
  }

  async send(args: MailComposeArgs & { confirm?: boolean; dryRun?: boolean }) {
    const decision = decideWrite(this.config, "send", args.confirm, args.dryRun);
    if (!decision.allowed) {
      if (this.config.writeMode === "draft" && !args.dryRun) {
        const draft = await this.compose({ ...args, visible: true });
        return { mode: decision.mode, sent: false, drafted: true, reason: decision.reason, draft };
      }

      return { mode: decision.mode, sent: false, preview: previewMessage(args), reason: decision.reason };
    }

    return this.bridge.runJxa(sendMessageScript, {
      ...args,
      cc: args.cc ?? [],
      bcc: args.bcc ?? []
    });
  }

  archive(args: MailWriteArgs) {
    return this.moveRole(args, "archive");
  }

  delete(args: MailWriteArgs) {
    return this.moveRole(args, "trash");
  }

  private async moveRole(args: MailWriteArgs, role: "archive" | "trash") {
    const action = role === "archive" ? "archive" : "delete";
    const decision = decideWrite(this.config, action, args.confirm, args.dryRun);
    const decoded = args.handles.map(decodeMessageHandle);

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        moved: false,
        role,
        count: decoded.length,
        targets: decoded,
        reason: decision.reason
      };
    }

    return this.bridge.runJxa(moveMessagesScript, { handles: decoded, role });
  }
}

function encodeSummary(raw: RawMessageSummary): MailMessageSummary {
  return {
    ...raw,
    handle: encodeMessageHandle(raw.handle)
  };
}

function encodeBody(raw: RawMessageBody): MailMessageBody {
  return {
    ...raw,
    handle: encodeMessageHandle(raw.handle)
  };
}

function previewMessage(args: MailComposeArgs) {
  return {
    to: args.to,
    cc: args.cc ?? [],
    bcc: args.bcc ?? [],
    subject: args.subject,
    bodyChars: args.body.length
  };
}

