# State ownership

Beta 3.8.0-beta.1 builds on the 3.7.0 live-session boundary with owned playback, immutable display models and separate record storage. The panel, single-script installation, file formats and storage keys stay compatible with 3.7.0. This is an incremental migration; it does not claim that every subsystem is already an independent store.

## Responsibilities

| Area | Responsible modules | Boundary |
| --- | --- | --- |
| Live session | `live-session.js` | Owns accepted users/counts, history/gaps, session highs, trend baseline, start/elapsed time, pause/Stop and broadcaster absence state. Other modules request named operations. |
| Acquisition and request restrictions | `scanning.js`, scheduling in `lifecycle.js` | Own request attempts, scan epochs, cancellation checks, API/DOM validation, retry/access restrictions, fallback cadence and browser timer handles. Supply validated snapshots and current time to the session owner. |
| Playback | `playback-state.js`; coordinators in `replay.js` and `files.js` | Owns presentation mode, a copied/frozen recording, position/speed, clock and file-load generations. Coordinators request operations; old views and callbacks cannot change a replacement replay. |
| Persistent records | `storage.js`, `highs-store.js`, `session-file-format.js`, `session-library.js`, `backup.js` | Validate/read/write supplied records; own storage keys, room/tab generations, ATH merging and restore rollback. No dependency on panel or session/playback owners. `session-persistence.js` coordinates session capture/restore and save feedback. |
| Panel preferences and presentation | `display-model.js`, `presentation.js`, `*-view.js`; controllers in `panel.js`, `layout.js`, `theme.js`, `charts.js`, `trends.js`, `session-tools.js` | Selectors prepare frozen values; views render supplied data. Controllers own events/layout/theme/chart selections and dialog state. Existing preference persistence stays in place. |

`runtime.js` is now a leaf containing the compatibility object. `bootstrap.js` supplies the original defaults, preferences and startup effects, then binds the session/playback owners and presentation callbacks. Acquisition and panel preferences still use shared fields. Some controller dependencies remain circular. The live-session owner has no imports or effects; the playback owner receives its clock callbacks explicitly and has no imports, DOM, storage or network access. Callers supply time to both owners.

## Enforced live-session boundary

`LIVE_SESSION_FIELDS` lists the 31 owned fields. After the original bootstrap defaults and preference reads, `initializeLiveSession(runtime)` captures those fields and replaces their runtime properties with non-configurable getters. Existing rendering/export code can still read `runtime.history`, for example, while replacing that property is rejected.

The returned collections are shared read views, **not deeply frozen snapshots**. Callers must not mutate nested arrays, Maps or objects. `ownership-structure.test.cjs` rejects common direct, nested and aliased writes outside the owner/bootstrap, including collection mutators. This source guard is not a general effect/type system: new helpers receiving shared objects still require review. File/replay captures make their own copies; playback snapshots and panel display models are now deeply frozen. The source guard also covers playback fields and common aliases.

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

## Playback and presentation boundary

`initializePlaybackState` replaces the three runtime roots (`playback`, `presentationMode`, `sessionFileLoadGeneration`) with getter-only properties. A replay view retains its identity but exposes no setters. The archive, chart snapshot and displayed ATH record are copied and deeply frozen. Position, speed, pause/resume, seek, clock handles and ATH replacement change only through owner operations. Replacing or closing playback cancels its clock; already-queued callbacks and operations on old views are ignored. File-read generation checks still reject completion after navigation, Reset, close or a newer file.

`buildPanelDisplayModel` and `buildTrendDisplayModel` capture the counts, highs, labels, highlight flags, comparisons and preferences needed by the views. Live history is copied; an already-frozen replay history can be reused without copying every array on every frame. Counts, highs and room-high timestamps are established when a sample is accepted, before rendering. Repainting cannot create or redate a high.

The main, compact, trend and status views have no owner, storage or controller dependencies. Chart/theme helpers may read visual preferences and maintain a chart-axis cache; a source check explicitly limits these runtime fields. This is a boundary for data rendering, not a claim that every button or layout controller has become a pure view. Presentation callbacks for options/availability are wired explicitly in bootstrap, avoiding imports back into the controls.

## Record storage and coordination

`writeSessionRecord(model, record)` accepts supplied data and returns `saved`, `failed`, `inactive`, `protected`, `reset` or `stale`. It does not gather live state, change replay, update a DOM element or set save-feedback status. It checks the room epoch again before writing, so a record captured before Reset cannot enter the new epoch. `inspectStoredSession` returns validated data; it never restores the live session itself.

`session-persistence.js` captures session data, requests storage operations, restores through the live owner, coordinates leaving replay and translates storage outcomes into existing feedback. Successful live data remains valid after a storage failure. Record validation is separate from file-picker/replay controls, so library/backup operations cannot direct those controls through an import. Storage schemas, keys, TTLs and library/ATH retention are unchanged.

## Verification and remaining work

The source checks reject unauthorized live/playback writes, renderer dependencies on state/storage/controllers, and storage dependencies on owners or presentation. `tests/fixtures/controller-cycles.json` records the 32 remaining cyclic import edges (down from 151 in 3.7.0). New cyclic edges fail the gate; reductions are allowed. Owners, data selectors, views and record stores must remain outside every import cycle. This is a reviewed migration allowance for existing controller relationships, not permission to add cycles.

Behavior tests cover receipt commit/rollback, Reset/navigation/Stop with delayed API responses, replay replacement and stale callbacks, immutable recording/display snapshots, repainting without live mutations, storage failure/retry, captured records after Reset, and two tabs with Reset during replay and a pending scan. Existing file, library, backup, layout, theme, pulse and browser checks remain in the gate. The original 3.4.0 migration fingerprints are retained with explicit exceptions for reviewed changes.

Remaining work includes acquisition ownership, panel-preference ownership, replacing the remaining shared live collection reads, and simplifying the remaining UI/coordinator cycles. The current guards are targeted checks, not a general effect/type system; helpers that receive shared values still require review. No new UI features are part of this beta.
