# State ownership

Release 3.7.0 defines ownership boundaries and enforces the first one: live-session data. The panel, single-script installation, file formats and storage keys stay compatible with 3.6.1. This is an incremental migration; it does not claim that every subsystem is already an independent store.

## Responsibilities

| Area | Responsible modules | Boundary |
| --- | --- | --- |
| Live session | `live-session.js` | Owns accepted users/counts, history/gaps, session highs, trend baseline, start/elapsed time, pause/Stop and broadcaster absence state. Other modules request named operations. |
| Acquisition and request restrictions | `scanning.js`, scheduling in `lifecycle.js` | Own request attempts, scan epochs, cancellation checks, API/DOM validation, retry/access restrictions, fallback cadence and browser timer handles. Supply validated snapshots and current time to the session owner. |
| Playback | `replay.js`, file loading in `files.js` | Own copied playback history, presentation mode, position/speed, playback clock and file-load generations. A live sample cannot mutate the playback snapshot. |
| Persistent records | `storage.js`, `highs.js`, `session-library.js`, `backup.js`, `session-health.js` | Own validation, storage keys, room/tab generations, ATH merging, explicit library actions, restore rollback and save status. Durable writes are separate from live acceptance. |
| Panel preferences and presentation | `panel.js`, `layout.js`, `theme.js`, `compact.js`, `charts.js`, `trends.js`, `session-tools.js` | Own layout, theme, chart/trend selections and dialog state. Render session reads; do not write live-session fields. Existing preference persistence stays in place. |

`runtime.js` still provides constants, bootstrap defaults and compatibility reads. Acquisition, playback and panel fields retain their existing shared representation; further encapsulation is separate work. Some function dependencies remain circular. The session owner is a leaf module: no imports, network, DOM, storage or browser timers, and callers supply time explicitly.

## Enforced live-session boundary

`LIVE_SESSION_FIELDS` lists the 31 owned fields. After the original bootstrap defaults and preference reads, `initializeLiveSession(runtime)` captures those fields and replaces their runtime properties with non-configurable getters. Existing rendering/export code can still read `runtime.history`, for example, while replacing that property is rejected.

The returned collections are shared read views, **not deeply frozen snapshots**. Callers must not mutate nested arrays, Maps or objects. `ownership-structure.test.cjs` rejects common direct, nested and aliased writes outside the owner/bootstrap, including collection mutators. This source guard is not a general effect/type system: new helpers receiving shared objects still require review. File/replay captures continue making their own copies.

`session-types.d.ts` and checked JSDoc describe the owner's state, snapshots, receipts and operations. The existing fixture adapter may seed internal fields in its in-memory test copy; those hooks are never bundled into the installed userscript.

## Operations and rules

| Operation | Rule |
| --- | --- |
| `beginAcceptedSample` | Starts one candidate, coordinating users, counts, acquisition metadata, history, gaps and highs. Retains the previous count baseline while presentation calculates the trend. |
| `commitAcceptedSample` | After presentation succeeds and the acquisition context is still current, installs the next trend baseline and closes the receipt. A receipt commits only once. |
| `abortAcceptedSample` | Restores the prior session after a presentation error, only while that receipt is pending and current. A committed or invalidated receipt cannot roll back data. |
| `resetLiveSession` | Clears the live session together for Reset, Start or navigation. Reset retains the selected scan on/off preference; Start enables scanning; navigation lets initialization decide from the destination room's saved record. Does not clear ATH, library entries or preferences. |
| `restoreLiveSession` | Takes validated saved data and a derived display frame; restores counts/history/highs/timing without treating saved identities as a fresh live scan. The next sample has a recording gap. |
| `pauseSessionRecording` / `resumeSessionRecording` | Preserve session start and recorded data, exclude the pause from elapsed time, and maintain the recording gap and existing absence-override rules. Normal Pause still allows an already-running request to finish. |
| `pauseSessionForAbsence` / `resumeSessionForOwnerReturn` | Coordinate elapsed time and absence state; the acquisition coordinator owns presence checks, restrictions and request invalidation. |
| `stopLiveSession` | Freezes the committed session and elapsed time; invalidates pending candidate receipts. The coordinator cancels timers/requests and saves the stopped record. Start is a separate operation. |
| `startSessionClock` / `pauseSessionClock` | Update logical time only. They do not create or cancel browser timers. |

Reset, navigation, restore and Stop invalidate outstanding receipts. Stop retains only committed samples. Reset/navigation also invalidate the acquisition epoch/generation through their coordinators, so a late API response cannot populate a new room or session. Existing request restrictions survive session operations.

`stopTrackingTimer()` now only cancels the browser interval. Clearing history, highs or timing requires a session operation. This distinction prevents cleanup from accidentally destroying recorded data.

History-gap policy still comes from the existing chart/timing rules. Session highs survive the 10,000-sample retention window, pauses and Stop. ATH is a separate persistent record. No transaction crosses live state, browser storage and the DOM: candidate rollback preserves the existing presentation-error behavior, and durable saves occur only after live commit.

## Storage failure

A successful live commit remains valid if its session save fails. The existing “Session not saved” warning reports that the latest data is still in the tab; the next successful save includes the retained samples. ATH persistence is attempted independently. Neither a failed session write nor optional logging can roll back a committed sample. This is not an atomic multi-key storage transaction.

## Verification and subsequent work

The new tests exercise receipt commit/rollback and invalidation, timer cancellation without data loss, delayed responses during replay across Reset/navigation/Stop, renderer-triggered Reset, and save failure/retry across pause/resume/Stop. Existing session, absence, storage, startup, replay, layout and browser fixtures remain part of the gate. Migration fingerprints keep the original 3.4.0 baseline and explicitly identify reviewed function changes.

Further work can give acquisition and playback their own protected state, then replace shared collection reads with explicit presentation views. Removing the remaining rendering-time high update and reducing circular coordinator dependencies should accompany that work, with the same preservation tests. No new UI features are part of this release.
