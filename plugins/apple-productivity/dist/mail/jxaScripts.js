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
const common = `
function inputFrom(argv) {
  return JSON.parse(argv[0] || "{}");
}

function lower(value) {
  return String(value || "").toLowerCase();
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
    id: Number(message.id())
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

  return all.filter(mailbox => lower(mailbox.name()) === "inbox");
}

function messageMetadata(account, mailbox, message, query) {
  const subject = safeString(() => message.subject());
  const sender = safeString(() => message.sender());
  const dateReceived = toIso(message.dateReceived());
  const dateSent = toIso(message.dateSent());
  const read = Boolean(message.readStatus());
  const flagged = Boolean(message.flaggedStatus());
  const size = safeNumber(() => message.messageSize());
  const searchable = lower([subject, sender, mailbox.name(), account.name()].join(" "));
  const terms = lower(query).split(/[^a-z0-9_@.+-]+/).filter(Boolean);
  const score = terms.reduce((total, term) => {
    if (lower(subject).includes(term)) total += 5;
    if (lower(sender).includes(term)) total += 3;
    if (searchable.includes(term)) total += 1;
    return total;
  }, 0);

  return {
    handle: mailboxHandle(account, mailbox, message),
    account: String(account.name()),
    mailbox: String(mailbox.name()),
    id: Number(message.id()),
    subject,
    sender,
    dateReceived,
    dateSent,
    read,
    flagged,
    size,
    score
  };
}

function passesFilters(metadata, input) {
  if (input.unreadOnly && metadata.read) return false;
  if (input.since && metadata.dateReceived && new Date(metadata.dateReceived) < new Date(input.since)) return false;
  if (input.before && metadata.dateReceived && new Date(metadata.dateReceived) > new Date(input.before)) return false;

  if (input.query) {
    const terms = lower(input.query).split(/[^a-z0-9_@.+-]+/).filter(Boolean);
    const haystack = lower([metadata.subject, metadata.sender, metadata.mailbox, metadata.account].join(" "));
    if (terms.length && !terms.some(term => haystack.includes(term))) return false;
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
  if (!matches.length || !matches[0].exists()) throw new Error("Message not found: " + handle.id);
  return { account, mailbox, message: matches[0] };
}

function roleRank(name, role) {
  const value = lower(name);
  if (role === "archive") {
    if (value === "archive") return 0;
    if (/^archive\\d+$/.test(value)) return 1;
    if (value.includes("archive")) return 2;
    if (value.includes("all mail")) return 3;
    return 999;
  }

  if (value === "deleted messages") return 0;
  if (value === "deleted items") return 1;
  if (value === "trash") return 2;
  if (value === "bin") return 3;
  if (value.includes("deleted")) return 4;
  if (value.includes("trash")) return 5;
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
        const metadata = messageMetadata(account, mailbox, message, input.query || "");
        if (!passesFilters(metadata, input)) continue;
        results.push(metadata);
        if (results.length >= limit) {
          return JSON.stringify(results.sort((a, b) => (b.score || 0) - (a.score || 0)));
        }
      }
    }
  }

  return JSON.stringify(results.sort((a, b) => (b.score || 0) - (a.score || 0)));
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
    const target = resolveRoleMailbox(found.account, targetRole);
    const before = String(found.mailbox.name());
    found.message.mailbox = target;
    moved.push({
      id: Number(handle.id),
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