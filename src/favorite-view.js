// Data-only star presentation shared by the panel and Library.
export function paintFavoriteButton(button, room, state) {
    button.dataset.favoriteRoom = room;
    button.textContent = state.favorite ? '★' : '☆';
    button.disabled = room === 'unknown' || !!state.error;
    button.setAttribute('aria-pressed', String(!!state.favorite));
    button.setAttribute('aria-label', (state.favorite ? 'Remove favorite ' : 'Favorite ') + room);
    button.title = state.error || (state.favorite ? state.autoKeep ? 'Favorite · automatic keeping on. Click to remove favorite.' :
        'Favorite · automatic keeping off. Enable in Library, or click to remove favorite.' :
        'Favorite this model and automatically keep live sessions in Library. Asks for confirmation.');
    button.style.color = state.favorite ? 'var(--panel-accent)' : 'var(--panel-muted)';
}
