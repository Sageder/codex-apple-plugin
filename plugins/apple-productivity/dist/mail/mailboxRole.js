const archiveCandidates = [/^archive$/i, /^archive\d+$/i, /archive/i, /all mail/i];
const trashCandidates = [/^deleted messages$/i, /^deleted items$/i, /^trash$/i, /^bin$/i, /deleted/i, /trash/i];
export function rankMailboxForRole(name, role) {
    const candidates = role === "archive" ? archiveCandidates : trashCandidates;
    const index = candidates.findIndex((candidate) => candidate.test(name));
    return index === -1 ? Number.POSITIVE_INFINITY : index;
}
export function resolveMailboxName(names, role) {
    return [...names]
        .map((name) => ({ name, rank: rankMailboxForRole(name, role) }))
        .filter((entry) => Number.isFinite(entry.rank))
        .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))[0]?.name;
}
//# sourceMappingURL=mailboxRole.js.map