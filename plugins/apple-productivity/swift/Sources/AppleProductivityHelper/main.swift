import Foundation
import MailScripting
import ScriptingBridge

enum HelperError: Error, CustomStringConvertible {
  case invalidRequest(String)
  case mailUnavailable
  case notFound(String)
  case unsupported(String)

  var description: String {
    switch self {
    case .invalidRequest(let message), .notFound(let message), .unsupported(let message):
      return message
    case .mailUnavailable:
      return "Apple Mail is not available through ScriptingBridge"
    }
  }
}

func readStdin() throws -> [String: Any] {
  let data = FileHandle.standardInput.readDataToEndOfFile()
  guard !data.isEmpty else {
    throw HelperError.invalidRequest("Missing JSON request on stdin")
  }

  guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
    throw HelperError.invalidRequest("Request must be a JSON object")
  }

  return object
}

func writeJSON(_ value: Any) throws {
  let data = try JSONSerialization.data(withJSONObject: value, options: [])
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data("\n".utf8))
}

func fail(_ error: Error) -> Never {
  let message = String(describing: error)
  let payload = ["error": message]
  if let data = try? JSONSerialization.data(withJSONObject: payload, options: []) {
    FileHandle.standardError.write(data)
    FileHandle.standardError.write(Data("\n".utf8))
  } else {
    FileHandle.standardError.write(Data(message.utf8))
  }
  exit(1)
}

func lower(_ value: Any?) -> String {
  String(describing: value ?? "").lowercased()
}

func queryTerms(_ value: Any?) -> [String] {
  lower(value)
    .components(separatedBy: CharacterSet.alphanumerics.inverted)
    .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    .filter { $0.count > 1 }
}

func textMatchesQuery(_ text: String, _ query: Any?) -> Bool {
  let needle = lower(query)
  if needle.isEmpty { return true }
  let haystack = text.lowercased()
  if haystack.contains(needle) { return true }
  let terms = queryTerms(query)
  return !terms.isEmpty && terms.contains { haystack.contains($0) }
}

func kvc(_ object: AnyObject, _ key: String) -> Any? {
  object.value(forKey: key)
}

func setKvc(_ object: AnyObject, _ key: String, _ value: Any?) {
  object.setValue(value, forKey: key)
}

func objectArray(_ value: Any?) -> [AnyObject] {
  if let array = value as? [AnyObject] {
    return array
  }

  if let elementArray = value as? SBElementArray {
    return elementArray.compactMap { $0 as AnyObject }
  }

  return []
}

func stringArray(_ value: Any?) -> [String] {
  if let array = value as? [String] {
    return array
  }

  if let array = value as? NSArray {
    return array.compactMap { item in
      item as? String ?? String(describing: item)
    }
  }

  return []
}

func stringValue(_ value: Any?) -> String {
  guard let value else { return "" }
  if let value = value as? String { return value }
  return String(describing: value)
}

func intValue(_ value: Any?) -> Int {
  if let value = value as? Int { return value }
  if let value = value as? NSNumber { return value.intValue }
  if let value = value as? String, let intValue = Int(value) { return intValue }
  return 0
}

func boolValue(_ value: Any?) -> Bool {
  if let value = value as? Bool { return value }
  if let value = value as? NSNumber { return value.boolValue }
  if let value = value as? String { return value == "true" || value == "1" }
  return false
}

func dateString(_ value: Any?) -> String? {
  if let date = value as? Date {
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return isoFormatter.string(from: date)
  }
  if let value = value {
    let string = stringValue(value)
    return string.isEmpty ? nil : string
  }
  return nil
}

func optionalString(_ dict: [String: Any], _ key: String) -> String? {
  guard let value = dict[key] else { return nil }
  let string = stringValue(value)
  return string.isEmpty ? nil : string
}

func optionalBool(_ dict: [String: Any], _ key: String) -> Bool? {
  guard let value = dict[key] else { return nil }
  return boolValue(value)
}

func optionalInt(_ dict: [String: Any], _ key: String) -> Int? {
  guard let value = dict[key] else { return nil }
  return intValue(value)
}

final class MailClient {
  private let mail: SBApplication
  private let typedMail: MailApplication

  init() throws {
    guard let mail = SBApplication(bundleIdentifier: "com.apple.mail") else {
      throw HelperError.mailUnavailable
    }
    guard let typedMail = MailApplication(bundleIdentifier: "com.apple.mail") else {
      throw HelperError.mailUnavailable
    }
    self.mail = mail
    self.typedMail = typedMail
  }

  func listAccounts() -> [[String: Any]] {
    accounts().map { account in
      [
        "name": name(account),
        "emailAddresses": stringArray(kvc(account, "emailAddresses")),
        "mailboxes": mailboxes(account).map { name($0) }
      ]
    }
  }

  func listMailboxes() -> [String: Any] {
    var rows: [[String: Any]] = []
    for account in accounts() {
      for mailbox in mailboxes(account) {
        let mailboxName = name(mailbox)
        rows.append([
          "account": name(account),
          "name": mailboxName,
          "role": mailboxRole(mailboxName)
        ])
      }
    }
    return ["mailboxes": rows]
  }

  func search(_ input: [String: Any]) -> [[String: Any]] {
    let limit = optionalInt(input, "limit") ?? 20
    let maxScan = optionalInt(input, "maxScanPerMailbox") ?? 200
    var results: [[String: Any]] = []
    let canStopEarly = optionalString(input, "subject") != nil || (optionalString(input, "recipient") != nil && optionalString(input, "query") == nil)

    for account in selectedAccounts(optionalString(input, "account")) {
      for mailbox in selectedMailboxes(account, input) {
        guard let messages = messageElements(mailbox) else {
          continue
        }
        let scanCount = min(messages.count, maxScan)
        for index in 0..<scanCount {
          guard let message = messages.object(at: index) as AnyObject? else {
            continue
          }
          var metadata = searchMetadata(account: account, mailbox: mailbox, message: message, input: input)
          if !passesFilters(metadata, input) {
            continue
          }
          metadata = fullMetadata(account: account, mailbox: mailbox, message: message, base: metadata)
          results.append(metadata)
          if canStopEarly && results.count >= limit {
            return results
          }
        }
      }
    }

    return Array(results.sorted { left, right in
      let leftScore = intValue(left["score"])
      let rightScore = intValue(right["score"])
      if leftScore != rightScore {
        return leftScore > rightScore
      }

      let leftDate = stringValue(left["dateSent"]).isEmpty ? stringValue(left["dateReceived"]) : stringValue(left["dateSent"])
      let rightDate = stringValue(right["dateSent"]).isEmpty ? stringValue(right["dateReceived"]) : stringValue(right["dateSent"])
      return leftDate > rightDate
    }.prefix(limit))
  }

  func read(_ input: [String: Any]) throws -> [[String: Any]] {
    let maxBodyChars = optionalInt(input, "maxBodyChars") ?? 12_000
    let handles = (input["handles"] as? [[String: Any]]) ?? []

    return try handles.map { handle in
      let found = try findMessage(handle)
      var metadata = fullMetadata(account: found.account, mailbox: found.mailbox, message: found.message)
      let content = stringValue(kvc(found.message, "content"))
      metadata["content"] = String(content.prefix(maxBodyChars))
      metadata["truncated"] = content.count > maxBodyChars
      metadata["attachments"] = attachmentMetadata(found.message)
      return metadata
    }
  }

  func compose(_ input: [String: Any]) throws -> [String: Any] {
    try createOutgoingMessage(input, sendNow: false)
  }

  func send(_ input: [String: Any]) throws -> [String: Any] {
    try createOutgoingMessage(input, sendNow: true)
  }

  func move(_ input: [String: Any]) throws -> [String: Any] {
    let handles = (input["handles"] as? [[String: Any]]) ?? []
    var moved: [[String: Any]] = []

    for handle in handles {
      let found = try findMessage(handle)
      let target = try resolveTargetMailbox(account: found.account, input: input)
      let fromMailbox = name(found.mailbox)
      let messageId = stringValue(kvc(found.message, "messageId"))
      setKvc(found.message, "mailbox", target)
      moved.append([
        "id": intValue(kvc(found.message, "id")),
        "messageId": messageId,
        "account": name(found.account),
        "fromMailbox": fromMailbox,
        "toMailbox": name(target)
      ])
    }

    return ["moved": moved]
  }

  private func createOutgoingMessage(_ input: [String: Any], sendNow: Bool) throws -> [String: Any] {
    let message = MailOutgoingMessage(properties: [
      "subject": stringValue(input["subject"]),
      "content": stringValue(input["body"]),
      "visible": sendNow ? false : (optionalBool(input, "visible") ?? true)
    ])

    guard let outgoingMessages = typedMail.outgoingMessages() else {
      throw HelperError.unsupported("Mail outgoing messages collection is unavailable")
    }
    outgoingMessages.add(message)

    if let from = optionalString(input, "from") {
      message.sender = from
    }

    addRecipients(to: message.toRecipients(), recipientType: MailToRecipient.self, addresses: input["to"])
    addRecipients(to: message.ccRecipients(), recipientType: MailCcRecipient.self, addresses: input["cc"])
    addRecipients(to: message.bccRecipients(), recipientType: MailBccRecipient.self, addresses: input["bcc"])

    if sendNow {
      _ = message.send()
    } else {
      mail.activate()
    }

    return [
      sendNow ? "sent" : "created": true,
      "visible": !sendNow && (optionalBool(input, "visible") ?? true),
      "subject": stringValue(input["subject"]),
      "to": stringArray(input["to"]),
      "cc": stringArray(input["cc"]),
      "bcc": stringArray(input["bcc"])
    ]
  }

  private func addRecipients<T: MailRecipient>(to recipients: SBElementArray?, recipientType: T.Type, addresses: Any?) {
    let values = stringArray(addresses)
    if values.isEmpty {
      return
    }

    for address in values {
      let recipient = recipientType.init(properties: ["address": address])
      recipients?.add(recipient)
    }
  }

  private func accounts() -> [AnyObject] {
    objectArray(kvc(mail, "accounts"))
  }

  private func selectedAccounts(_ wanted: String?) -> [AnyObject] {
    guard let wanted, !wanted.isEmpty else {
      return accounts()
    }

    let needle = wanted.lowercased()
    return accounts().filter { account in
      if name(account).lowercased() == needle {
        return true
      }
      return stringArray(kvc(account, "emailAddresses")).contains { $0.lowercased() == needle }
    }
  }

  private func mailboxes(_ account: AnyObject) -> [AnyObject] {
    objectArray(kvc(account, "mailboxes"))
  }

  private func messages(_ mailbox: AnyObject) -> [AnyObject] {
    objectArray(kvc(mailbox, "messages"))
  }

  private func messageElements(_ mailbox: AnyObject) -> SBElementArray? {
    kvc(mailbox, "messages") as? SBElementArray
  }

  private func selectedMailboxes(_ account: AnyObject, _ input: [String: Any]) -> [AnyObject] {
    let all = mailboxes(account)
    let scope = optionalString(input, "scope") ?? (optionalString(input, "mailbox") == nil ? "inbox" : "mailbox")

    if scope == "mailbox", let wanted = optionalString(input, "mailbox")?.lowercased() {
      return all.filter { name($0).lowercased() == wanted }
    }

    if scope == "all" {
      let includeTrash = optionalBool(input, "includeTrash") ?? false
      return all.filter { includeTrash || !isTrashName(name($0)) }
    }

    return all.filter { mailbox in
      let mailboxName = name(mailbox)
      switch scope {
      case "sent": return isSentName(mailboxName)
      case "archive": return isArchiveName(mailboxName)
      case "trash": return isTrashName(mailboxName)
      case "junk": return isJunkName(mailboxName)
      default: return mailboxName.lowercased() == "inbox"
      }
    }
  }

  private func searchMetadata(account: AnyObject, mailbox: AnyObject, message: AnyObject, input: [String: Any]) -> [String: Any] {
    let query = optionalString(input, "query") ?? ""
    let needsText = !query.isEmpty || optionalString(input, "subject") != nil || optionalString(input, "sender") != nil || optionalString(input, "participant") != nil
    let subject = needsText ? stringValue(kvc(message, "subject")) : ""
    let sender = needsText ? stringValue(kvc(message, "sender")) : ""
    let cheapSearchable = [subject, sender, name(mailbox), name(account)].joined(separator: " ").lowercased()
    let terms = queryTerms(query)
    let needsRecipients =
      optionalString(input, "recipient") != nil ||
      optionalString(input, "participant") != nil ||
      (!terms.isEmpty && !terms.allSatisfy { cheapSearchable.contains($0) })
    let recipients = needsRecipients ? recipientMetadata(message) : []
    let recipientText = recipients.map { [stringValue($0["name"]), stringValue($0["address"])].joined(separator: " ") }.joined(separator: " ")
    let searchable = [cheapSearchable, recipientText].joined(separator: " ").lowercased()
    let score = terms.reduce(0) { partial, term in
      var next = partial
      if subject.lowercased().contains(term) { next += 5 }
      if sender.lowercased().contains(term) { next += 3 }
      if recipientText.lowercased().contains(term) { next += 4 }
      if searchable.contains(term) { next += 1 }
      return next
    }

    var metadata: [String: Any] = [
      "handle": messageHandle(account: account, mailbox: mailbox, message: message),
      "account": name(account),
      "mailbox": name(mailbox),
      "id": intValue(kvc(message, "id")),
      "messageId": stringValue(kvc(message, "messageId")),
      "subject": subject,
      "sender": sender,
      "recipients": recipients,
      "score": score
    ]

    if optionalBool(input, "unreadOnly") == true {
      metadata["read"] = boolValue(kvc(message, "readStatus"))
    }
    if input["since"] != nil || input["before"] != nil {
      metadata["dateReceived"] = dateString(kvc(message, "dateReceived")) as Any
    }

    return metadata
  }

  private func fullMetadata(account: AnyObject, mailbox: AnyObject, message: AnyObject, base: [String: Any]? = nil) -> [String: Any] {
    var metadata = base ?? searchMetadata(account: account, mailbox: mailbox, message: message, input: [:])
    if stringValue(metadata["subject"]).isEmpty { metadata["subject"] = stringValue(kvc(message, "subject")) }
    if stringValue(metadata["sender"]).isEmpty { metadata["sender"] = stringValue(kvc(message, "sender")) }
    if objectArray(metadata["recipients"]).isEmpty { metadata["recipients"] = recipientMetadata(message) }
    if metadata["dateReceived"] == nil { metadata["dateReceived"] = dateString(kvc(message, "dateReceived")) as Any }
    if metadata["dateSent"] == nil { metadata["dateSent"] = dateString(kvc(message, "dateSent")) as Any }
    if metadata["read"] == nil { metadata["read"] = boolValue(kvc(message, "readStatus")) }
    if metadata["flagged"] == nil { metadata["flagged"] = boolValue(kvc(message, "flaggedStatus")) }
    if metadata["size"] == nil { metadata["size"] = intValue(kvc(message, "messageSize")) }
    return metadata
  }

  private func passesFilters(_ metadata: [String: Any], _ input: [String: Any]) -> Bool {
    if optionalBool(input, "unreadOnly") == true && boolValue(metadata["read"]) { return false }
    if let wantedSubject = optionalString(input, "subject"), stringValue(metadata["subject"]) != wantedSubject { return false }
    if let since = optionalString(input, "since"), let received = optionalString(metadata, "dateReceived"), received < since { return false }
    if let before = optionalString(input, "before"), let received = optionalString(metadata, "dateReceived"), received > before { return false }

    let recipients = (metadata["recipients"] as? [[String: Any]]) ?? []
    let recipientText = recipients.map { [stringValue($0["name"]), stringValue($0["address"])].joined(separator: " ") }.joined(separator: " ")
    let senderText = stringValue(metadata["sender"])

    if let sender = optionalString(input, "sender"), !textMatchesQuery(senderText, sender) { return false }
    if let recipient = optionalString(input, "recipient"), !textMatchesQuery(recipientText, recipient) { return false }
    if let participant = optionalString(input, "participant"),
       !textMatchesQuery(senderText, participant),
       !textMatchesQuery(recipientText, participant) {
      return false
    }

    if let query = optionalString(input, "query") {
      let terms = queryTerms(query)
      let haystack = [stringValue(metadata["subject"]), senderText, recipientText, stringValue(metadata["mailbox"]), stringValue(metadata["account"])].joined(separator: " ").lowercased()
      if !terms.isEmpty && !terms.allSatisfy({ haystack.contains($0) }) {
        return false
      }
    }

    return true
  }

  private func findMessage(_ handle: [String: Any]) throws -> (account: AnyObject, mailbox: AnyObject, message: AnyObject) {
    let accountName = stringValue(handle["account"])
    let mailboxName = stringValue(handle["mailbox"])
    let wantedID = intValue(handle["id"])
    let wantedMessageID = stringValue(handle["messageId"])
    guard let account = selectedAccounts(accountName).first else {
      throw HelperError.notFound("Mail account not found: \(accountName)")
    }
    guard let mailbox = mailboxes(account).first(where: { name($0).lowercased() == mailboxName.lowercased() }) else {
      throw HelperError.notFound("Mailbox not found: \(mailboxName)")
    }

    if let elements = messageElements(mailbox), elements.count > 0 {
      for index in 0..<elements.count {
        guard let message = elements.object(at: index) as AnyObject? else {
          continue
        }
        if intValue(kvc(message, "id")) == wantedID || (!wantedMessageID.isEmpty && stringValue(kvc(message, "messageId")) == wantedMessageID) {
          return (account, mailbox, message)
        }
      }
    }

    throw HelperError.notFound("Message not found: \(wantedID)")
  }

  private func resolveTargetMailbox(account: AnyObject, input: [String: Any]) throws -> AnyObject {
    if let targetMailbox = optionalString(input, "targetMailbox") {
      guard let mailbox = mailboxes(account).first(where: { name($0).lowercased() == targetMailbox.lowercased() }) else {
        throw HelperError.notFound("Target mailbox not found: \(targetMailbox)")
      }
      return mailbox
    }

    let role = optionalString(input, "role") ?? optionalString(input, "targetRole") ?? ""
    let ranked = mailboxes(account)
      .map { mailbox in (mailbox, roleRank(name(mailbox), role)) }
      .filter { $0.1 < 999 }
      .sorted { left, right in
        if left.1 != right.1 { return left.1 < right.1 }
        return name(left.0) < name(right.0)
      }

    guard let mailbox = ranked.first?.0 else {
      throw HelperError.notFound("No \(role) mailbox found for account \(name(account))")
    }
    return mailbox
  }

  private func name(_ object: AnyObject) -> String {
    stringValue(kvc(object, "name"))
  }

  private func messageHandle(account: AnyObject, mailbox: AnyObject, message: AnyObject) -> [String: Any] {
    [
      "account": name(account),
      "mailbox": name(mailbox),
      "id": intValue(kvc(message, "id")),
      "messageId": stringValue(kvc(message, "messageId"))
    ]
  }

  private func recipientMetadata(_ message: AnyObject) -> [[String: Any]] {
    objectArray(kvc(message, "recipients")).map { recipient in
      [
        "name": stringValue(kvc(recipient, "name")),
        "address": stringValue(kvc(recipient, "address"))
      ]
    }
  }

  private func attachmentMetadata(_ message: AnyObject) -> [[String: Any]] {
    objectArray(kvc(message, "mailAttachments")).map { attachment in
      ["name": stringValue(kvc(attachment, "name"))]
    }
  }

  private func mailboxRole(_ name: String) -> String {
    if name.lowercased() == "inbox" { return "inbox" }
    if isSentName(name) { return "sent" }
    if isArchiveName(name) { return "archive" }
    if isTrashName(name) { return "trash" }
    if isJunkName(name) { return "junk" }
    return "other"
  }

  private func isTrashName(_ name: String) -> Bool {
    let value = name.lowercased()
    return value.contains("deleted") || value == "trash" || value == "bin"
  }

  private func isSentName(_ name: String) -> Bool {
    name.lowercased().contains("sent")
  }

  private func isArchiveName(_ name: String) -> Bool {
    let value = name.lowercased()
    return value == "archive" || value.range(of: #"^archive\d+$"#, options: .regularExpression) != nil || value.contains("archive") || value.contains("all mail")
  }

  private func isJunkName(_ name: String) -> Bool {
    let value = name.lowercased()
    return value.contains("junk") || value.contains("spam")
  }

  private func roleRank(_ name: String, _ role: String) -> Int {
    let value = name.lowercased()
    switch role {
    case "inbox":
      return value == "inbox" ? 0 : 999
    case "archive":
      if value == "archive" { return 0 }
      if value.range(of: #"^archive\d+$"#, options: .regularExpression) != nil { return 1 }
      if value.contains("archive") { return 2 }
      if value.contains("all mail") { return 3 }
      return 999
    case "trash":
      if value == "deleted messages" { return 0 }
      if value == "deleted items" { return 1 }
      if value == "trash" { return 2 }
      if value == "bin" { return 3 }
      if value.contains("deleted") { return 4 }
      if value.contains("trash") { return 5 }
      return 999
    case "junk":
      if value == "junk" { return 0 }
      if value == "junk email" { return 1 }
      if value.contains("junk") { return 2 }
      if value.contains("spam") { return 3 }
      return 999
    default:
      return 999
    }
  }
}

do {
  let request = try readStdin()
  guard let command = request["command"] as? String else {
    throw HelperError.invalidRequest("Missing command")
  }
  let input = request["input"] as? [String: Any] ?? [:]
  let mail = try MailClient()

  switch command {
  case "mail.listAccounts":
    try writeJSON(mail.listAccounts())
  case "mail.listMailboxes":
    try writeJSON(mail.listMailboxes())
  case "mail.search":
    try writeJSON(mail.search(input))
  case "mail.read":
    try writeJSON(try mail.read(input))
  case "mail.compose":
    try writeJSON(try mail.compose(input))
  case "mail.send":
    try writeJSON(try mail.send(input))
  case "mail.move":
    try writeJSON(try mail.move(input))
  default:
    throw HelperError.unsupported("Unsupported command: \(command)")
  }
} catch {
  fail(error)
}
