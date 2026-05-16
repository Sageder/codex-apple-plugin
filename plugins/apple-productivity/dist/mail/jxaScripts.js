export const listAccountsScript = `
function run(argv) {
  const Mail = Application("Mail");
  const accounts = Mail.accounts().map(account => ({
    name: String(account.name()),
    emailAddresses: account.emailAddresses().map(address => String(address)),
    mailboxes: account.mailboxes().map(mailbox => String(mailbox.name()))
  }));
  return JSON.stringify(accounts);
}
`;
export const listMailboxesScript = `
function lower(value) {
  return String(value || "").toLowerCase();
}

function mailboxRole(name) {
  const value = lower(name);
  if (value === "inbox") return "inbox";
  if (value.includes("sent")) return "sent";
  if (value === "archive" || /^archive\\d+$/.test(value) || value.includes("archive") || value.includes("all mail")) return "archive";
  if (value.includes("deleted") || value === "trash" || value === "bin") return "trash";
  if (value.includes("junk") || value.includes("spam")) return "junk";
  return "other";
}

function run(argv) {
  const Mail = Application("Mail");
  const mailboxes = [];
  for (const account of Mail.accounts()) {
    for (const mailbox of account.mailboxes()) {
      const name = String(mailbox.name());
      mailboxes.push({
        account: String(account.name()),
        name,
        role: mailboxRole(name)
      });
    }
  }
  return JSON.stringify({ mailboxes });
}
`;
const common = `
function inputFrom(argv) {
  return JSON.parse(argv[0] || "{}");
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function queryTerms(value) {
  return lower(value).split(/[^a-z0-9_@.+-]+/).filter(term => term.length > 1);
}

function textMatchesQuery(text, query) {
  const haystack = lower(text);
  const needle = lower(query);
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  const terms = queryTerms(query);
  return terms.length > 0 && terms.some(term => haystack.includes(term));
}

function toIso(value) {
  try {
    if (!value) return undefined;
    return new Date(value).toISOString();
  } catch (_) {
    return String(value);
  }
}

function safeString(fn) {
  try {
    const value = fn();
    return value === undefined || value === null ? "" : String(value);
  } catch (_) {
    return "";
  }
}

function safeNumber(fn) {
  try {
    const value = Number(fn());
    return Number.isFinite(value) ? value : undefined;
  } catch (_) {
    return undefined;
  }
}

function mailboxHandle(account, mailbox, message) {
  return {
    account: String(account.name()),
    mailbox: String(mailbox.name()),
    id: Number(message.id()),
    messageId: safeString(() => message.messageId())
  };
}

function accountMatches(account, wanted) {
  if (!wanted) return true;
  const needle = lower(wanted);
  if (lower(account.name()) === needle) return true;
  return account.emailAddresses().some(address => lower(address) === needle);
}

function selectedAccounts(Mail, wanted) {
  return Mail.accounts().filter(account => accountMatches(account, wanted));
}

function isTrashName(name) {
  const value = lower(name);
  return value.includes("deleted") || value === "trash" || value === "bin" || value.includes("junk");
}

function isSentName(name) {
  return lower(name).includes("sent");
}

function isArchiveName(name) {
  const value = lower(name);
  return value === "archive" || /^archive\\d+$/.test(value) || value.includes("archive") || value.includes("all mail");
}

function isJunkName(name) {
  const value = lower(name);
  return value.includes("junk") || value.includes("spam");
}

function selectedMailboxes(account, input) {
  const all = account.mailboxes();
  const scope = input.scope || (input.mailbox ? "mailbox" : "inbox");
  const wantedMailbox = lower(input.mailbox || "");

  if (scope === "mailbox") {
    return all.filter(mailbox => lower(mailbox.name()) === wantedMailbox);
  }

  if (scope === "all") {
    return all.filter(mailbox => input.includeTrash || !isTrashName(mailbox.name()));
  }

  if (scope === "sent") {
    return all.filter(mailbox => isSentName(mailbox.name()));
  }

  if (scope === "archive") {
    return all.filter(mailbox => isArchiveName(mailbox.name()));
  }

  if (scope === "trash") {
    return all.filter(mailbox => isTrashName(mailbox.name()));
  }

  if (scope === "junk") {
    return all.filter(mailbox => isJunkName(mailbox.name()));
  }

  return all.filter(mailbox => lower(mailbox.name()) === "inbox");
}

function recipientMetadata(message) {
  try {
    const out = [];
    const recipients = message.recipients();
    for (let index = 0; index < recipients.length; index += 1) {
      const recipient = recipients[index];
      out.push({
        name: String(recipient.name() || ""),
        address: String(recipient.address() || "")
      });
    }
    return out;
  } catch (_) {
    return [];
  }
}

function messageSearchMetadata(account, mailbox, message, query, input) {
  const needsTextSearch = Boolean(query || input.sender || input.participant);
  const needsRecipients = Boolean(query || input.recipient || input.participant);
  const subject = needsTextSearch ? safeString(() => message.subject()) : "";
  const sender = needsTextSearch ? safeString(() => message.sender()) : "";
  const recipients = needsRecipients ? recipientMetadata(message) : [];
  const recipientText = recipients.map(recipient => [recipient.name, recipient.address].join(" ")).join(" ");
  const searchable = lower([subject, sender, recipientText, mailbox.name(), account.name()].join(" "));
  const terms = queryTerms(query);
  const score = terms.reduce((total, term) => {
    if (lower(subject).includes(term)) total += 5;
    if (lower(sender).includes(term)) total += 3;
    if (lower(recipientText).includes(term)) total += 4;
    if (searchable.includes(term)) total += 1;
    return total;
  }, 0);

  const metadata = {
    handle: mailboxHandle(account, mailbox, message),
    account: String(account.name()),
    mailbox: String(mailbox.name()),
    id: Number(message.id()),
    messageId: safeString(() => message.messageId()),
    subject,
    sender,
    recipients,
    score
  };

  if (input.unreadOnly) metadata.read = Boolean(message.readStatus());
  if (input.since || input.before) metadata.dateReceived = toIso(message.dateReceived());

  return metadata;
}

function messageMetadata(account, mailbox, message, query, base) {
  const metadata = base || messageSearchMetadata(account, mailbox, message, query || "", {});
  if (!metadata.subject) metadata.subject = safeString(() => message.subject());
  if (!metadata.sender) metadata.sender = safeString(() => message.sender());
  if (!metadata.recipients || metadata.recipients.length === 0) metadata.recipients = recipientMetadata(message);
  if (metadata.dateReceived === undefined) metadata.dateReceived = toIso(message.dateReceived());
  if (metadata.dateSent === undefined) metadata.dateSent = toIso(message.dateSent());
  if (metadata.read === undefined) metadata.read = Boolean(message.readStatus());
  if (metadata.flagged === undefined) metadata.flagged = Boolean(message.flaggedStatus());
  if (metadata.size === undefined) metadata.size = safeNumber(() => message.messageSize());
  return metadata;
}

function passesFilters(metadata, input) {
  if (input.unreadOnly && metadata.read) return false;
  if (input.since && metadata.dateReceived && new Date(metadata.dateReceived) < new Date(input.since)) return false;
  if (input.before && metadata.dateReceived && new Date(metadata.dateReceived) > new Date(input.before)) return false;
  if (input.subject && metadata.subject !== input.subject) return false;

  const recipientText = lower(metadata.recipients.map(recipient => [recipient.name, recipient.address].join(" ")).join(" "));
  const senderText = lower(metadata.sender);
  if (input.sender && !textMatchesQuery(senderText, input.sender)) return false;
  if (input.recipient && !textMatchesQuery(recipientText, input.recipient)) return false;
  if (input.participant) {
    if (!textMatchesQuery(senderText, input.participant) && !textMatchesQuery(recipientText, input.participant)) return false;
  }

  if (input.query) {
    const terms = queryTerms(input.query);
    const haystack = lower([metadata.subject, metadata.sender, recipientText, metadata.mailbox, metadata.account].join(" "));
    if (terms.length && !terms.every(term => haystack.includes(term))) return false;
  }

  return true;
}

function findAccount(Mail, handle) {
  const matches = selectedAccounts(Mail, handle.account);
  if (!matches.length) throw new Error("Mail account not found: " + handle.account);
  return matches[0];
}

function findMailbox(account, name) {
  const needle = lower(name);
  const matches = account.mailboxes().filter(mailbox => lower(mailbox.name()) === needle);
  if (!matches.length) throw new Error("Mailbox not found: " + name);
  return matches[0];
}

function findMessage(Mail, handle) {
  const account = findAccount(Mail, handle);
  const mailbox = findMailbox(account, handle.mailbox);
  const matches = mailbox.messages.whose({ id: Number(handle.id) });
  if (matches.length && matches[0].exists()) return { account, mailbox, message: matches[0] };
  if (handle.messageId) {
    const byMessageId = mailbox.messages.whose({ messageId: String(handle.messageId) });
    if (byMessageId.length && byMessageId[0].exists()) return { account, mailbox, message: byMessageId[0] };
  }
  throw new Error("Message not found: " + handle.id);
}

function roleRank(name, role) {
  const value = lower(name);
  if (role === "inbox") {
    if (value === "inbox") return 0;
    return 999;
  }

  if (role === "archive") {
    if (value === "archive") return 0;
    if (/^archive\\d+$/.test(value)) return 1;
    if (value.includes("archive")) return 2;
    if (value.includes("all mail")) return 3;
    return 999;
  }

  if (role === "trash") {
    if (value === "deleted messages") return 0;
    if (value === "deleted items") return 1;
    if (value === "trash") return 2;
    if (value === "bin") return 3;
    if (value.includes("deleted")) return 4;
    if (value.includes("trash")) return 5;
    return 999;
  }

  if (role === "junk") {
    if (value === "junk") return 0;
    if (value === "junk email") return 1;
    if (value.includes("junk")) return 2;
    if (value.includes("spam")) return 3;
  }
  return 999;
}

function resolveRoleMailbox(account, role) {
  const ranked = account.mailboxes()
    .map(mailbox => ({ mailbox, rank: roleRank(mailbox.name(), role), name: String(mailbox.name()) }))
    .filter(entry => entry.rank < 999)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  if (!ranked.length) throw new Error("No " + role + " mailbox found for account " + account.name());
  return ranked[0].mailbox;
}

function resolveTargetMailbox(account, input) {
  if (input.targetMailbox) {
    return findMailbox(account, input.targetMailbox);
  }
  return resolveRoleMailbox(account, input.role || input.targetRole);
}

function attachmentMetadata(message) {
  try {
    return message.mailAttachments().map(attachment => ({ name: safeString(() => attachment.name()) }));
  } catch (_) {
    return [];
  }
}
`;
export const searchMessagesScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Mail = Application("Mail");
  const limit = Number(input.limit || 20);
  const maxScanPerMailbox = Number(input.maxScanPerMailbox || 200);
  const results = [];

  for (const account of selectedAccounts(Mail, input.account)) {
    for (const mailbox of selectedMailboxes(account, input)) {
      const messages = mailbox.messages();
      const scanCount = Math.min(messages.length, maxScanPerMailbox);
      for (let index = 0; index < scanCount; index += 1) {
        const message = messages[index];
        const metadata = messageSearchMetadata(account, mailbox, message, input.query || "", input);
        if (!passesFilters(metadata, input)) continue;
        results.push(messageMetadata(account, mailbox, message, input.query || "", metadata));
        if (results.length >= limit) {
          return JSON.stringify(results.sort((a, b) => (b.score || 0) - (a.score || 0)));
        }
      }
    }
  }

  return JSON.stringify(results.sort((a, b) => (b.score || 0) - (a.score || 0)));
}
`;
export const searchRecipientMessagesScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Mail = Application("Mail");
  const limit = Number(input.limit || 20);
  const maxScanPerMailbox = Number(input.maxScanPerMailbox || 200);
  const results = [];

  for (const account of selectedAccounts(Mail, input.account)) {
    for (const mailbox of selectedMailboxes(account, input)) {
      const messages = mailbox.messages();
      const scanCount = Math.min(messages.length, maxScanPerMailbox);
      for (let index = 0; index < scanCount; index += 1) {
        const message = messages[index];
        const recipients = recipientMetadata(message);
        const recipientText = recipients.map(recipient => [recipient.name, recipient.address].join(" ")).join(" ");
        if (!textMatchesQuery(recipientText, input.recipient)) continue;
        const metadata = messageMetadata(account, mailbox, message, input.query || "", {
          handle: mailboxHandle(account, mailbox, message),
          account: String(account.name()),
          mailbox: String(mailbox.name()),
      id: Number(message.id()),
      messageId: safeString(() => message.messageId()),
      recipients,
          score: 10
        });
        results.push(metadata);
        if (results.length >= limit) {
          return JSON.stringify(results);
        }
      }
    }
  }

  return JSON.stringify(results);
}
`;
export const searchSubjectMessagesScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Mail = Application("Mail");
  const limit = Number(input.limit || 20);
  const results = [];

  for (const account of selectedAccounts(Mail, input.account)) {
    for (const mailbox of selectedMailboxes(account, input)) {
      const messages = mailbox.messages.whose({ subject: String(input.subject || "") });
      for (let index = 0; index < messages.length; index += 1) {
        if (!messages[index].exists()) continue;
        const metadata = messageMetadata(account, mailbox, messages[index], input.query || "");
        if (!passesFilters(metadata, input)) continue;
        results.push(metadata);
        if (results.length >= limit) {
          return JSON.stringify(results);
        }
      }
    }
  }

  return JSON.stringify(results);
}
`;
export const readMessagesScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Mail = Application("Mail");
  const maxBodyChars = Number(input.maxBodyChars || 12000);

  const results = input.handles.map(handle => {
    const found = findMessage(Mail, handle);
    const metadata = messageMetadata(found.account, found.mailbox, found.message, "");
    const content = safeString(() => found.message.content());
    return {
      ...metadata,
      content: content.slice(0, maxBodyChars),
      truncated: content.length > maxBodyChars,
      attachments: attachmentMetadata(found.message)
    };
  });

  return JSON.stringify(results);
}
`;
export const moveMessagesScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Mail = Application("Mail");
  const targetRole = input.role;
  const moved = [];

  for (const handle of input.handles) {
    const found = findMessage(Mail, handle);
    const target = resolveTargetMailbox(found.account, input);
    const before = String(found.mailbox.name());
    const stableMessageId = safeString(() => found.message.messageId());
    found.message.mailbox = target;
    moved.push({
      id: Number(handle.id),
      messageId: stableMessageId,
      account: String(found.account.name()),
      fromMailbox: before,
      toMailbox: String(target.name())
    });
  }

  return JSON.stringify({ moved });
}
`;
export const composeMessageScript = `
function run(argv) {
  const input = JSON.parse(argv[0] || "{}");
  const Mail = Application("Mail");
  Mail.activate();

  const message = Mail.OutgoingMessage({
    subject: String(input.subject || ""),
    content: String(input.body || ""),
    visible: input.visible !== false
  });
  if (input.from) {
    message.sender = String(input.from);
  }
  Mail.outgoingMessages.push(message);

  for (const recipient of input.to || []) {
    message.toRecipients.push(Mail.ToRecipient({ address: String(recipient) }));
  }
  for (const recipient of input.cc || []) {
    message.ccRecipients.push(Mail.CcRecipient({ address: String(recipient) }));
  }
  for (const recipient of input.bcc || []) {
    message.bccRecipients.push(Mail.BccRecipient({ address: String(recipient) }));
  }

  return JSON.stringify({
    created: true,
    visible: input.visible !== false,
    subject: String(input.subject || ""),
    to: input.to || [],
    cc: input.cc || [],
    bcc: input.bcc || []
  });
}
`;
export const sendMessageScript = `
function run(argv) {
  const input = JSON.parse(argv[0] || "{}");
  const Mail = Application("Mail");

  const message = Mail.OutgoingMessage({
    subject: String(input.subject || ""),
    content: String(input.body || ""),
    visible: false
  });
  if (input.from) {
    message.sender = String(input.from);
  }
  Mail.outgoingMessages.push(message);

  for (const recipient of input.to || []) {
    message.toRecipients.push(Mail.ToRecipient({ address: String(recipient) }));
  }
  for (const recipient of input.cc || []) {
    message.ccRecipients.push(Mail.CcRecipient({ address: String(recipient) }));
  }
  for (const recipient of input.bcc || []) {
    message.bccRecipients.push(Mail.BccRecipient({ address: String(recipient) }));
  }

  message.send();
  return JSON.stringify({ sent: true, subject: String(input.subject || ""), to: input.to || [] });
}
`;
//# sourceMappingURL=jxaScripts.js.map