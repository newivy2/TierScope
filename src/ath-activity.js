import { noteAthVisit, releaseAthLease } from './ath-retention.js';
import { makeStorageId } from './record-validation.js';
import { roomFromUrl } from './room-context.js';
import { diagnostic } from './diagnostics.js';

let room = null, lease = null, clock = null;
export function stopAthActivity() {
    if (clock !== null) clearInterval(clock);
    clock = null;
    try { releaseAthLease(room, lease); } catch (error) { /* A stale lease expires safely. */ }
    room = null;
}
export function observeAthRoom() {
    stopAthActivity();
    const current = roomFromUrl(location.href);
    if (!current) return;
    room = current.toLowerCase(); lease = makeStorageId();
    function heartbeat() {
        if (roomFromUrl(location.href)?.toLowerCase() !== room) { stopAthActivity(); return; }
        try { noteAthVisit(room, lease); }
        catch (error) { diagnostic('warn', 'ATH visit tracking unavailable: ' + error.message); }
    }
    heartbeat();
    clock = setInterval(heartbeat, 60000);
}
