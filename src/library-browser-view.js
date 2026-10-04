import { filterLibraryEntries } from './library-query.js';
import { recordingFilters, toolButton as button, toolNode as node } from './tools-view-helpers.js';

export function renderLibraryBrowser(parent, entries, filters, selected, actions) {
    const present = new Set(entries.map(entry => entry.id));
    for (const id of selected) if (!present.has(id)) selected.delete(id);
    let shown = 50;
    const inputs = recordingFilters(parent, entries, filters, 'tools-library', () => { shown = 50; actions.room(filters.room); rows(); }, true);
    const bulk = node(parent, 'div', undefined, 'tools-actions'), selection = node(bulk, 'span'); selection.id = 'tools-library-selected';
    let matching = [];
    button(bulk, 'Select matching', () => { matching.forEach(entry => selected.add(entry.id)); rows(); }, 'tools-select-matching');
    button(bulk, 'Clear selection', () => { selected.clear(); rows(); }, 'tools-clear-selection');
    const compare = button(bulk, 'Compare selected', () => actions.compare([...selected]), 'tools-compare-selected');
    const download = button(bulk, 'Export selected', () => actions.export([...selected]), 'tools-export-selected');
    download.title = 'Download one library bundle, including titles, notes and favorite models';
    const list = node(parent, 'div'); list.id = 'tools-library-list';
    function favoriteButton(parent, room, compact = false) {
        const active = entries.some(entry => entry.archive.room.toLowerCase() === room && entry.modelFavorite);
        const control = button(parent, (active ? '★' : '☆') + (compact ? '' : ' Favorite model'), () => actions.favoriteModel(room), 'tools-model-favorite-' + room);
        control.setAttribute('aria-pressed', String(active)); control.setAttribute('aria-label', (active ? 'Unfavorite ' : 'Favorite ') + room);
        control.title = (active ? 'Unfavorite model ' : 'Favorite model ') + room;
        if (active) control.className = 'tools-primary';
    }
    function rows() {
        list.replaceChildren(); matching = [];
        try { matching = filterLibraryEntries(entries, filters); } catch (error) { node(list, 'p', error.message); }
        selection.textContent = selected.size + ' selected (including hidden recordings)';
        compare.disabled = selected.size < 2 || selected.size > 6; compare.title = 'Select 2–6 recordings to compare'; download.disabled = !selected.size;
        const folders = new Map();
        for (const entry of matching) {
            const room = entry.archive.room.toLowerCase(); if (!folders.has(room)) folders.set(room, []); folders.get(room).push(entry);
        }
        const browsingFolders = !filters.room && !filters.query;
        const visible = browsingFolders ? [...folders.keys()] : matching;
        const heading = node(list, 'div', undefined, 'tools-actions');
        if (!browsingFolders) button(heading, '‹ All models', () => {
            const previous = filters.room; filters.room = ''; filters.query = ''; inputs.model.value = ''; inputs.search.value = ''; shown = 50;
            actions.room(null); rows(); (document.getElementById('tools-folder-' + previous) || inputs.search).focus();
        }, 'tools-library-all-models');
        const room = filters.room && filters.room !== '*' ? filters.room : null;
        node(heading, 'h3', room ? 'Folder: ' + room : browsingFolders ? 'Model folders' : 'Search results — all models');
        if (room) {
            favoriteButton(heading, room);
            button(heading, 'History overview', () => actions.history(room), 'tools-model-history').className = 'tools-primary';
        }
        if (!matching.length) node(list, 'p', entries.length ? 'No matching recordings.' : 'Your library is empty. Keep a recording above or import a session file.', 'tools-muted');
        if (browsingFolders) for (const room of visible.slice(0, shown)) {
            const recordings = folders.get(room), row = node(list, 'div', undefined, 'tools-folder');
            const open = button(row, '', () => { filters.room = room; inputs.model.value = room; shown = 50; actions.room(room); rows(); document.getElementById('tools-library-all-models').focus(); }, 'tools-folder-' + room);
            open.className = 'tools-folder-open';
            open.setAttribute('aria-label', 'Open recordings for ' + room);
            node(open, 'span', '▱  ' + room, 'tools-folder-name');
            const latest = Math.max(...recordings.map(entry => entry.archive.session.history.timestamps[0]));
            node(open, 'span', recordings.length + (recordings.length === 1 ? ' recording' : ' recordings') + ' · Latest ' + new Date(latest).toLocaleDateString(), 'tools-folder-meta');
            favoriteButton(row, room, true);
        } else for (const entry of visible.slice(0, shown)) {
            const row = node(list, 'article', undefined, 'tools-row'); row.dataset.libraryId = entry.id;
            const title = node(row, 'label'), check = node(title, 'input'); check.type = 'checkbox'; check.checked = selected.has(entry.id);
            check.setAttribute('aria-label', 'Select ' + (entry.title || entry.archive.room));
            check.onchange = () => { if (check.checked) selected.add(entry.id); else selected.delete(entry.id); rows(); list.querySelector('[data-library-id="' + entry.id + '"] input').focus(); };
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
            const noteLabel = node(more, 'label', 'Recording notes '), note = node(noteLabel, 'textarea'); note.maxLength = 2000; note.rows = 3; note.value = entry.notes || '';
            button(more, 'Save notes', () => actions.metadata(entry, {notes: note.value}), 'tools-notes-save-' + entry.id);
        }
        if (visible.length > 50) node(list, 'p', 'Showing ' + Math.min(shown, visible.length) + ' of ' + visible.length + (browsingFolders ? ' model folders.' : ' matching recordings.'), 'tools-muted');
        if (shown < visible.length) button(list, 'Show ' + Math.min(50, visible.length - shown) + ' more', () => {
            shown += 50; rows(); (document.getElementById('tools-library-more') || inputs.search).focus();
        }, 'tools-library-more');
    }
    rows();
}
