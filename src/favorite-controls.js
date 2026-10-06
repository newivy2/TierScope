import { clearAutomaticLibraryStatus, keepFavoriteSession } from './automatic-library.js';
import { readAutomaticKeepingMinutes, readLibraryLimits } from './library-capacity.js';
import { readModelFavorite, setModelFavorite } from './library-models.js';

export function changeModelFavorite(room, enableOnly = false) {
    const previous = readModelFavorite(room);
    if (previous.favorite && !enableOnly) {
        setModelFavorite(room, false);
        clearAutomaticLibraryStatus(room);
        return true;
    }
    const limits = readLibraryLimits(), minimumMinutes = readAutomaticKeepingMinutes();
    if (!confirm('Favorite ' + room + ' and automatically keep their live sessions?\n\n' +
        'While TierScope is recording this model, sessions will be kept in this browser’s Library after ' + minimumMinutes + ' minutes of recorded coverage (excluding pauses and gaps). Change this in Library → Storage limits → Automatic keeping. ' +
        'The same session is updated as it grows, at most once per minute as samples arrive, and on pause, Stop or leaving the room. ' +
        'The current live session qualifies once it reaches this minimum. Replay files are never added automatically.\n\n' +
        'Library limits still apply (' + limits.maxSessions.toLocaleString() + ' sessions / ' + limits.maxMegabytes + ' MB). Nothing is deleted automatically. ' +
        'Removing the star stops automatic keeping; sessions already kept remain.')) return false;
    setModelFavorite(room, true, true);
    keepFavoriteSession(room, true);
    return true;
}
