import { decideWrite } from "../writeGuard.js";
import { decodeMessageHandle, decodeUndoToken, encodeMessageHandle, encodeUndoToken } from "./handle.js";
import { rankContext, scoreSummary } from "./retrieval.js";
export class MailService {
    bridge;
    config;
    constructor(bridge, config) {
        this.bridge = bridge;
        this.config = config;
    }
    async listAccounts() {
        const accounts = await this.bridge.call("mail.listAccounts");
        return { accounts };
    }
    async listMailboxes() {
        return this.bridge.call("mail.listMailboxes");
    }
    async search(args) {
        const input = {
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
        const raw = await this.bridge.call("mail.search", input);
        return {
            messages: raw.map(encodeSummary).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        };
    }
    async retrieveContext(args) {
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
    async read(args) {
        const rawHandles = args.handles.map(decodeMessageHandle);
        const raw = await this.bridge.call("mail.read", {
            handles: rawHandles,
            maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
        });
        return { messages: raw.map(encodeBody) };
    }
    async compose(args) {
        return this.bridge.call("mail.compose", {
            ...args,
            cc: args.cc ?? [],
            bcc: args.bcc ?? [],
            visible: args.visible ?? true
        });
    }
    async send(args) {
        const decision = decideWrite(this.config, "mail.send", args.confirm, args.dryRun);
        if (!decision.allowed) {
            if (this.config.writeMode === "draft" && !args.dryRun) {
                const draft = await this.compose({ ...args, visible: true });
                return { mode: decision.mode, allowed: false, sent: false, drafted: true, reason: decision.reason, draft };
            }
            return { mode: decision.mode, allowed: false, sent: false, preview: previewMessage(args), reason: decision.reason };
        }
        return this.bridge.call("mail.send", {
            ...args,
            cc: args.cc ?? [],
            bcc: args.bcc ?? []
        });
    }
    archive(args) {
        return this.move({ ...args, targetRole: "archive" }, "mail.archive");
    }
    delete(args) {
        return this.move({ ...args, targetRole: "trash" }, "mail.delete");
    }
    moveToJunk(args) {
        return this.move({ ...args, targetRole: "junk" }, "mail.move");
    }
    async move(args, action = "mail.move") {
        const decision = decideWrite(this.config, action, args.confirm, args.dryRun);
        const decoded = args.handles.map(decodeMessageHandle);
        if (!decision.allowed) {
            return {
                mode: decision.mode,
                allowed: false,
                moved: false,
                targetRole: args.targetRole,
                targetMailbox: args.targetMailbox,
                count: decoded.length,
                targets: decoded,
                reason: decision.reason
            };
        }
        const result = await this.bridge.call("mail.move", {
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
    async undoMove(args) {
        const decision = decideWrite(this.config, "mail.move", args.confirm, args.dryRun);
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
                allowed: false,
                moved: false,
                count: tokens.length,
                targets: tokens,
                reason: decision.reason
            };
        }
        const moved = [];
        for (let index = 0; index < tokens.length; index += 1) {
            const token = tokens[index];
            const result = await this.bridge.call("mail.move", {
                handles: [handles[index]],
                targetMailbox: token.fromMailbox
            });
            moved.push(...result.moved.map((item) => encodeMovedItem(item, "mail.move")));
        }
        return { moved };
    }
}
function encodeSummary(raw) {
    return {
        ...raw,
        handle: encodeMessageHandle(raw.handle)
    };
}
function encodeBody(raw) {
    return {
        ...raw,
        handle: encodeMessageHandle(raw.handle)
    };
}
function previewMessage(args) {
    return {
        from: args.from,
        to: args.to,
        cc: args.cc ?? [],
        bcc: args.bcc ?? [],
        subject: args.subject,
        bodyChars: args.body.length
    };
}
function encodeMovedItem(item, action) {
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
//# sourceMappingURL=mailService.js.map