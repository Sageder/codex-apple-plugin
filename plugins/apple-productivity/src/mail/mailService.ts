import { SwiftBridge } from "../swiftBridge.js";
import type { RuntimeConfig } from "../config.js";
import { decideWrite } from "../writeGuard.js";
import { decodeMessageHandle, decodeUndoToken, encodeMessageHandle, encodeUndoToken } from "./handle.js";
import { rankContext, scoreSummary } from "./retrieval.js";
import type {
  MailAccount,
  MailboxInfo,
  MailMoveRole,
  MailMessageBody,
  MailMessageSummary,
  MoveResult,
  RawMessageBody,
  RawMessageSummary,
  SearchMessagesInput
} from "./types.js";

export interface MailSearchArgs {
  query?: string;
  subject?: string;
  account?: string;
  mailbox?: string;
  scope?: "inbox" | "sent" | "archive" | "trash" | "junk" | "all" | "mailbox";
  sender?: string;
  recipient?: string;
  participant?: string;
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
  from?: string;
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

export interface MailMoveArgs extends MailWriteArgs {
  targetRole?: MailMoveRole;
  targetMailbox?: string;
}

export interface MailUndoMoveArgs {
  undoTokens: string[];
  confirm?: boolean;
  dryRun?: boolean;
}

export class MailService {
  constructor(
    private readonly bridge: SwiftBridge,
    private readonly config: RuntimeConfig
  ) {}

  async listAccounts(): Promise<{ accounts: MailAccount[] }> {
    const accounts = await this.bridge.call<MailAccount[]>("mail.listAccounts");
    return { accounts };
  }

  async listMailboxes(): Promise<{ mailboxes: MailboxInfo[] }> {
    return this.bridge.call<{ mailboxes: MailboxInfo[] }>("mail.listMailboxes");
  }

  async search(args: MailSearchArgs): Promise<{ messages: MailMessageSummary[] }> {
    const input: SearchMessagesInput = {
      query: args.query,
      subject: args.subject,
      account: args.account,
      mailbox: args.mailbox,
      scope: args.scope,
      sender: args.sender,
      recipient: args.recipient,
      participant: args.participant,
      unreadOnly: args.unreadOnly,
      since: args.since,
      before: args.before,
      includeTrash: args.includeTrash,
      limit: args.limit ?? 20,
      maxScanPerMailbox: args.maxScanPerMailbox ?? 200
    };

    const raw = await this.bridge.call<RawMessageSummary[]>("mail.search", input);
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
    const raw = await this.bridge.call<RawMessageBody[]>("mail.read", {
      handles: rawHandles,
      maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
    });

    return { messages: raw.map(encodeBody) };
  }

  async compose(args: MailComposeArgs) {
    return this.bridge.call("mail.compose", {
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

    return this.bridge.call("mail.send", {
      ...args,
      cc: args.cc ?? [],
      bcc: args.bcc ?? []
    });
  }

  archive(args: MailWriteArgs) {
    return this.move({ ...args, targetRole: "archive" }, "archive");
  }

  delete(args: MailWriteArgs) {
    return this.move({ ...args, targetRole: "trash" }, "delete");
  }

  moveToJunk(args: MailWriteArgs) {
    return this.move({ ...args, targetRole: "junk" }, "move");
  }

  async move(args: MailMoveArgs, action: "archive" | "delete" | "move" = "move") {
    const decision = decideWrite(this.config, action, args.confirm, args.dryRun);
    const decoded = args.handles.map(decodeMessageHandle);

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        moved: false,
        targetRole: args.targetRole,
        targetMailbox: args.targetMailbox,
        count: decoded.length,
        targets: decoded,
        reason: decision.reason
      };
    }

    const result = await this.bridge.call<{ moved: MoveResult[] }>("mail.move", {
      handles: decoded,
      role: args.targetRole,
      targetRole: args.targetRole,
      targetMailbox: args.targetMailbox
    });
    return {
      ...result,
      moved: result.moved.map((item) => encodeMovedItem(item, action))
    };
  }

  async undoMove(args: MailUndoMoveArgs) {
    const decision = decideWrite(this.config, "move", args.confirm, args.dryRun);
    const tokens = args.undoTokens.map(decodeUndoToken);
    const handles = tokens.map((token) => ({
      account: token.account,
      mailbox: token.toMailbox,
      id: token.id,
      messageId: token.messageId
    }));

    if (!decision.allowed) {
      return {
        mode: decision.mode,
        moved: false,
        count: tokens.length,
        targets: tokens,
        reason: decision.reason
      };
    }

    const moved: Array<ReturnType<typeof encodeMovedItem>> = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const result = await this.bridge.call<{ moved: MoveResult[] }>("mail.move", {
        handles: [handles[index]],
        targetMailbox: token.fromMailbox
      });
      moved.push(...result.moved.map((item) => encodeMovedItem(item, "undo")));
    }

    return { moved };
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
    from: args.from,
    to: args.to,
    cc: args.cc ?? [],
    bcc: args.bcc ?? [],
    subject: args.subject,
    bodyChars: args.body.length
  };
}

function encodeMovedItem(item: MoveResult, action: string) {
  const handle = encodeMessageHandle({
    account: item.account,
    mailbox: item.toMailbox,
    id: item.id,
    messageId: item.messageId
  });
  const previousHandle = encodeMessageHandle({
    account: item.account,
    mailbox: item.fromMailbox,
    id: item.id,
    messageId: item.messageId
  });
  const undoToken = encodeUndoToken({
    action,
    account: item.account,
    id: item.id,
    messageId: item.messageId,
    fromMailbox: item.fromMailbox,
    toMailbox: item.toMailbox,
    createdAt: new Date().toISOString()
  });

  return {
    ...item,
    handle,
    previousHandle,
    undoToken
  };
}
