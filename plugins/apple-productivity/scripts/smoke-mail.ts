import { AppleBridge } from "../src/appleBridge.js";
import { getRuntimeConfig } from "../src/config.js";
import { MailService } from "../src/mail/mailService.js";

const config = getRuntimeConfig();
const mail = new MailService(new AppleBridge({ timeoutMs: config.osascriptTimeoutMs }), config);

const accounts = await mail.listAccounts();
console.log(`Apple Mail accounts: ${accounts.accounts.length}`);
for (const account of accounts.accounts) {
  console.log(`- ${account.name}: ${account.emailAddresses.length} address(es), ${account.mailboxes.length} mailbox(es)`);
}

const search = await mail.search({ scope: "inbox", limit: 3, maxScanPerMailbox: 25 });
console.log(`Inbox sample messages: ${search.messages.length}`);

const context = await mail.retrieveContext({
  query: "invoice meeting application package",
  scope: "inbox",
  limit: 5,
  topK: 2,
  maxScanPerMailbox: 25,
  maxBodyChars: 4000
});
console.log(`Context snippets: ${context.snippets.length}`);

