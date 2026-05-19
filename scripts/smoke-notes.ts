import { getRuntimeConfig } from "../src/config.js";
import { NotesAppleScriptBridge } from "../src/notes/notesBridge.js";
import { NotesService } from "../src/notes/notesService.js";

const config = {
  ...getRuntimeConfig(
    {
      ...process.env,
      APPLE_NOTES_WRITE_MODE: process.env.APPLE_NOTES_WRITE_MODE ?? "direct"
    },
    "notes"
  ),
  helperTimeoutMs: Number.parseInt(process.env.APPLE_NOTES_HELPER_TIMEOUT_MS ?? "120000", 10)
};
const notes = new NotesService(new NotesAppleScriptBridge({ timeoutMs: config.helperTimeoutMs }), config);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const title = `Codex Apple Notes smoke ${stamp}`;
const marker = `codex-notes-smoke-${stamp}`;

const access = await notes.requestAccess();
console.log(`Apple Notes accounts: ${access.accountCount}`);
console.log(`Apple Notes folders: ${access.folderCount}`);
console.log(`Apple Notes note count: ${access.noteCount}`);

const folders = await notes.listFolders({ includeCounts: true });
console.log(`Apple Notes folders sampled: ${folders.folders.length}`);

const created = await notes.create({
  title,
  body: `Synthetic smoke note body ${marker}`,
  bodyFormat: "plain",
  confirm: true
});
if (!("note" in created)) {
  throw new Error(`Synthetic note was not created: ${JSON.stringify(created)}`);
}
console.log("Synthetic Apple Note created");

const handle = created.note.handle;
const searched = await notes.search({ query: marker, limit: 5, maxSnippetChars: 0, maxScan: 5000 });
if (!searched.notes.some((note) => note.handle === handle)) {
  throw new Error("Created synthetic note was not returned by search");
}
console.log("Synthetic Apple Note search verified");

const read = await notes.read({ handles: [handle], format: "text", maxBodyChars: 2000 });
if (!read.notes[0]?.bodyText?.includes(marker)) {
  throw new Error("Created synthetic note body did not round-trip");
}
console.log("Synthetic Apple Note read verified");

await notes.append({
  handle,
  body: `Appended smoke marker ${marker}`,
  bodyFormat: "plain",
  confirm: true
});
const reread = await notes.read({ handles: [handle], format: "text", maxBodyChars: 4000 });
if (!reread.notes[0]?.bodyText?.includes("Appended smoke marker")) {
  throw new Error("Synthetic append did not round-trip");
}
console.log("Synthetic Apple Note append verified");

await notes.delete({ handles: [handle], confirm: true });
console.log("Synthetic Apple Note deleted");
