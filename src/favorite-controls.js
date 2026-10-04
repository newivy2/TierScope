import { clearAutomaticLibraryStatus, keepFavoriteSession } from './automatic-library.js';
import { readModelFavorite, setModelFavorite } from './library-models.js';

export function changeModelFavorite(room, enableOnly = false) {
    const previous = readModelFavorite(room);
    if (previous.favorite && !enableOnly) {
        setModelFavorite(room, false);
        clearAutomaticLibraryStatus(room);
        return true;
    }
    if (!confirm('Favorite ' + room + ' and automatically keep their live sessions?\n\n' +
        'While TierScope is recording this model, sessions will be kept in this browser’s Library. ' +
        'The same session is updated as it grows, at most once per minute as samples arrive, and on pause, Stop or leaving the room. ' +
        'The current live session will be kept too. Replay files are never added automatically.\n\n' +
        'Library limits still apply (500 sessions / 25 MB). Nothing is deleted automatically. ' +
        'Removing the star stops automatic keeping; sessions already kept remain.')) return false;
    setModelFavorite(room, true, true);
    keepFavoriteSession(room, true);
    return true;
}
