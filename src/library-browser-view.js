import { filterLibraryEntries } from './library-query.js';
import { recordingFilters, toolButton as button, toolNode as node } from './tools-view-helpers.js';

export function renderLibraryBrowser(parent, entries, filters, selected, actions, disclosures, comparisonLimit) {
    const present = new Set(entries.map(entry => entry.id));
    for (const id of selected) if (!present.has(id)) selected.delete(id);
    let shown = 50;
    const book = node(parent, 'details'); book.id = 'tools-sessions-book'; book.open = disclosures.book;
    const bookSummary = node(book, 'summary', 'Sessions Book'); bookSummary.id = 'tools-sessions-book-toggle';
    const search = node(book, 'details'); search.id = 'tools-library-search-menu'; search.open = disclosures.search;
    const searchSummary = node(search, 'summary', 'Search & sort'); searchSummary.id = 'tools-library-search-toggle';
    const inputs = recordingFilters(search, entries, filters, 'tools-library', () => { shown = 50; actions.room(filters.room); rows(); }, true);
    const selectionTools = node(book, 'details'); selectionTools.id = 'tools-library-selection'; selectionTools.open = selected.size > 0;
    node(selectionTools, 'summary', 'Select sessions for Compare or export');
    const bulk = node(selectionTools, 'div', undefined, 'tools-actions tools-library-bulk'), selection = node(bulk, 'span'); selection.id = 'tools-library-selected';
    let matching = [];
    button(bulk, 'Select matching', () => { matching.forEach(entry => selected.add(entry.id)); updateSelection(); }, 'tools-select-matching');
    button(bulk, 'Clear', () => { selected.clear(); updateSelection(); }, 'tools-clear-selection');
    const compare = button(bulk, 'Compare', () => actions.compare([...selected]), 'tools-compare-selected');
    const download = button(bulk, 'Export', () => actions.export([...selected]), 'tools-export-selected');
    download.title = 'Download one library bundle, including titles, notes and favorite models';
    const list = node(book, 'div'); list.id = 'tools-library-list';
    function favoriteButton(parent, room, compact = false) {
        const active = entries.some(entry => entry.archive.room.toLowerCase() === room && entry.modelFavorite);
        const control = button(parent, (active ? '★' : '☆') + (compact ? '' : ' Favorite model'), () => actions.favoriteModel(room), 'tools-model-favorite-' + room);
        control.setAttribute('aria-pressed', String(active)); control.setAttribute('aria-label', (active ? 'Unfavorite ' : 'Favorite ') + room);
        control.title = (active ? 'Unfavorite model ' : 'Favorite model ') + room;
        if (active) control.className = 'tools-primary';
        if (active && !compact && !entries.some(entry => entry.archive.room.toLowerCase() === room && entry.autoKeep)) {
            button(parent, 'Enable automatic keeping…', () => actions.enableAutomatic(room), 'tools-model-enable-' + room);
        }
    }
    function updateSelection() {
        if (selected.size) selectionTools.open = true;
        selection.textContent = selected.size + ' selected' + ([...selected].some(id => !matching.some(entry => entry.id === id)) ? ' · includes hidden sessions' : '');
        compare.disabled = selected.size < 2 || selected.size > comparisonLimit; compare.title = 'Select 2–' + comparisonLimit + ' sessions to compare'; download.disabled = !selected.size;
        for (const row of list.querySelectorAll('[data-library-id]')) row.querySelector('input[type=checkbox]').checked = selected.has(row.dataset.libraryId);
    }
    function rows() {
        list.replaceChildren(); matching = [];
        try { matching = filterLibraryEntries(entries, filters); } catch (error) { node(list, 'p', error.message); }
        searchSummary.textContent = 'Search & sort' + (filters.query || filters.from || filters.to || filters.favorites ? ' · Filters active' : '');
        updateSelection();
        const folders = new Map();
        for (const entry of matching) {
            const room = entry.archive.room.toLowerCase(); if (!folders.has(room)) folders.set(room, []); folders.get(room).push(entry);
        }
        const browsingFolders = !filters.room && !filters.query;
        const visible = browsingFolders ? [...folders.keys()] : matching;
        const heading = node(list, 'div', undefined, 'tools-actions');
        if (!browsingFolders) button(heading, '‹ All models', () => {
            const previous = filters.room; filters.room = ''; filters.query = ''; inputs.model.value = ''; inputs.search.value = ''; shown = 50;
            actions.room(null); rows(); (document.getElementById('tools-folder-' + previous) || searchSummary).focus();
        }, 'tools-library-all-models');
        const room = filters.room && filters.room !== '*' ? filters.room : null;
        node(heading, 'h3', room ? 'Folder: ' + room : browsingFolders ? 'Model folders' : 'Search results — all models');
        if (room) {
            favoriteButton(heading, room);
            button(heading, 'History overview', () => actions.history(room), 'tools-model-history').className = 'tools-primary';
        }
        if (!matching.length) node(list, 'p', entries.length ? 'No matching sessions.' : 'Your library is empty. Keep a session above or import a session file.', 'tools-muted');
        if (browsingFolders) for (const room of visible.slice(0, shown)) {
            const recordings = folders.get(room), row = node(list, 'div', undefined, 'tools-folder');
            const open = button(row, '', () => { filters.room = room; inputs.model.value = room; shown = 50; actions.room(room); rows(); document.getElementById('tools-library-all-models').focus(); }, 'tools-folder-' + room);
            open.className = 'tools-folder-open';
            open.setAttribute('aria-label', 'Open sessions for ' + room);
            node(open, 'span', '▱  ' + room, 'tools-folder-name');
            const summary = actions.cardSummary(recordings);
            node(open, 'span', recordings.length + (recordings.length === 1 ? ' session' : ' sessions') +
                ' · First ' + new Date(summary.first).toLocaleDateString() + ' · Latest ' + new Date(summary.latest).toLocaleDateString(), 'tools-folder-meta');
            const covered = node(open, 'span', 'Total covered time ' + actions.duration(summary.coveredMs), 'tools-folder-meta');
            covered.title = 'Sum of covered intervals in sessions matching the current filters. Gaps and time after the final sample are excluded; overlapping sessions are counted separately.';
            const controls = node(row, 'div', undefined, 'tools-folder-actions');
            favoriteButton(controls, room, true);
            const ids = actions.modelComparisonIds(room);
            const compareModel = button(controls, 'Compare', () => actions.compareModel(room), 'tools-folder-compare-' + room);
            compareModel.disabled = ids.length < 2;
            compareModel.setAttribute('aria-label', 'Compare stored sessions for ' + room);
            compareModel.title = ids.length < 2 ? 'Keep at least two sessions for this model to compare.' :
                'Compare the ' + ids.length + ' latest stored sessions for ' + room + ', independently of the search filters.';
        } else for (const entry of visible.slice(0, shown)) {
            const row = node(list, 'article', undefined, 'tools-row'); row.dataset.libraryId = entry.id;
            const title = node(row, 'label'), check = node(title, 'input'); check.type = 'checkbox'; check.checked = selected.has(entry.id);
            check.setAttribute('aria-label', 'Select ' + (entry.title || entry.archive.room));
            check.onchange = () => { if (check.checked) selected.add(entry.id); else selected.delete(entry.id); updateSelection(); };
            node(title, 'strong', entry.title || entry.archive.room);
            node(row, 'div', entry.archive.room + ' · ' + new Date(entry.archive.session.history.timestamps[0]).toLocaleString() + ' · ' + entry.archive.session.history.timestamps.length + ' samples', 'tools-muted');
            if (entry.notes) node(row, 'p', entry.notes, 'tools-recording-note');
            const controls = node(row, 'div', undefined, 'tools-actions');
            button(controls, 'Replay', () => actions.replay(entry)).className = 'tools-primary';
            button(controls, 'Summary', () => actions.summary(entry));
            const more = node(controls, 'details', undefined, 'tools-more'); node(more, 'summary', 'More…');
            const extras = node(more, 'div', undefined, 'tools-more-actions');
            for (const [label, key] of [['Save file','save'],['TXT','txt'],['CSV','csv'],['GIF','gif'],['Add to all-time highs','highs'],['Rename','rename'],['Delete','delete']]) {
                const action = button(extras, label, () => actions[key](entry)); if (key === 'delete') action.className = 'tools-danger';
            }
            renderRecordingNotes(more, entry, actions);
        }
        if (visible.length > 50) node(list, 'p', 'Showing ' + Math.min(shown, visible.length) + ' of ' + visible.length + (browsingFolders ? ' model folders.' : ' matching sessions.'), 'tools-muted');
        if (shown < visible.length) button(list, 'Show ' + Math.min(50, visible.length - shown) + ' more', () => {
            shown += 50; rows(); (document.getElementById('tools-library-more') || bookSummary).focus();
        }, 'tools-library-more');
    }
    rows();
}

// The coordinator supplies draft values and explicit Save/Discard operations.
export function renderRecordingNotes(parent, entry, actions, missing = false) {
    const label = node(parent, 'label', 'Session notes '), note = node(label, 'textarea');
    note.maxLength = 2000; note.rows = 3; note.value = actions.note(entry).value;
    const status = node(parent, 'p', '', 'tools-muted'); status.setAttribute('role', 'status');
    const controls = node(parent, 'div', undefined, 'tools-actions');
    const save = button(controls, 'Save notes', () => actions.saveNote(entry), 'tools-notes-save-' + entry.id);
    const discard = button(controls, 'Discard changes', () => actions.discardNote(entry), 'tools-notes-discard-' + entry.id);
    function update() {
        const draft = actions.note(entry);
        save.disabled = missing || !draft.dirty; discard.disabled = !draft.dirty;
        status.textContent = missing ? 'Session changed or unavailable. Copy this draft before discarding it.' :
            draft.conflict ? 'Saved notes changed elsewhere. Your draft is still here; saving will ask before replacing them.' :
            draft.dirty ? 'Unsaved note — kept in this tab until you save or discard it.' : 'Notes saved.';
    }
    note.oninput = () => { actions.editNote(entry, note.value); update(); };
    update();
}
