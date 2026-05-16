import AppKit
import EventKit
import Foundation

enum HelperError: Error, CustomStringConvertible {
  case message(String)

  var description: String {
    switch self {
    case .message(let value):
      return value
    }
  }
}

let isoWithFractional: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

let isoPlain: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  return formatter
}()

func readInput() throws -> [String: Any] {
  let data = FileHandle.standardInput.readDataToEndOfFile()
  if data.isEmpty {
    return [:]
  }

  let json = try JSONSerialization.jsonObject(with: data)
  guard let input = json as? [String: Any] else {
    throw HelperError.message("Input must be a JSON object")
  }
  return input
}

func emit(_ value: Any) throws {
  let data = try JSONSerialization.data(withJSONObject: value, options: [])
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data("\n".utf8))
}

func iso(_ date: Date?) -> String? {
  guard let date else {
    return nil
  }
  return isoWithFractional.string(from: date)
}

func parseDate(_ value: String, field: String) throws -> Date {
  if let date = isoWithFractional.date(from: value) ?? isoPlain.date(from: value) {
    return date
  }
  throw HelperError.message("Invalid ISO date for \(field)")
}

func string(_ input: [String: Any], _ key: String) -> String? {
  input[key] as? String
}

func bool(_ input: [String: Any], _ key: String) -> Bool? {
  input[key] as? Bool
}

func int(_ input: [String: Any], _ key: String) -> Int? {
  if let value = input[key] as? Int {
    return value
  }
  if let value = input[key] as? NSNumber {
    return value.intValue
  }
  return nil
}

func dictionary(_ input: [String: Any], _ key: String) -> [String: Any]? {
  input[key] as? [String: Any]
}

func dictionaries(_ input: [String: Any], _ key: String) -> [[String: Any]]? {
  input[key] as? [[String: Any]]
}

func has(_ input: [String: Any], _ key: String) -> Bool {
  input.keys.contains(key)
}

func ensureAccess(_ store: EKEventStore) throws {
  let status = EKEventStore.authorizationStatus(for: .event)
  if status.rawValue == 3 || status.rawValue == 4 {
    return
  }

  if status == .denied || status == .restricted {
    throw HelperError.message("Calendar access is denied or restricted for this process")
  }

  let semaphore = DispatchSemaphore(value: 0)
  var granted = false
  var requestError: Error?

  if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { allowed, error in
      granted = allowed
      requestError = error
      semaphore.signal()
    }
  } else {
    store.requestAccess(to: .event) { allowed, error in
      granted = allowed
      requestError = error
      semaphore.signal()
    }
  }

  _ = semaphore.wait(timeout: .now() + 60)

  if let requestError {
    throw requestError
  }
  if !granted {
    throw HelperError.message("Calendar access was not granted")
  }
}

func colorHex(_ calendar: EKCalendar) -> String? {
  guard let color = calendar.cgColor?.converted(
    to: CGColorSpace(name: CGColorSpace.sRGB)!,
    intent: .defaultIntent,
    options: nil
  ) else {
    return nil
  }

  guard let components = color.components else {
    return nil
  }

  let red: CGFloat
  let green: CGFloat
  let blue: CGFloat

  if components.count >= 3 {
    red = components[0]
    green = components[1]
    blue = components[2]
  } else if components.count == 2 {
    red = components[0]
    green = components[0]
    blue = components[0]
  } else {
    return nil
  }

  return String(
    format: "#%02X%02X%02X",
    max(0, min(255, Int(red * 255))),
    max(0, min(255, Int(green * 255))),
    max(0, min(255, Int(blue * 255)))
  )
}

func calendarInfo(_ calendar: EKCalendar) -> [String: Any] {
  var result: [String: Any] = [
    "id": calendar.calendarIdentifier,
    "name": calendar.title,
    "writable": calendar.allowsContentModifications
  ]
  if let color = colorHex(calendar) {
    result["color"] = color
  }
  return result
}

func selectedCalendars(store: EKEventStore, input: [String: Any]) -> [EKCalendar] {
  let calendarId = string(input, "calendarId")?.lowercased()
  let calendarName = string(input, "calendarName")?.lowercased()

  return store.calendars(for: .event).filter { calendar in
    if let calendarId, calendar.calendarIdentifier.lowercased() != calendarId {
      return false
    }
    if let calendarName, calendar.title.lowercased() != calendarName {
      return false
    }
    return true
  }
}

func targetCalendar(store: EKEventStore, input: [String: Any]) throws -> EKCalendar {
  let matches = selectedCalendars(store: store, input: input)
  if matches.isEmpty {
    throw HelperError.message("Calendar not found")
  }
  if matches.count > 1 && string(input, "calendarId") == nil {
    throw HelperError.message("Calendar name is ambiguous; use calendarId")
  }
  guard let calendar = matches.first else {
    throw HelperError.message("Calendar not found")
  }
  if !calendar.allowsContentModifications {
    throw HelperError.message("Calendar is not writable")
  }
  return calendar
}

func eventStatus(_ event: EKEvent) -> String {
  switch event.status {
  case .none:
    return "none"
  case .confirmed:
    return "confirmed"
  case .tentative:
    return "tentative"
  case .canceled:
    return "cancelled"
  @unknown default:
    return "unknown"
  }
}

func participationStatus(_ participant: EKParticipant) -> String {
  switch participant.participantStatus {
  case .unknown:
    return "unknown"
  case .pending:
    return "unknown"
  case .accepted:
    return "accepted"
  case .declined:
    return "declined"
  case .tentative:
    return "tentative"
  case .delegated:
    return "delegated"
  case .completed:
    return "completed"
  case .inProcess:
    return "inProcess"
  @unknown default:
    return "unknown"
  }
}

func attendeeEmail(_ participant: EKParticipant) -> String {
  let url = participant.url
  let absolute = url.absoluteString
  if url.scheme?.lowercased() == "mailto" {
    let address = String(absolute.dropFirst("mailto:".count))
    return address.removingPercentEncoding ?? address
  }
  return absolute
}

func attendeeMetadata(_ event: EKEvent) -> [[String: Any]] {
  (event.attendees ?? []).map { participant in
    [
      "displayName": participant.name ?? "",
      "email": attendeeEmail(participant),
      "participationStatus": participationStatus(participant)
    ]
  }
}

func alarmMetadata(_ event: EKEvent) -> [[String: Any]] {
  (event.alarms ?? []).map { alarm in
    var result: [String: Any] = ["type": "display"]
    if alarm.absoluteDate != nil {
      result["triggerDate"] = iso(alarm.absoluteDate)
    } else {
      result["triggerInterval"] = Int(alarm.relativeOffset / 60)
    }
    return result
  }
}

func recurrenceFrequency(_ frequency: EKRecurrenceFrequency) -> String {
  switch frequency {
  case .daily:
    return "DAILY"
  case .weekly:
    return "WEEKLY"
  case .monthly:
    return "MONTHLY"
  case .yearly:
    return "YEARLY"
  @unknown default:
    return "UNKNOWN"
  }
}

func recurrenceDescription(_ event: EKEvent) -> String? {
  guard let rules = event.recurrenceRules, !rules.isEmpty else {
    return nil
  }

  return rules.map { rule in
    var parts = ["FREQ=\(recurrenceFrequency(rule.frequency))"]
    if rule.interval > 1 {
      parts.append("INTERVAL=\(rule.interval)")
    }
    if let end = rule.recurrenceEnd {
      if end.occurrenceCount > 0 {
        parts.append("COUNT=\(end.occurrenceCount)")
      } else if let endDate = end.endDate {
        parts.append("UNTIL=\(isoWithFractional.string(from: endDate))")
      }
    }
    return parts.joined(separator: ";")
  }.joined(separator: "\n")
}

func handleMetadata(_ event: EKEvent) -> [String: Any] {
  var result: [String: Any] = [
    "calendarId": event.calendar.calendarIdentifier,
    "uid": event.eventIdentifier ?? event.calendarItemIdentifier
  ]
  if let occurrenceStart = iso(event.startDate) {
    result["occurrenceStart"] = occurrenceStart
  }
  return result
}

func eventMetadata(_ event: EKEvent, query: String = "", notesLimit: Int = 12_000) -> [String: Any] {
  let notes = event.notes ?? ""
  let recurrence = recurrenceDescription(event)
  let attendees = attendeeMetadata(event)
  let alarms = alarmMetadata(event)
  let score = scoreEvent(event, attendees: attendees, notes: notes, query: query)

  var result: [String: Any] = [
    "handle": handleMetadata(event),
    "calendarId": event.calendar.calendarIdentifier,
    "calendarName": event.calendar.title,
    "calendarWritable": event.calendar.allowsContentModifications,
    "uid": event.eventIdentifier ?? event.calendarItemIdentifier,
    "summary": event.title ?? "",
    "start": iso(event.startDate) ?? "",
    "end": iso(event.endDate) ?? "",
    "allDay": event.isAllDay,
    "notesPreview": String(notes.prefix(notesLimit)),
    "notesTruncated": notes.count > notesLimit,
    "status": eventStatus(event),
    "attendees": attendees,
    "alarms": alarms,
    "recurring": recurrence != nil,
    "score": score
  ]

  if let location = event.location, !location.isEmpty {
    result["location"] = location
  }
  if let url = event.url?.absoluteString, !url.isEmpty {
    result["url"] = url
  }
  if let recurrence {
    result["recurrence"] = recurrence
  }
  if let modified = event.lastModifiedDate {
    result["modified"] = iso(modified)
  }

  return result
}

func scoreEvent(_ event: EKEvent, attendees: [[String: Any]], notes: String, query: String) -> Int {
  let terms = query.lowercased().split { !$0.isLetter && !$0.isNumber && $0 != "@" && $0 != "." && $0 != "_" && $0 != "-" && $0 != "+" }
  if terms.isEmpty {
    return 0
  }

  let title = (event.title ?? "").lowercased()
  let location = (event.location ?? "").lowercased()
  let url = (event.url?.absoluteString ?? "").lowercased()
  let calendar = event.calendar.title.lowercased()
  let attendeeText = attendees.map { attendee in
    "\(attendee["displayName"] ?? "") \(attendee["email"] ?? "")"
  }.joined(separator: " ").lowercased()
  let haystack = "\(title) \(location) \(url) \(calendar) \(notes.lowercased()) \(attendeeText)"

  return terms.reduce(0) { total, term in
    var next = total
    if title.contains(term) {
      next += 5
    }
    if location.contains(term) {
      next += 3
    }
    if url.contains(term) {
      next += 2
    }
    if haystack.contains(term) {
      next += 1
    }
    return next
  }
}

func matchesQuery(_ event: EKEvent, metadata: [String: Any], query: String) -> Bool {
  let terms = query.lowercased().split { !$0.isLetter && !$0.isNumber && $0 != "@" && $0 != "." && $0 != "_" && $0 != "-" && $0 != "+" }
  if terms.isEmpty {
    return true
  }

  let attendees = (metadata["attendees"] as? [[String: Any]] ?? []).map { attendee in
    "\(attendee["displayName"] ?? "") \(attendee["email"] ?? "")"
  }.joined(separator: " ")
  let haystack = [
    event.title ?? "",
    event.location ?? "",
    event.notes ?? "",
    event.url?.absoluteString ?? "",
    event.calendar.title,
    attendees
  ].joined(separator: " ").lowercased()

  return terms.contains { haystack.contains($0) }
}

func findEvent(store: EKEventStore, handle: [String: Any]) throws -> EKEvent {
  guard let uid = string(handle, "uid") else {
    throw HelperError.message("Invalid calendar event handle")
  }

  if let event = store.event(withIdentifier: uid) {
    return event
  }

  guard let occurrenceStart = string(handle, "occurrenceStart") else {
    throw HelperError.message("Calendar event not found")
  }

  let start = try parseDate(occurrenceStart, field: "occurrenceStart")
  let end = start.addingTimeInterval(24 * 60 * 60)
  let calendars = selectedCalendars(store: store, input: handle)
  let predicate = store.predicateForEvents(withStart: start.addingTimeInterval(-60), end: end, calendars: calendars.isEmpty ? nil : calendars)
  let matches = store.events(matching: predicate).filter { event in
    event.eventIdentifier == uid || event.calendarItemIdentifier == uid
  }

  guard let event = matches.first else {
    throw HelperError.message("Calendar event not found")
  }
  return event
}

func parseRecurrence(_ raw: String?) throws -> [EKRecurrenceRule]? {
  guard var raw, !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
    return nil
  }

  raw = raw.trimmingCharacters(in: .whitespacesAndNewlines)
  if raw.uppercased().hasPrefix("RRULE:") {
    raw = String(raw.dropFirst("RRULE:".count))
  }

  var values: [String: String] = [:]
  for part in raw.split(separator: ";") {
    let pieces = part.split(separator: "=", maxSplits: 1)
    if pieces.count == 2 {
      values[String(pieces[0]).uppercased()] = String(pieces[1])
    }
  }

  let frequency: EKRecurrenceFrequency
  switch values["FREQ"]?.uppercased() {
  case "DAILY":
    frequency = .daily
  case "WEEKLY":
    frequency = .weekly
  case "MONTHLY":
    frequency = .monthly
  case "YEARLY":
    frequency = .yearly
  default:
    throw HelperError.message("Unsupported recurrence FREQ")
  }

  let interval = Int(values["INTERVAL"] ?? "1") ?? 1
  let end: EKRecurrenceEnd?
  if let countRaw = values["COUNT"], let count = Int(countRaw) {
    end = EKRecurrenceEnd(occurrenceCount: count)
  } else if let untilRaw = values["UNTIL"] {
    end = EKRecurrenceEnd(end: try parseDate(untilRaw, field: "recurrence UNTIL"))
  } else {
    end = nil
  }

  let days = try parseDaysOfWeek(values["BYDAY"])
  return [
    EKRecurrenceRule(
      recurrenceWith: frequency,
      interval: interval,
      daysOfTheWeek: days,
      daysOfTheMonth: nil,
      monthsOfTheYear: nil,
      weeksOfTheYear: nil,
      daysOfTheYear: nil,
      setPositions: nil,
      end: end
    )
  ]
}

func parseDaysOfWeek(_ raw: String?) throws -> [EKRecurrenceDayOfWeek]? {
  guard let raw, !raw.isEmpty else {
    return nil
  }

  return try raw.split(separator: ",").map { token in
    let text = token.uppercased()
    let day: EKWeekday
    switch text.suffix(2) {
    case "SU":
      day = .sunday
    case "MO":
      day = .monday
    case "TU":
      day = .tuesday
    case "WE":
      day = .wednesday
    case "TH":
      day = .thursday
    case "FR":
      day = .friday
    case "SA":
      day = .saturday
    default:
      throw HelperError.message("Unsupported recurrence BYDAY")
    }
    return EKRecurrenceDayOfWeek(day)
  }
}

func buildAlarms(_ input: [String: Any]) throws -> [EKAlarm]? {
  guard let alarmInputs = dictionaries(input, "alarms") else {
    return nil
  }

  return try alarmInputs.map { alarmInput in
    if let triggerDate = string(alarmInput, "triggerDate") {
      return EKAlarm(absoluteDate: try parseDate(triggerDate, field: "alarm triggerDate"))
    }

    guard let triggerInterval = int(alarmInput, "triggerInterval") else {
      throw HelperError.message("Calendar alarms require triggerInterval or triggerDate")
    }
    return EKAlarm(relativeOffset: TimeInterval(triggerInterval * 60))
  }
}

func applyFields(_ event: EKEvent, input: [String: Any]) throws {
  if has(input, "attendees") {
    throw HelperError.message("Attendee mutation is not supported")
  }
  if let summary = string(input, "summary") {
    event.title = summary
  }
  if let start = string(input, "start") {
    event.startDate = try parseDate(start, field: "start")
  }
  if let end = string(input, "end") {
    event.endDate = try parseDate(end, field: "end")
  }
  if let allDay = bool(input, "allDay") {
    event.isAllDay = allDay
  }
  if has(input, "location") {
    event.location = string(input, "location") ?? ""
  }
  if has(input, "notes") {
    event.notes = string(input, "notes") ?? ""
  }
  if has(input, "url") {
    if let urlString = string(input, "url"), !urlString.isEmpty {
      event.url = URL(string: urlString)
    } else {
      event.url = nil
    }
  }
  if has(input, "recurrence") {
    event.recurrenceRules = try parseRecurrence(string(input, "recurrence"))
  }
  if let status = string(input, "status") {
    try setEventStatus(event, status: status)
  }
  if has(input, "alarms") {
    event.alarms = try buildAlarms(input)
  }
}

func setEventStatus(_ event: EKEvent, status: String) throws {
  let rawValue: Int
  switch status.lowercased() {
  case "none":
    rawValue = EKEventStatus.none.rawValue
  case "confirmed":
    rawValue = EKEventStatus.confirmed.rawValue
  case "tentative":
    rawValue = EKEventStatus.tentative.rawValue
  case "cancelled", "canceled":
    rawValue = EKEventStatus.canceled.rawValue
  default:
    throw HelperError.message("Unsupported calendar event status")
  }

  event.setValue(rawValue, forKey: "status")
}

func listCalendars(store: EKEventStore) throws {
  try emit(store.calendars(for: .event).map(calendarInfo))
}

func searchEvents(store: EKEventStore, input: [String: Any]) throws {
  let from = try parseDate(string(input, "from") ?? isoWithFractional.string(from: Calendar.current.startOfDay(for: Date())), field: "from")
  let to = try parseDate(string(input, "to") ?? isoWithFractional.string(from: from.addingTimeInterval(30 * 24 * 60 * 60)), field: "to")
  let calendars = selectedCalendars(store: store, input: input)
  if calendars.isEmpty && (string(input, "calendarId") != nil || string(input, "calendarName") != nil) {
    try emit([])
    return
  }
  let predicate = store.predicateForEvents(withStart: from, end: to, calendars: calendars.isEmpty ? nil : calendars)
  let includeCancelled = bool(input, "includeCancelled") ?? false
  let query = string(input, "query") ?? ""
  let limit = int(input, "limit") ?? 50
  let notesLimit = int(input, "notesLimit") ?? 12_000

  let events = store.events(matching: predicate).sorted { lhs, rhs in
    if lhs.startDate == rhs.startDate {
      return (lhs.title ?? "") < (rhs.title ?? "")
    }
    return lhs.startDate < rhs.startDate
  }

  var results: [[String: Any]] = []
  for event in events {
    if !includeCancelled && event.status == .canceled {
      continue
    }
    let metadata = eventMetadata(event, query: query, notesLimit: notesLimit)
    if !matchesQuery(event, metadata: metadata, query: query) {
      continue
    }
    results.append(metadata)
    if results.count >= limit {
      break
    }
  }

  results.sort { lhs, rhs in
    let lhsScore = lhs["score"] as? Int ?? 0
    let rhsScore = rhs["score"] as? Int ?? 0
    if lhsScore != rhsScore {
      return lhsScore > rhsScore
    }
    return (lhs["start"] as? String ?? "") < (rhs["start"] as? String ?? "")
  }

  try emit(results)
}

func readEvent(store: EKEventStore, input: [String: Any]) throws {
  guard let handle = dictionary(input, "handle") else {
    throw HelperError.message("Invalid calendar event handle")
  }
  let event = try findEvent(store: store, handle: handle)
  try emit(eventMetadata(event, notesLimit: int(input, "notesLimit") ?? 12_000))
}

func createEvent(store: EKEventStore, input: [String: Any]) throws {
  let calendar = try targetCalendar(store: store, input: input)
  let event = EKEvent(eventStore: store)
  event.calendar = calendar
  try applyFields(event, input: input)
  try store.save(event, span: .thisEvent, commit: true)
  try emit(["created": true, "event": eventMetadata(event, notesLimit: int(input, "notesLimit") ?? 12_000)])
}

func updateEvent(store: EKEventStore, input: [String: Any]) throws {
  guard let handle = dictionary(input, "handle") else {
    throw HelperError.message("Invalid calendar event handle")
  }
  let event = try findEvent(store: store, handle: handle)
  if !event.calendar.allowsContentModifications {
    throw HelperError.message("Calendar is not writable")
  }
  guard let patch = dictionary(input, "patch") else {
    throw HelperError.message("patch is required")
  }

  try applyFields(event, input: patch)
  let span = string(input, "span") == "this" ? EKSpan.thisEvent : EKSpan.futureEvents
  try store.save(event, span: span, commit: true)
  try emit(["updated": true, "span": string(input, "span") ?? "all", "event": eventMetadata(event, notesLimit: int(input, "notesLimit") ?? 12_000)])
}

func deleteEvent(store: EKEventStore, input: [String: Any]) throws {
  guard let handle = dictionary(input, "handle") else {
    throw HelperError.message("Invalid calendar event handle")
  }
  let event = try findEvent(store: store, handle: handle)
  if !event.calendar.allowsContentModifications {
    throw HelperError.message("Calendar is not writable")
  }

  let span = string(input, "span") == "this" ? EKSpan.thisEvent : EKSpan.futureEvents
  try store.remove(event, span: span, commit: true)
  try emit([
    "deleted": true,
    "span": string(input, "span") ?? "all",
    "calendarId": handle["calendarId"] ?? "",
    "uid": handle["uid"] ?? ""
  ])
}

func showEvent(store: EKEventStore, input: [String: Any]) throws {
  guard let handle = dictionary(input, "handle") else {
    throw HelperError.message("Invalid calendar event handle")
  }

  _ = try findEvent(store: store, handle: handle)
  if let uid = string(handle, "uid")?.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
    let url = URL(string: "x-apple-calevent://\(uid)"),
    NSWorkspace.shared.open(url)
  {
    try emit(["shown": true, "calendarId": handle["calendarId"] ?? "", "uid": handle["uid"] ?? ""])
    return
  }

  _ = NSWorkspace.shared.open(URL(fileURLWithPath: "/System/Applications/Calendar.app"))
  try emit(["shown": true, "calendarId": handle["calendarId"] ?? "", "uid": handle["uid"] ?? ""])
}

do {
  guard CommandLine.arguments.count >= 2 else {
    throw HelperError.message("Missing action")
  }

  let action = CommandLine.arguments[1]
  let input = try readInput()
  let store = EKEventStore()
  try ensureAccess(store)

  switch action {
  case "listCalendars":
    try listCalendars(store: store)
  case "searchEvents":
    try searchEvents(store: store, input: input)
  case "readEvent":
    try readEvent(store: store, input: input)
  case "createEvent":
    try createEvent(store: store, input: input)
  case "updateEvent":
    try updateEvent(store: store, input: input)
  case "deleteEvent":
    try deleteEvent(store: store, input: input)
  case "showEvent":
    try showEvent(store: store, input: input)
  default:
    throw HelperError.message("Unknown action: \(action)")
  }
} catch {
  FileHandle.standardError.write(Data(String(describing: error).utf8))
  FileHandle.standardError.write(Data("\n".utf8))
  exit(1)
}
