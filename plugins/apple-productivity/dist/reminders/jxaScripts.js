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
    const date = new Date(value);
    if (String(date) === "Invalid Date") return String(value);
    return date.toISOString();
  } catch (_) {
    return String(value);
  }
}

function dateFromInput(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  if (String(date) === "Invalid Date") throw new Error("Invalid " + field + ": " + value);
  return date;
}

function safeString(fn) {
  try {
    const value = fn();
    return value === undefined || value === null ? "" : String(value);
  } catch (_) {
    return "";
  }
}

function safeBoolean(fn) {
  try {
    return Boolean(fn());
  } catch (_) {
    return false;
  }
}

function safeDate(fn) {
  try {
    return toIso(fn());
  } catch (_) {
    return undefined;
  }
}

function safeNumber(fn) {
  try {
    const value = Number(fn());
    return Number.isFinite(value) ? value : 0;
  } catch (_) {
    return 0;
  }
}

function priorityName(value) {
  const number = Number(value || 0);
  if (number <= 0) return "none";
  if (number <= 3) return "low";
  if (number <= 6) return "medium";
  return "high";
}

function priorityValue(value) {
  const name = lower(value || "none");
  if (name === "low") return 1;
  if (name === "medium") return 5;
  if (name === "high") return 9;
  return 0;
}

function listHandle(list) {
  return {
    listId: String(list.id()),
    listName: String(list.name())
  };
}

function reminderHandle(list, reminder) {
  return {
    listId: String(list.id()),
    listName: String(list.name()),
    id: String(reminder.id())
  };
}

function selectedLists(Reminders, wanted) {
  const lists = Reminders.lists();
  if (!wanted) return lists;

  const needle = lower(wanted);
  return lists.filter(list => lower(list.name()) === needle || lower(list.id()) === needle);
}

function resolveList(Reminders, wanted, defaultList) {
  const candidates = selectedLists(Reminders, wanted || defaultList);
  if (candidates.length) return candidates[0];

  if (wanted || defaultList) {
    throw new Error("Reminder list not found: " + (wanted || defaultList));
  }

  const lists = Reminders.lists();
  if (!lists.length) throw new Error("No reminder lists are available");
  return lists[0];
}

function findListForHandle(Reminders, handle) {
  const byId = selectedLists(Reminders, handle.listId);
  if (byId.length) return byId[0];

  const byName = selectedLists(Reminders, handle.listName);
  if (byName.length) return byName[0];

  throw new Error("Reminder list not found: " + handle.listName);
}

function reminderMatchesId(reminder, id) {
  return safeString(() => reminder.id()) === String(id);
}

function findReminder(Reminders, handle) {
  const list = findListForHandle(Reminders, handle);

  try {
    const matches = list.reminders.whose({ id: String(handle.id) });
    if (matches.length && matches[0].exists()) {
      return { list, reminder: matches[0] };
    }
  } catch (_) {
  }

  const reminders = list.reminders();
  for (let index = 0; index < reminders.length; index += 1) {
    if (reminderMatchesId(reminders[index], handle.id)) {
      return { list, reminder: reminders[index] };
    }
  }

  throw new Error("Reminder not found: " + handle.id);
}

function reminderMetadata(list, reminder, query, options) {
  options = options || {};
  const name = safeString(() => reminder.name());
  const readBody = options.includeBody || Boolean(query);
  const body = readBody ? safeString(() => reminder.body()) : "";
  const listName = safeString(() => list.name());
  const listId = safeString(() => list.id());
  const includeAllDates = Boolean(options.includeAllDates);
  const includeDueDate = includeAllDates || Boolean(options.includeDueDate);
  const includeRemindMeDate = includeAllDates || Boolean(options.includeRemindMeDate);
  const includeCompletionDate = includeAllDates || Boolean(options.includeCompletionDate);
  const terms = lower(query).split(/[^a-z0-9_@.+-]+/).filter(Boolean);
  const searchable = lower([name, body, listName].join(" "));
  const score = terms.reduce((total, term) => {
    if (lower(name).includes(term)) total += 5;
    if (lower(body).includes(term)) total += 2;
    if (searchable.includes(term)) total += 1;
    return total;
  }, 0);

  const result = {
    handle: reminderHandle(list, reminder),
    id: safeString(() => reminder.id()),
    listId,
    listName,
    name,
    searchable,
    completed: safeBoolean(() => reminder.completed()),
    completionDate: includeCompletionDate ? safeDate(() => reminder.completionDate()) : undefined,
    dueDate: includeDueDate ? safeDate(() => reminder.dueDate()) : undefined,
    remindMeDate: includeRemindMeDate ? safeDate(() => reminder.remindMeDate()) : undefined,
    priority: priorityName(safeNumber(() => reminder.priority())),
    creationDate: includeAllDates ? safeDate(() => reminder.creationDate()) : undefined,
    modificationDate: includeAllDates ? safeDate(() => reminder.modificationDate()) : undefined,
    score
  };

  if (options.includeBody) {
    result.body = body.slice(0, options.maxBodyChars || 12000);
    result.truncated = body.length > (options.maxBodyChars || 12000);
  }

  return result;
}

function hasDateInRange(value, since, before) {
  if (!since && !before) return true;
  if (!value) return false;
  const date = new Date(value);
  if (since && date < new Date(since)) return false;
  if (before && date > new Date(before)) return false;
  return true;
}

function passesFilters(metadata, input) {
  const completed = input.completed || "incomplete";
  if (completed === "completed" && !metadata.completed) return false;
  if (completed === "incomplete" && metadata.completed) return false;
  if (input.priority && metadata.priority !== input.priority) return false;
  if (!hasDateInRange(metadata.dueDate, input.dueSince, input.dueBefore)) return false;
  if (!hasDateInRange(metadata.remindMeDate, input.remindSince, input.remindBefore)) return false;

  if (input.query) {
    const terms = lower(input.query).split(/[^a-z0-9_@.+-]+/).filter(Boolean);
    const haystack = metadata.searchable || lower([metadata.name, metadata.body || "", metadata.listName].join(" "));
    if (terms.length && !terms.some(term => haystack.includes(term))) return false;
  }

  return true;
}

function setDueDate(reminder, value) {
  if (value === null) {
    reminder.dueDate = null;
    return;
  }
  const date = dateFromInput(value, "dueDate");
  if (date) reminder.dueDate = date;
}

function setRemindMeDate(reminder, value) {
  if (value === null) {
    reminder.remindMeDate = null;
    return;
  }
  const date = dateFromInput(value, "remindMeDate");
  if (date) reminder.remindMeDate = date;
}

function applyReminderPatch(reminder, input) {
  if (Object.prototype.hasOwnProperty.call(input, "name")) reminder.name = String(input.name);
  if (Object.prototype.hasOwnProperty.call(input, "body")) reminder.body = input.body === null ? "" : String(input.body || "");
  if (Object.prototype.hasOwnProperty.call(input, "dueDate")) setDueDate(reminder, input.dueDate);
  if (Object.prototype.hasOwnProperty.call(input, "remindMeDate")) setRemindMeDate(reminder, input.remindMeDate);
  if (Object.prototype.hasOwnProperty.call(input, "priority")) reminder.priority = priorityValue(input.priority);
  if (Object.prototype.hasOwnProperty.call(input, "completed")) reminder.completed = Boolean(input.completed);
}

function copyReminder(Reminders, sourceList, reminder, targetList) {
  const copy = Reminders.Reminder({
    name: safeString(() => reminder.name()),
    body: safeString(() => reminder.body()),
    completed: safeBoolean(() => reminder.completed()),
    priority: safeNumber(() => reminder.priority())
  });

  targetList.reminders.push(copy);

  const dueDate = safeDate(() => reminder.dueDate());
  const remindMeDate = safeDate(() => reminder.remindMeDate());
  if (dueDate) copy.dueDate = new Date(dueDate);
  if (remindMeDate) copy.remindMeDate = new Date(remindMeDate);

  reminder.delete();
  return copy;
}
`;
export const listReminderListsScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const maxCountPerList = Number(input.maxCountPerList || 2000);

  const lists = Reminders.lists().map(list => {
    const reminders = list.reminders();
    const count = Math.min(reminders.length, maxCountPerList);
    return {
      id: String(list.id()),
      name: String(list.name()),
      reminderCount: count,
      countTruncated: reminders.length > maxCountPerList
    };
  });

  return JSON.stringify(lists);
}
`;
export const searchRemindersScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const limit = Number(input.limit || 20);
  const maxScanPerList = Number(input.maxScanPerList || 200);
  const results = [];

  for (const list of selectedLists(Reminders, input.list)) {
    const reminders = list.reminders();
    const scanCount = Math.min(reminders.length, maxScanPerList);
    for (let index = 0; index < scanCount; index += 1) {
      const metadata = reminderMetadata(list, reminders[index], input.query || "", {
        includeBody: false,
        includeDueDate: Boolean(input.dueSince || input.dueBefore),
        includeRemindMeDate: Boolean(input.remindSince || input.remindBefore)
      });
      if (!passesFilters(metadata, input)) continue;
      delete metadata.searchable;
      results.push(metadata);
      if (results.length >= limit) {
        return JSON.stringify(results.sort((a, b) => (b.score || 0) - (a.score || 0)));
      }
    }
  }

  return JSON.stringify(results.sort((a, b) => (b.score || 0) - (a.score || 0)));
}
`;
export const readRemindersScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const maxBodyChars = Number(input.maxBodyChars || 12000);

  const results = input.handles.map(handle => {
    const found = findReminder(Reminders, handle);
    const metadata = reminderMetadata(found.list, found.reminder, "", {
      includeBody: true,
      maxBodyChars,
      includeAllDates: true
    });
    delete metadata.searchable;
    return metadata;
  });

  return JSON.stringify(results);
}
`;
export const createReminderScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const list = resolveList(Reminders, input.list, input.defaultList);
  const reminder = Reminders.Reminder({ name: String(input.name || "") });

  list.reminders.push(reminder);
  applyReminderPatch(reminder, input);

  return JSON.stringify({
    created: true,
    list: listHandle(list),
    reminder: (function() {
      const metadata = reminderMetadata(list, reminder, "", {
        includeBody: true,
        maxBodyChars: Number(input.maxBodyChars || 12000),
        includeAllDates: true
      });
      delete metadata.searchable;
      return metadata;
    })()
  });
}
`;
export const updateReminderScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const found = findReminder(Reminders, input.handle);

  applyReminderPatch(found.reminder, input);

  if (input.list) {
    const target = resolveList(Reminders, input.list, undefined);
    if (String(target.id()) !== String(found.list.id())) {
      const moved = copyReminder(Reminders, found.list, found.reminder, target);
      return JSON.stringify({
        updated: true,
        moved: true,
        fromList: listHandle(found.list),
        toList: listHandle(target),
        reminder: (function() {
          const metadata = reminderMetadata(target, moved, "", {
            includeBody: true,
            maxBodyChars: Number(input.maxBodyChars || 12000),
            includeAllDates: true
          });
          delete metadata.searchable;
          return metadata;
        })()
      });
    }
  }

  return JSON.stringify({
    updated: true,
    moved: false,
    reminder: (function() {
      const metadata = reminderMetadata(found.list, found.reminder, "", {
        includeBody: true,
        maxBodyChars: Number(input.maxBodyChars || 12000),
        includeAllDates: true
      });
      delete metadata.searchable;
      return metadata;
    })()
  });
}
`;
export const completeRemindersScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const completed = input.completed !== false;
  const reminders = [];

  for (const handle of input.handles) {
    const found = findReminder(Reminders, handle);
    found.reminder.completed = completed;
    const metadata = reminderMetadata(found.list, found.reminder, "", {});
    delete metadata.searchable;
    reminders.push(metadata);
  }

  return JSON.stringify({ completed, reminders });
}
`;
export const deleteRemindersScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const deleted = [];

  for (const handle of input.handles) {
    const found = findReminder(Reminders, handle);
    deleted.push({
      id: String(handle.id),
      listId: String(handle.listId),
      listName: String(handle.listName)
    });
    found.reminder.delete();
  }

  return JSON.stringify({ deleted });
}
`;
export const moveRemindersScript = `
${common}

function run(argv) {
  const input = inputFrom(argv);
  const Reminders = Application("Reminders");
  const target = resolveList(Reminders, input.list, undefined);
  const moved = [];

  for (const handle of input.handles) {
    const found = findReminder(Reminders, handle);
    if (String(found.list.id()) === String(target.id())) {
      moved.push({
        moved: false,
        fromList: listHandle(found.list),
        toList: listHandle(target),
        reminder: (function() {
          const metadata = reminderMetadata(found.list, found.reminder, "", {});
          delete metadata.searchable;
          return metadata;
        })()
      });
      continue;
    }

    const copy = copyReminder(Reminders, found.list, found.reminder, target);
    moved.push({
      moved: true,
      fromList: listHandle(found.list),
      toList: listHandle(target),
      reminder: (function() {
        const metadata = reminderMetadata(target, copy, "", {});
        delete metadata.searchable;
        return metadata;
      })()
    });
  }

  return JSON.stringify({ moved });
}
`;
//# sourceMappingURL=jxaScripts.js.map