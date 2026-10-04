// Temporary, tab-local notes. This owner never writes browser storage. Missing
// or replaced recordings retain recoverable drafts instead of borrowing an ID.
export function createLibraryDrafts() {
    const drafts = new Map();
    function find(entry) {
        return drafts.get(entry.id) || (entry.lineage ? [...drafts.values()].find(draft => draft.lineage === entry.lineage) : null);
    }
    function read(entry) {
        const draft = find(entry);
        return draft ? {...draft, conflict: draft.base !== (entry.notes || '')} :
            {id: entry.id, value: entry.notes || '', base: entry.notes || '', dirty: false, conflict: false};
    }
    function edit(entry, value) {
        const previous = find(entry);
        if (previous) drafts.delete(previous.id);
        if (value === (entry.notes || '')) drafts.delete(entry.id);
        else drafts.set(entry.id, {...previous, id: entry.id, title: entry.title || entry.archive.room,
            lineage: entry.lineage || entry.id,
            room: entry.archive.room, time: entry.archive.session.history.timestamps[0],
            base: previous ? previous.base : entry.notes || '', value, dirty: true});
    }
    function reconcile(entries) {
        // The library reader may select a different representative ID for
        // redundant snapshots. Follow only explicit record aliases, never dates.
        for (const [id, draft] of drafts) {
            const entry = entries.find(entry => entry.id === id || draft.lineage && entry.lineage === draft.lineage ||
                entry.records?.some(record => record.key === 'tierscope:library:v1:' + id));
            if (!entry) continue;
            if (entry.notes === draft.value) { drafts.delete(id); continue; }
            if (entry.id !== id && !drafts.has(entry.id)) { drafts.delete(id); drafts.set(entry.id, {...draft, id: entry.id}); }
        }
    }
    return {read, edit, reconcile,
        list: () => [...drafts.values()].map(draft => ({...draft})),
        discard: id => drafts.delete(id),
        get size() { return drafts.size; }};
}
