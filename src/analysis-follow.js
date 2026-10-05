// One owner per Library view. It only replaces displayed snapshots supplied by
// the coordinator; it never reads storage or changes a live/replay recording.
export function createAnalysisFollower() {
    let enabled = true, identity = null, signature = '', expired = false;
    const snapshots = new Map();
    return {
        get enabled() { return enabled; },
        get expired() { return expired; },
        get identity() { return identity; },
        get(id) { return snapshots.get(id); },
        forget(id) { snapshots.delete(id); },
        toggle(value) { enabled = value; signature = ''; },
        reset() { identity = null; signature = ''; expired = false; snapshots.clear(); },
        check(nextIdentity) {
            if (identity !== null && identity !== nextIdentity) { enabled = false; expired = true; }
            return !expired;
        },
        update(nextIdentity, nextSignature, entries, archive) {
            if (!enabled || !this.check(nextIdentity) || !entries.length) return false;
            if (signature === nextSignature && entries.every(entry => snapshots.get(entry.id)?.archive === archive)) return false;
            identity = nextIdentity; signature = nextSignature;
            for (const entry of entries) snapshots.set(entry.id, {...entry, archive});
            return true;
        },
        project(entries) { return entries.map(entry => snapshots.has(entry.id) ? {...entry, archive: snapshots.get(entry.id).archive} : entry); },
        // Only storage-proven lineage may carry a selection through an Auto
        // replacement. Deleted/reimported and conflicting recordings don't match.
        reconcile(entries) {
            const aliases = new Map();
            for (const [id, snapshot] of snapshots) {
                if (!snapshot.lineage) continue;
                const next = entries.find(entry => entry.lineage === snapshot.lineage);
                if (!next || next.id === id) continue;
                snapshots.delete(id); snapshots.set(next.id, {...next, archive: snapshot.archive}); aliases.set(id, next.id);
            }
            return aliases;
        }
    };
}
