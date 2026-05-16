import EventKit
import Foundation

struct HelperFailure: Error, CustomStringConvertible {
    let description: String
}

struct ErrorOutput: Codable {
    let error: String
}

struct ReminderHandle: Codable {
    let listId: String
    let listName: String
    let id: String
}

struct ReminderListOutput: Codable {
    let id: String
    let name: String
    let reminderCount: Int
    let countTruncated: Bool
}

struct RecurrenceInput: Codable {
    let frequency: String
    let interval: Int?
    let endDate: String?
}

struct RecurrenceOutput: Codable {
    let frequency: String
    let interval: Int?
    let endDate: String?
}

struct ReminderOutput: Codable {
    let handle: ReminderHandle
    let id: String
    let listId: String
    let listName: String
    let name: String
    let completed: Bool
    let completionDate: String?
    let dueDate: String?
    let remindMeDate: String?
    let priority: String
    let creationDate: String?
    let modificationDate: String?
    let url: String?
    let alarmDates: [String]?
    let recurrence: RecurrenceOutput?
    let score: Int?
    let body: String?
    let truncated: Bool?
}

struct ListListsInput: Codable {
    let maxCountPerList: Int?
}

struct SearchInput: Codable {
    let query: String?
    let list: String?
    let completed: String?
    let dueSince: String?
    let dueBefore: String?
    let remindSince: String?
    let remindBefore: String?
    let priority: String?
    let limit: Int?
    let maxScanPerList: Int?
}

struct ReadInput: Codable {
    let handles: [ReminderHandle]
    let maxBodyChars: Int?
}

struct CreateInput: Codable {
    let name: String
    let body: String?
    let list: String?
    let dueDate: String?
    let remindMeDate: String?
    let alarmDates: [String]?
    let priority: String?
    let url: String?
    let recurrence: RecurrenceInput?
    let completed: Bool?
    let defaultList: String?
    let maxBodyChars: Int?
}

struct UpdateInput: Decodable {
    let handle: ReminderHandle
    let name: String?
    let body: String?
    let list: String?
    let dueDate: String?
    let remindMeDate: String?
    let alarmDates: [String]?
    let priority: String?
    let url: String?
    let recurrence: RecurrenceInput?
    let completed: Bool?
    let maxBodyChars: Int?
    let hasName: Bool
    let hasBody: Bool
    let hasDueDate: Bool
    let hasRemindMeDate: Bool
    let hasAlarmDates: Bool
    let hasPriority: Bool
    let hasUrl: Bool
    let hasRecurrence: Bool
    let hasCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case handle
        case name
        case body
        case list
        case dueDate
        case remindMeDate
        case alarmDates
        case priority
        case url
        case recurrence
        case completed
        case maxBodyChars
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        handle = try container.decode(ReminderHandle.self, forKey: .handle)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        body = try container.decodeIfPresent(String.self, forKey: .body)
        list = try container.decodeIfPresent(String.self, forKey: .list)
        dueDate = try container.decodeIfPresent(String.self, forKey: .dueDate)
        remindMeDate = try container.decodeIfPresent(String.self, forKey: .remindMeDate)
        alarmDates = try container.decodeIfPresent([String].self, forKey: .alarmDates)
        priority = try container.decodeIfPresent(String.self, forKey: .priority)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        recurrence = try container.decodeIfPresent(RecurrenceInput.self, forKey: .recurrence)
        completed = try container.decodeIfPresent(Bool.self, forKey: .completed)
        maxBodyChars = try container.decodeIfPresent(Int.self, forKey: .maxBodyChars)
        hasName = container.contains(.name)
        hasBody = container.contains(.body)
        hasDueDate = container.contains(.dueDate)
        hasRemindMeDate = container.contains(.remindMeDate)
        hasAlarmDates = container.contains(.alarmDates)
        hasPriority = container.contains(.priority)
        hasUrl = container.contains(.url)
        hasRecurrence = container.contains(.recurrence)
        hasCompleted = container.contains(.completed)
    }
}

struct CompleteInput: Codable {
    let handles: [ReminderHandle]
    let completed: Bool?
}

struct DeleteInput: Codable {
    let handles: [ReminderHandle]
}

struct MoveInput: Codable {
    let handles: [ReminderHandle]
    let list: String
}

struct CreateOutput: Codable {
    let created: Bool
    let list: ReminderHandle
    let reminder: ReminderOutput
}

struct UpdateOutput: Codable {
    let updated: Bool
    let moved: Bool
    let fromList: ReminderHandle?
    let toList: ReminderHandle?
    let reminder: ReminderOutput
}

struct CompleteOutput: Codable {
    let completed: Bool
    let reminders: [ReminderOutput]
}

struct DeleteOutput: Codable {
    let deleted: [ReminderHandle]
}

struct MoveEntry: Codable {
    let moved: Bool
    let fromList: ReminderHandle
    let toList: ReminderHandle
    let reminder: ReminderOutput
}

struct MoveOutput: Codable {
    let moved: [MoveEntry]
}

final class ReminderRunner {
    private let store = EKEventStore()
    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    private let isoFormatterNoFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    func run(action: String, data: Data) throws -> Data {
        let decoder = JSONDecoder()
        switch action {
        case "listLists":
            return try encode(listLists(try decoder.decode(ListListsInput.self, from: data)))
        case "search":
            return try encode(search(try decoder.decode(SearchInput.self, from: data)))
        case "read":
            return try encode(read(try decoder.decode(ReadInput.self, from: data)))
        case "create":
            return try encode(create(try decoder.decode(CreateInput.self, from: data)))
        case "update":
            return try encode(update(try decoder.decode(UpdateInput.self, from: data)))
        case "complete":
            return try encode(complete(try decoder.decode(CompleteInput.self, from: data)))
        case "delete":
            return try encode(delete(try decoder.decode(DeleteInput.self, from: data)))
        case "move":
            return try encode(move(try decoder.decode(MoveInput.self, from: data)))
        case "status":
            return try encode(["authorizationStatus": authorizationStatusName()])
        default:
            throw HelperFailure(description: "Unknown Reminders helper action: \(action)")
        }
    }

    private func listLists(_ input: ListListsInput) throws -> [ReminderListOutput] {
        try ensureFullAccess()
        let maxCount = input.maxCountPerList ?? 2_000
        return calendars().map { calendar in
            let count = (try? fetchReminders(in: [calendar], maxPerCalendar: maxCount + 1).count) ?? 0
            return ReminderListOutput(
                id: calendar.calendarIdentifier,
                name: calendar.title,
                reminderCount: min(count, maxCount),
                countTruncated: count > maxCount
            )
        }
    }

    private func search(_ input: SearchInput) throws -> [ReminderOutput] {
        try ensureFullAccess()
        let selectedCalendars = try calendars(matching: input.list)
        let maxScan = input.maxScanPerList ?? 200
        let limit = input.limit ?? 20
        let reminders = try fetchReminders(in: selectedCalendars, maxPerCalendar: maxScan)
        let query = input.query ?? ""
        let scored = reminders
            .compactMap { reminder -> ReminderOutput? in
                guard passesFilters(reminder, input: input) else { return nil }
                return output(for: reminder, query: query, includeBody: false, maxBodyChars: 0, includeRichFields: false)
            }
            .sorted { ($0.score ?? 0) > ($1.score ?? 0) }
        return Array(scored.prefix(limit))
    }

    private func read(_ input: ReadInput) throws -> [ReminderOutput] {
        try ensureFullAccess()
        return try input.handles.map { handle in
            let reminder = try findReminder(handle)
            return output(
                for: reminder,
                query: "",
                includeBody: true,
                maxBodyChars: input.maxBodyChars ?? 12_000,
                includeRichFields: true
            )
        }
    }

    private func create(_ input: CreateInput) throws -> CreateOutput {
        try ensureFullAccess()
        let calendar = try resolveCalendar(wanted: input.list, defaultList: input.defaultList)
        let reminder = EKReminder(eventStore: store)
        reminder.calendar = calendar
        reminder.title = input.name
        try applyCreate(input, to: reminder)
        try store.save(reminder, commit: true)
        return CreateOutput(
            created: true,
            list: listHandle(calendar),
            reminder: output(for: reminder, query: "", includeBody: true, maxBodyChars: input.maxBodyChars ?? 12_000, includeRichFields: true)
        )
    }

    private func update(_ input: UpdateInput) throws -> UpdateOutput {
        try ensureFullAccess()
        let reminder = try findReminder(input.handle)
        guard let originalCalendar = reminder.calendar else {
            throw HelperFailure(description: "Reminder has no list: \(input.handle.id)")
        }
        try applyUpdate(input, to: reminder)
        var targetCalendar: EKCalendar?
        if let list = input.list {
            targetCalendar = try resolveCalendar(wanted: list, defaultList: nil)
            reminder.calendar = targetCalendar
        }
        try store.save(reminder, commit: true)
        return UpdateOutput(
            updated: true,
            moved: targetCalendar != nil && targetCalendar?.calendarIdentifier != originalCalendar.calendarIdentifier,
            fromList: targetCalendar == nil ? nil : listHandle(originalCalendar),
            toList: targetCalendar.map(listHandle),
            reminder: output(for: reminder, query: "", includeBody: true, maxBodyChars: input.maxBodyChars ?? 12_000, includeRichFields: true)
        )
    }

    private func complete(_ input: CompleteInput) throws -> CompleteOutput {
        try ensureFullAccess()
        let completed = input.completed ?? true
        let reminders = try input.handles.map { handle -> ReminderOutput in
            let reminder = try findReminder(handle)
            reminder.isCompleted = completed
            if completed && reminder.completionDate == nil {
                reminder.completionDate = Date()
            }
            if !completed {
                reminder.completionDate = nil
            }
            try store.save(reminder, commit: true)
            return output(for: reminder, query: "", includeBody: false, maxBodyChars: 0, includeRichFields: false)
        }
        return CompleteOutput(completed: completed, reminders: reminders)
    }

    private func delete(_ input: DeleteInput) throws -> DeleteOutput {
        try ensureFullAccess()
        var deleted: [ReminderHandle] = []
        for handle in input.handles {
            let reminder = try findReminder(handle)
            deleted.append(handleFor(reminder))
            try store.remove(reminder, commit: true)
        }
        return DeleteOutput(deleted: deleted)
    }

    private func move(_ input: MoveInput) throws -> MoveOutput {
        try ensureFullAccess()
        let targetCalendar = try resolveCalendar(wanted: input.list, defaultList: nil)
        let moved = try input.handles.map { handle -> MoveEntry in
            let reminder = try findReminder(handle)
            guard let originalCalendar = reminder.calendar else {
                throw HelperFailure(description: "Reminder has no list: \(handle.id)")
            }
            let didMove = originalCalendar.calendarIdentifier != targetCalendar.calendarIdentifier
            if didMove {
                reminder.calendar = targetCalendar
                try store.save(reminder, commit: true)
            }
            return MoveEntry(
                moved: didMove,
                fromList: listHandle(originalCalendar),
                toList: listHandle(targetCalendar),
                reminder: output(for: reminder, query: "", includeBody: false, maxBodyChars: 0, includeRichFields: false)
            )
        }
        return MoveOutput(moved: moved)
    }

    private func applyCreate(_ input: CreateInput, to reminder: EKReminder) throws {
        reminder.notes = input.body
        if let dueDate = input.dueDate {
            reminder.dueDateComponents = try dateComponents(from: dueDate)
        }
        let alarmDates = input.alarmDates ?? input.remindMeDate.map { [$0] } ?? []
        if !alarmDates.isEmpty {
            reminder.alarms = try alarmDates.map { EKAlarm(absoluteDate: try parseDate($0, field: "alarmDates")) }
        }
        reminder.priority = priorityValue(input.priority)
        if let url = input.url {
            reminder.url = URL(string: url)
        }
        if let recurrence = input.recurrence {
            reminder.recurrenceRules = [try recurrenceRule(from: recurrence)]
        }
        if input.completed == true {
            reminder.isCompleted = true
            reminder.completionDate = Date()
        }
    }

    private func applyUpdate(_ input: UpdateInput, to reminder: EKReminder) throws {
        if input.hasName, let name = input.name {
            reminder.title = name
        }
        if input.hasBody {
            reminder.notes = input.body
        }
        if input.hasDueDate {
            reminder.dueDateComponents = try input.dueDate.map { try dateComponents(from: $0) }
        }
        if input.hasRemindMeDate {
            if let remindMeDate = input.remindMeDate {
                reminder.alarms = [EKAlarm(absoluteDate: try parseDate(remindMeDate, field: "remindMeDate"))]
            } else {
                reminder.alarms = nil
            }
        }
        if input.hasAlarmDates {
            reminder.alarms = try input.alarmDates?.map { EKAlarm(absoluteDate: try parseDate($0, field: "alarmDates")) }
        }
        if input.hasPriority {
            reminder.priority = priorityValue(input.priority)
        }
        if input.hasUrl {
            reminder.url = input.url.flatMap(URL.init(string:))
        }
        if input.hasRecurrence {
            reminder.recurrenceRules = try input.recurrence.map { [try recurrenceRule(from: $0)] }
        }
        if input.hasCompleted, let completed = input.completed {
            reminder.isCompleted = completed
            reminder.completionDate = completed ? Date() : nil
        }
    }

    private func passesFilters(_ reminder: EKReminder, input: SearchInput) -> Bool {
        switch input.completed ?? "incomplete" {
        case "completed":
            if !reminder.isCompleted { return false }
        case "incomplete":
            if reminder.isCompleted { return false }
        default:
            break
        }

        if let priority = input.priority, priorityName(reminder.priority) != priority {
            return false
        }

        if !dateInRange(dateFromComponents(reminder.dueDateComponents), since: input.dueSince, before: input.dueBefore, field: "dueDate") {
            return false
        }

        if !dateInRange(firstAlarmDate(reminder), since: input.remindSince, before: input.remindBefore, field: "remindMeDate") {
            return false
        }

        if let query = input.query, !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            let terms = tokenize(query)
            let haystack = [reminder.title ?? "", reminder.notes ?? "", reminder.calendar?.title ?? "", reminder.url?.absoluteString ?? ""]
                .joined(separator: " ")
                .lowercased()
            if !terms.contains(where: { haystack.contains($0) }) {
                return false
            }
        }

        return true
    }

    private func output(
        for reminder: EKReminder,
        query: String,
        includeBody: Bool,
        maxBodyChars: Int,
        includeRichFields: Bool
    ) -> ReminderOutput {
        let body = reminder.notes ?? ""
        let clippedBody = includeBody ? String(body.prefix(maxBodyChars)) : nil
        let alarmDates = includeRichFields ? absoluteAlarmDates(reminder).map(formatDate) : nil
        let recurrence = includeRichFields ? recurrenceOutput(reminder.recurrenceRules?.first) : nil
        return ReminderOutput(
            handle: handleFor(reminder),
            id: reminder.calendarItemIdentifier,
            listId: reminder.calendar?.calendarIdentifier ?? "",
            listName: reminder.calendar?.title ?? "",
            name: reminder.title ?? "",
            completed: reminder.isCompleted,
            completionDate: includeRichFields ? reminder.completionDate.map(formatDate) : nil,
            dueDate: dateFromComponents(reminder.dueDateComponents).map(formatDate),
            remindMeDate: firstAlarmDate(reminder).map(formatDate),
            priority: priorityName(reminder.priority),
            creationDate: includeRichFields ? reminder.creationDate.map(formatDate) : nil,
            modificationDate: includeRichFields ? reminder.lastModifiedDate.map(formatDate) : nil,
            url: includeRichFields ? reminder.url?.absoluteString : nil,
            alarmDates: alarmDates,
            recurrence: recurrence,
            score: score(reminder, query: query),
            body: clippedBody,
            truncated: includeBody ? body.count > maxBodyChars : nil
        )
    }

    private func score(_ reminder: EKReminder, query: String) -> Int {
        let terms = tokenize(query)
        if terms.isEmpty { return 0 }
        let title = (reminder.title ?? "").lowercased()
        let notes = (reminder.notes ?? "").lowercased()
        let list = (reminder.calendar?.title ?? "").lowercased()
        return terms.reduce(0) { total, term in
            total
                + (title.contains(term) ? 5 : 0)
                + (notes.contains(term) ? 2 : 0)
                + (list.contains(term) ? 1 : 0)
        }
    }

    private func tokenize(_ value: String) -> [String] {
        value
            .lowercased()
            .split { !$0.isLetter && !$0.isNumber && $0 != "_" && $0 != "@" && $0 != "." && $0 != "+" && $0 != "-" }
            .map(String.init)
    }

    private func fetchReminders(in selectedCalendars: [EKCalendar], maxPerCalendar: Int) throws -> [EKReminder] {
        var results: [EKReminder] = []
        for calendar in selectedCalendars {
            let fetched = try fetchReminders(in: [calendar])
            results.append(contentsOf: fetched.prefix(maxPerCalendar))
        }
        return results
    }

    private func fetchReminders(in selectedCalendars: [EKCalendar]) throws -> [EKReminder] {
        let semaphore = DispatchSemaphore(value: 0)
        var reminders: [EKReminder]?
        let predicate = store.predicateForReminders(in: selectedCalendars)
        store.fetchReminders(matching: predicate) { fetched in
            reminders = fetched ?? []
            semaphore.signal()
        }
        semaphore.wait()
        return reminders ?? []
    }

    private func findReminder(_ handle: ReminderHandle) throws -> EKReminder {
        if let reminder = store.calendarItem(withIdentifier: handle.id) as? EKReminder {
            return reminder
        }

        let calendar = try resolveCalendar(wanted: handle.listId, defaultList: handle.listName)
        if let match = try fetchReminders(in: [calendar]).first(where: { $0.calendarItemIdentifier == handle.id }) {
            return match
        }

        throw HelperFailure(description: "Reminder not found: \(handle.id)")
    }

    private func calendars(matching wanted: String? = nil) throws -> [EKCalendar] {
        let all = calendars()
        guard let wanted, !wanted.isEmpty else { return all }
        let needle = wanted.lowercased()
        let matches = all.filter {
            $0.title.lowercased() == needle || $0.calendarIdentifier.lowercased() == needle
        }
        if matches.isEmpty {
            throw HelperFailure(description: "Reminder list not found: \(wanted)")
        }
        return matches
    }

    private func calendars() -> [EKCalendar] {
        store.calendars(for: .reminder)
    }

    private func resolveCalendar(wanted: String?, defaultList: String?) throws -> EKCalendar {
        if let wanted, !wanted.isEmpty {
            return try calendars(matching: wanted)[0]
        }

        if let defaultList, !defaultList.isEmpty {
            return try calendars(matching: defaultList)[0]
        }

        if let defaultCalendar = store.defaultCalendarForNewReminders() {
            return defaultCalendar
        }

        guard let first = calendars().first else {
            throw HelperFailure(description: "No reminder lists are available")
        }
        return first
    }

    private func listHandle(_ calendar: EKCalendar) -> ReminderHandle {
        ReminderHandle(listId: calendar.calendarIdentifier, listName: calendar.title, id: calendar.calendarIdentifier)
    }

    private func handleFor(_ reminder: EKReminder) -> ReminderHandle {
        ReminderHandle(
            listId: reminder.calendar?.calendarIdentifier ?? "",
            listName: reminder.calendar?.title ?? "",
            id: reminder.calendarItemIdentifier
        )
    }

    private func priorityName(_ value: Int) -> String {
        if value <= 0 { return "none" }
        if value <= 3 { return "low" }
        if value <= 6 { return "medium" }
        return "high"
    }

    private func priorityValue(_ value: String?) -> Int {
        switch value ?? "none" {
        case "low": return 1
        case "medium": return 5
        case "high": return 9
        default: return 0
        }
    }

    private func recurrenceRule(from input: RecurrenceInput) throws -> EKRecurrenceRule {
        let frequency: EKRecurrenceFrequency
        switch input.frequency {
        case "daily": frequency = .daily
        case "weekly": frequency = .weekly
        case "monthly": frequency = .monthly
        case "yearly": frequency = .yearly
        default: throw HelperFailure(description: "Unsupported recurrence frequency: \(input.frequency)")
        }
        let end = try input.endDate.map { EKRecurrenceEnd(end: try parseDate($0, field: "recurrence.endDate")) }
        return EKRecurrenceRule(recurrenceWith: frequency, interval: input.interval ?? 1, end: end)
    }

    private func recurrenceOutput(_ rule: EKRecurrenceRule?) -> RecurrenceOutput? {
        guard let rule else { return nil }
        let frequency: String
        switch rule.frequency {
        case .daily: frequency = "daily"
        case .weekly: frequency = "weekly"
        case .monthly: frequency = "monthly"
        case .yearly: frequency = "yearly"
        @unknown default: frequency = "daily"
        }
        return RecurrenceOutput(
            frequency: frequency,
            interval: rule.interval,
            endDate: rule.recurrenceEnd?.endDate.map(formatDate)
        )
    }

    private func firstAlarmDate(_ reminder: EKReminder) -> Date? {
        absoluteAlarmDates(reminder).first
    }

    private func absoluteAlarmDates(_ reminder: EKReminder) -> [Date] {
        (reminder.alarms ?? [])
            .compactMap(\.absoluteDate)
            .sorted()
    }

    private func dateInRange(_ date: Date?, since: String?, before: String?, field: String) -> Bool {
        if since == nil && before == nil { return true }
        guard let date else { return false }
        if let since, let lower = try? parseDate(since, field: field), date < lower { return false }
        if let before, let upper = try? parseDate(before, field: field), date > upper { return false }
        return true
    }

    private func dateComponents(from value: String) throws -> DateComponents {
        if isDateOnly(value) {
            let parts = value.split(separator: "-").compactMap { Int($0) }
            if parts.count == 3 {
                var components = DateComponents()
                components.calendar = Calendar.current
                components.year = parts[0]
                components.month = parts[1]
                components.day = parts[2]
                return components
            }
        }

        let date = try parseDate(value, field: "date")
        return Calendar.current.dateComponents([.calendar, .timeZone, .year, .month, .day, .hour, .minute, .second], from: date)
    }

    private func dateFromComponents(_ components: DateComponents?) -> Date? {
        guard let components else { return nil }
        return components.date
    }

    private func parseDate(_ value: String, field: String) throws -> Date {
        if let date = isoFormatter.date(from: value) ?? isoFormatterNoFraction.date(from: value) {
            return date
        }

        if isDateOnly(value) {
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "yyyy-MM-dd"
            if let date = formatter.date(from: value) {
                return date
            }
        }

        throw HelperFailure(description: "Invalid \(field): \(value)")
    }

    private func isDateOnly(_ value: String) -> Bool {
        value.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil
    }

    private func formatDate(_ date: Date) -> String {
        isoFormatterNoFraction.string(from: date)
    }

    private func ensureFullAccess() throws {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        if statusAllowsRead(status) {
            return
        }

        if status == .denied || status == .restricted {
            throw HelperFailure(description: "Reminders access is \(authorizationStatusName())")
        }

        if status == .notDetermined {
            let semaphore = DispatchSemaphore(value: 0)
            var granted = false
            var requestError: Error?
            if #available(macOS 14.0, *) {
                store.requestFullAccessToReminders { didGrant, error in
                    granted = didGrant
                    requestError = error
                    semaphore.signal()
                }
            } else {
                store.requestAccess(to: .reminder) { didGrant, error in
                    granted = didGrant
                    requestError = error
                    semaphore.signal()
                }
            }
            semaphore.wait()
            if let requestError {
                throw requestError
            }
            if !granted {
                throw HelperFailure(description: "Reminders access was not granted")
            }
            return
        }

        throw HelperFailure(description: "Reminders access is \(authorizationStatusName())")
    }

    private func statusAllowsRead(_ status: EKAuthorizationStatus) -> Bool {
        if #available(macOS 14.0, *) {
            return status == .fullAccess
        } else {
            return status == .authorized
        }
    }

    private func authorizationStatusName() -> String {
        let status = EKEventStore.authorizationStatus(for: .reminder)
        if status == .notDetermined { return "notDetermined" }
        if status == .restricted { return "restricted" }
        if status == .denied { return "denied" }
        if #available(macOS 14.0, *) {
            if status == .fullAccess { return "fullAccess" }
            if status == .writeOnly { return "writeOnly" }
        } else if status == .authorized {
            return "authorized"
        }
        return "unknown"
    }

    private func encode<T: Encodable>(_ value: T) throws -> Data {
        let encoder = JSONEncoder()
        return try encoder.encode(value)
    }
}

func fail(_ error: Error) -> Never {
    let message: String
    if let failure = error as? HelperFailure {
        message = failure.description
    } else {
        message = error.localizedDescription
    }
    if let payload = try? JSONEncoder().encode(ErrorOutput(error: message)) {
        FileHandle.standardError.write(payload)
    } else {
        FileHandle.standardError.write(Data("Reminders helper failed".utf8))
    }
    exit(1)
}

let action = CommandLine.arguments.dropFirst().first
guard let action else {
    fail(HelperFailure(description: "Missing Reminders helper action"))
}

do {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    let output = try ReminderRunner().run(action: action, data: input.isEmpty ? Data("{}".utf8) : input)
    FileHandle.standardOutput.write(output)
} catch {
    fail(error)
}
