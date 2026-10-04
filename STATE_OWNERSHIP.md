# State ownership

Release 3.11.0 builds on the existing live-session, playback, acquisition and preference owners. Valid samples now commit before drawing, and analysis preferences have a separate owner. The panel and single-script installation stay compatible; backups gain optional analysis and recovery fields. This is an incremental migration; it does not claim that every subsystem is already an independent store.

## Responsibilities

| Area | Responsible modules | Boundary |
| --- | --- | --- |
| Live session | `live-session.js` | Owns accepted users/counts, history/gaps, session highs, trend baseline, start/elapsed time, pause/Stop and broadcaster absence state. Other modules request named operations. |
| Acquisition and request restrictions | `acquisition-state.js`; coordinators in `scanning.js`, `request-policy.js`, `lifecycle.js` | Own request attempts, scan epochs, cancellation checks, API/DOM validation, retry/access restrictions, fallback cadence and browser timer handles. Supply validated snapshots and current time to the session owner. |
| Playback | `playback-state.js`; coordinators in `replay.js` and `session-replay.js` | Owns presentation mode, a copied/frozen recording, position/speed, clock and file-load generations. Coordinators request operations; old views and callbacks cannot change a replacement replay. |
| Persistent records | `storage.js`, `highs-store.js`, `session-file-format.js`, `session-library.js`, `backup.js` | Validate/read/write supplied records; own storage keys, room/tab generations, ATH merging and restore rollback. No dependency on panel or session/playback owners. `session-persistence.js` coordinates session capture/restore and save feedback. |
| Panel preferences and presentation | `panel-preferences.js`, `display-model.js`, `presentation.js`, `*-view.js`; controllers in `panel.js`, `layout.js`, `theme.js`, `charts.js`, `trends.js`, `session-tools.js` | The preference owner controls display choices; selectors prepare frozen values and views render supplied data. Controllers own events, layout effects and library state. Existing preference persistence stays in place. |

`runtime.js` is now a leaf containing the compatibility object. `bootstrap.js` supplies the original defaults, preferences and startup effects, then binds the four owners and explicit scan/presentation callbacks. All application imports are acyclic. The live-session and panel-preference owners have no imports or effects; playback and acquisition receive clock effects explicitly, with no DOM, storage or network dependencies. Callers supply time to the owners.

## Enforced live-session boundary

`LIVE_SESSION_FIELDS` lists the 31 owned fields. After the original bootstrap defaults and preference reads, `initializeLiveSession(runtime)` captures those fields and replaces their runtime properties with non-configurable getters. Existing rendering/export code can still read `runtime.history`, for example, while replacing that property is rejected.

The returned collections are shared read views, **not deeply frozen snapshots**. Callers must not mutate nested arrays, Maps or objects. `ownership-structure.test.cjs` rejects common direct, nested and aliased writes outside the owner/bootstrap, including collection mutators. This source guard is not a general effect/type system: new helpers receiving shared objects still require review. File/replay captures make their own copies; playback snapshots and panel display models are now deeply frozen. The source guard also covers playback, acquisition and preference fields and common aliases.

`session-types.d.ts` and checked JSDoc describe the owner's state, snapshots, receipts and operations. The existing fixture adapter may seed internal fields in its in-memory test copy; those hooks are never bundled into the installed userscript.

## Operations and rules

| Operation | Rule |
| --- | --- |
| `beginAcceptedSample` | Starts one candidate, coordinating users, counts, acquisition metadata, history, gaps and highs. Retains the previous count baseline until commit. |
| `commitAcceptedSample` | While the acquisition context is still current, installs the next trend baseline and closes the receipt before storage, drawing or logging. A receipt commits only once. |
| `abortAcceptedSample` | Restores an uncommitted candidate only while that receipt is pending and current. A committed or invalidated receipt cannot roll back data. |
| `resetLiveSession` | Clears the live session together for Reset, Start or navigation. Reset retains the selected scan on/off preference; Start enables scanning; navigation lets initialization decide from the destination room's saved record. Does not clear ATH, library entries or preferences. |
| `restoreLiveSession` | Takes validated saved data and a derived display frame; restores counts/history/highs/timing without treating saved identities as a fresh live scan. The next sample has a recording gap. |
| `pauseSessionRecording` / `resumeSessionRecording` | Preserve session start and recorded data, exclude the pause from elapsed time, and maintain the recording gap and existing absence-override rules. Normal Pause still allows an already-running request to finish. |
| `pauseSessionForAbsence` / `resumeSessionForOwnerReturn` | Coordinate elapsed time and absence state; the acquisition coordinator owns presence checks, restrictions and request invalidation. |
| `stopLiveSession` | Freezes the committed session and elapsed time; invalidates pending candidate receipts. The coordinator cancels timers/requests and saves the stopped record. Start is a separate operation. |
| `startSessionClock` / `pauseSessionClock` | Update logical time only. They do not create or cancel browser timers. |

Reset, navigation, restore and Stop invalidate outstanding receipts. Stop retains only committed samples. Reset/navigation also invalidate the acquisition epoch/generation through their coordinators, so a late API response cannot populate a new room or session. Existing request restrictions survive session operations.

`stopTrackingTimer()` now only cancels the browser interval. Clearing history, highs or timing requires a session operation. This distinction prevents cleanup from accidentally destroying recorded data.

History-gap policy still comes from the existing chart/timing rules. Session highs survive the 10,000-sample retention window, pauses and Stop. ATH is a separate persistent record. No transaction crosses live state, browser storage and the DOM: candidate rollback is limited to uncommitted work, and durable saves and drawing occur only after live commit. A drawing failure cannot erase a valid sample or its highs.

## Storage failure

A successful live commit remains valid if its session save fails. The existing “Session not saved” warning reports that the latest data is still in the tab; the next successful save includes the retained samples. ATH persistence is attempted independently. Neither a failed session write nor optional logging can roll back a committed sample. This is not an atomic multi-key storage transaction.

## Playback and presentation boundary

`initializePlaybackState` replaces the three runtime roots (`playback`, `presentationMode`, `sessionFileLoadGeneration`) with getter-only properties. A replay view retains its identity but exposes no setters. The archive, chart snapshot and displayed ATH record are copied and deeply frozen. Position, speed, pause/resume, seek, clock handles and ATH replacement change only through owner operations. Replacing or closing playback cancels its clock; already-queued callbacks and operations on old views are ignored. File-read generation checks still reject completion after navigation, Reset, close or a newer file.

`buildPanelDisplayModel` and `buildTrendDisplayModel` capture the counts, highs, labels, highlight flags, comparisons and preferences needed by the views. Live history is copied; an already-frozen replay history can be reused without copying every array on every frame. Counts, highs and room-high timestamps are established when a sample is accepted, before rendering. Repainting cannot create or redate a high.

The main, compact, trend and status views have no owner, storage or controller dependencies. Chart/theme helpers may read visual preferences and maintain a chart-axis cache; a source check explicitly limits these runtime fields. This is a boundary for data rendering, not a claim that every button or layout controller has become a pure view. Presentation callbacks for options/availability/countdown are wired explicitly in bootstrap, avoiding imports back into the controls.

## Record storage and coordination

`writeSessionRecord(model, record)` accepts supplied data and returns `saved`, `failed`, `inactive`, `protected`, `reset` or `stale`. It does not gather live state, change replay, update a DOM element or set save-feedback status. It checks the room epoch again before writing, so a record captured before Reset cannot enter the new epoch. `inspectStoredSession` returns validated data; it never restores the live session itself.

`session-persistence.js` captures session data, requests storage operations, restores through the live owner, coordinates leaving replay and translates storage outcomes into existing feedback. Successful live data remains valid after a storage failure. Record validation is separate from file-picker/replay controls, so library/backup operations cannot direct those controls through an import. Storage schemas, keys, TTLs and library/ATH retention are unchanged.

## Verification and remaining work

The source checks reject unauthorized writes to live/playback/acquisition/preference fields, renderer dependencies on state/storage/controllers, and storage dependencies on owners or presentation. Release 3.10.0 removes all remaining import cycles and the old controller-cycle allowance. Every future application import cycle fails the gate.

Behavior tests cover receipt commit/rollback, Reset/navigation/Stop with delayed API responses, replay replacement and stale callbacks, immutable recording/display snapshots, repainting without live mutations, storage failure/retry, captured records after Reset, and two tabs with Reset during replay and a pending scan. Existing file, library, backup, layout, theme, pulse and browser checks remain in the gate. The original 3.4.0 migration fingerprints are retained with explicit exceptions for reviewed changes.

Remaining shared state includes live collection read views, storage metadata, layout measurements, drag/resize state and some DOM resource handles. The current guards are targeted checks, not a general effect/type system; helpers that receive shared values still require review. The release preserves existing features and panel layout while separating committed samples from drawing success.

## Acquisition and preference boundaries (3.10.0)

`ACQUISITION_FIELDS` owns 15 fields: generations/busy state, last route, DOM health and per-room fallback deadlines, local request restrictions/save status, selected/effective scan intervals, countdown/deadline, and scan/tracking/health timer handles. `beginAcquisition` refuses overlapping, stopped or restricted requests. `finishAcquisition` cannot release a replacement request. Reset, navigation, Stop and absence transitions invalidate work through named operations; ordinary manual Pause still allows an in-flight sample to finish.

Timer replacement and cancellation invalidate queued callbacks, including a valid zero-valued handle. Stopping a timer never clears session data. Navigation clears scheduling and transient health state while retaining origin restrictions and room-specific fallback deadlines. Pending local restrictions merge conservatively with stored restrictions; older revisions cannot clear a newer restriction. Storage reads/writes remain in `request-policy.js`, so local protection survives storage failures.

`PANEL_PREFERENCE_FIELDS` owns 11 choices. Runtime roots are getter-only, geometry/health/policy reads are frozen copies, and collapsed-row/fallback collections expose read-only facades. Controllers request explicit operations before performing existing DOM and persistence effects. A failed preference save keeps the selected value locally. Reset/navigation reset session trend choices while retaining theme, SH/ATH selection, chart window, collapsed rows and geometry, as before. `control-types.d.ts` and checked JSDoc describe both owners.

The chart renderer keeps weakly keyed, private dense copies of immutable sample arrays. These copies are used only for plot reduction; tooltips, exports and playback retain their original immutable recording data. Mutable live arrays bypass the cache, avoiding stale samples after append/trim. See [performance measurements and tradeoffs](PERFORMANCE.md).

## Sample presentation and recovery (3.11.0)

`sample-presentation.js` paints committed data and records failure through the independent `presentation-health.js` owner. Its warning belongs to a history identity, initialization generation and URL; Reset or navigation cannot carry an old warning or redraw into a new session. The existing one-second freshness interval retries drawing, except during Replay. Repainting never appends history, writes storage or replays high pulses; repeated identical errors do not flood the console. Session-save warnings take priority if drawing and saving both fail.

`analysis-preferences.js` owns the saved metric, summary thresholds, comparison threshold and shared-length choice outside runtime. Its pure validator lives in `analysis-preference-data.js`, shared by backup validation. A failed write keeps the choices locally and reports that they are not durable; the next choice change retries. Each successful read merges a changed choice with the latest saved choices from other tabs. This is best-effort preference persistence, not a cross-tab transaction.

Library reading isolates unreadable keys while retaining healthy entries. Explicit partial backups list every omitted key; raw recovery downloads preserve damaged values separately and are not accepted as normal backups. An unreadable value with unknown size prevents library additions until it can be read or explicitly removed. Normal session/library schemas and retention limits are unchanged. Backup format 1 gains optional root fields `analysisPreferences` and `recovery`; older readers can still restore the standard fields, but do not display the new partial-backup notice. New readers accept old backups without clearing analysis preferences that the old file does not contain.

## Library reader lifetime (3.12.0)

A Library opening owns a bounded reader cache, separate from live state, replay, persistence and the analysis-preference owner. Every read checks current keys and raw values, while unchanged entries share frozen aggregate data. Fresh containers isolate grouping and caller changes from the next read. Cached records cannot hide storage errors or deleted/changed values; failed listing clears all retained entries. Closing Library clears the reader. Backup creation and record mutations retain fresh validation and existing rollback/capacity checks. Source-option labels belong to the same dialog and are invalidated when its library or current recording changes.

Model history uses those immutable archives only when requested for a model folder. Its pure analysis reader stores compact summaries keyed by archive identity; replacement archives invalidate derived results naturally, and closing Library clears the reader. Its view receives values and callbacks, without storage or live/playback dependencies. The coordinator owns the metric, range, selected recording, explicit refresh and replay/summary/comparison actions. Live sample updates and entering/leaving Replay do not rebuild the saved-model overview.
