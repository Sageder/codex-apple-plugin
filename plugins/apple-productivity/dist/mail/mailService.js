import { decideWrite } from "../writeGuard.js";
import { encodeMessageHandle, decodeMessageHandle } from "./handle.js";
import { rankContext, scoreSummary } from "./retrieval.js";
import { composeMessageScript, listAccountsScript, moveMessagesScript, readMessagesScript, searchMessagesScript, sendMessageScript } from "./jxaScripts.js";
export class MailService {
    bridge;
    config;
    constructor(bridge, config) {
        this.bridge = bridge;
        this.config = config;
    }
    async listAccounts() {
        const accounts = await this.bridge.runJxa(listAccountsScript);
        return { accounts };
    }
    async search(args) {
        const input = {
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
        const raw = await this.bridge.runJxa(searchMessagesScript, input);
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
        const raw = await this.bridge.runJxa(readMessagesScript, {
            handles: rawHandles,
            maxBodyChars: args.maxBodyChars ?? this.config.maxBodyChars
        });
        return { messages: raw.map(encodeBody) };
    }
    async compose(args) {
        return this.bridge.runJxa(composeMessageScript, {
            ...args,
            cc: args.cc ?? [],
            bcc: args.bcc ?? [],
            visible: args.visible ?? true
        });
    }
    async send(args) {
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
    archive(args) {
        return this.moveRole(args, "archive");
    }
    delete(args) {
        return this.moveRole(args, "trash");
    }
    async moveRole(args, role) {
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
        to: args.to,
        cc: args.cc ?? [],
        bcc: args.bcc ?? [],
        subject: args.subject,
        bodyChars: args.body.length
    };
}
//# sourceMappingURL=mailService.js.map