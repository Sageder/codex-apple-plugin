import { getRuntimeConfig } from "../src/config.js";
import { RemindersNativeBridge } from "../src/reminders/nativeBridge.js";
import { RemindersService } from "../src/reminders/remindersService.js";

const config = getRuntimeConfig(process.env, "reminders");
const reminders = new RemindersService(new RemindersNativeBridge({ timeoutMs: config.helperTimeoutMs }), config);

const lists = await reminders.listLists({ maxCountPerList: 200 });
console.log(`Apple Reminders lists: ${lists.lists.length}`);

const incomplete = await reminders.search({
  completed: "incomplete",
  limit: 10,
  maxScanPerList: 100
});

console.log(`Incomplete reminders sample: ${incomplete.reminders.length}`);

const overdue = await reminders.search({
  completed: "incomplete",
  dueBefore: new Date().toISOString(),
  limit: 10,
  maxScanPerList: 100
});

console.log(`Overdue reminders sample: ${overdue.reminders.length}`);
