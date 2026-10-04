export function toolNode(parent, tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    parent.appendChild(node); return node;
}

export function toolButton(parent, text, action, id) {
    const button = toolNode(parent, 'button', text); button.type = 'button'; button.onclick = action;
    if (id) button.id = id; return button;
}

export function recordingFilters(parent, entries, state, prefix, changed, organization = false) {
    const controls = toolNode(parent, 'div', undefined, 'tools-filters');
    const label = toolNode(controls, 'label', 'Model '), model = toolNode(label, 'select'); model.id = prefix + '-model';
    const rooms = [...new Set(entries.map(entry => entry.archive.room.toLowerCase()))].sort();
    for (const [value, name] of [['', organization ? 'All models (folders)' : 'All models'], ...(organization ? [['*', 'All recordings']] : []), ...rooms.map(room => [room, room])]) {
        const option = toolNode(model, 'option', name); option.value = value;
    }
    if (![...model.options].some(option => option.value === (state.room || ''))) state.room = '';
    model.value = state.room || ''; model.onchange = () => { state.room = model.value; changed(); };
    for (const [key, name] of [['from', 'From'], ['to', 'Through']]) {
        const label = toolNode(controls, 'label', name + ' '), input = toolNode(label, 'input'); input.type = 'date'; input.id = prefix + '-' + key;
        input.value = state[key] || ''; input.onchange = () => { state[key] = input.value; changed(); };
    }
    const searchLabel = toolNode(controls, 'label', 'Find ', 'tools-search'), search = toolNode(searchLabel, 'input');
    search.type = 'search'; search.id = prefix + '-search'; search.placeholder = 'Title, model or notes'; search.value = state.query || '';
    search.oninput = () => { state.query = search.value; changed(); };
    if (organization) {
        const label = toolNode(controls, 'label', 'Sort '), sort = toolNode(label, 'select'); sort.id = prefix + '-sort';
        for (const [value, name] of [['newest','Newest first'],['oldest','Oldest first'],['title','Title'],['model','Model'],['favorites','Favorites first']]) {
            const option = toolNode(sort, 'option', name); option.value = value;
        }
        sort.value = state.sort || 'newest'; sort.onchange = () => { state.sort = sort.value; changed(); };
        const favoriteLabel = toolNode(controls, 'label'), favorite = toolNode(favoriteLabel, 'input'); favorite.type = 'checkbox'; favorite.id = prefix + '-favorites';
        favorite.checked = !!state.favorites; toolNode(favoriteLabel, 'span', 'Favorites only'); favorite.onchange = () => { state.favorites = favorite.checked; changed(); };
    }
    toolButton(controls, 'Clear filters', () => {
        Object.assign(state, {room: '', from: '', to: '', query: '', favorites: false, sort: 'newest'});
        model.value = ''; search.value = '';
        controls.querySelectorAll('input[type=date]').forEach(input => { input.value = ''; });
        if (organization) { controls.querySelector('input[type=checkbox]').checked = false; controls.querySelector('#' + prefix + '-sort').value = 'newest'; }
        changed();
    }, prefix + '-clear');
    toolNode(parent, 'p', 'Dates use the first retained sample in your browser’s local timezone; “Through” includes that whole day.', 'tools-muted');
    return {model, search};
}
