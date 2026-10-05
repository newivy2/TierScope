# TierScope regression tests

The tests execute the userscript in controlled fixtures. They do not connect to Chaturbate, require an account, or add code to the installed script. Test-only hooks are injected into an in-memory copy of the source.

## Run locally

Use Node.js 22 and npm. From this directory, build the installable script from `src/` before testing:

```sh
npm ci
npm run build
npx playwright install chromium firefox
npm test
```

On a Linux machine missing browser libraries, use `npx playwright install --with-deps chromium firefox` instead. Dependencies are pinned in `package-lock.json`.

Individual commands:

```sh
npm run build:check
npm run typecheck
npm run test:unit
npm run test:browser
npm run test:firefox
npm run test:performance
npm run test:library-performance
```

`TIERSCOPE_CHROMIUM_PATH` can select an already-installed Chromium executable. `TIERSCOPE_CHROMIUM_ARGS`, if needed, is a JSON array of launch arguments. Normal installations need neither setting. Browser tests remove temporary downloads and screenshots on completion.

## Tier-map evidence

`tests/fixtures/user-list-tiers.json` is synthetic. Its distinct per-tier counts detect accidental mapping swaps, but do not independently prove the current website protocol. A captured, anonymized `getchatuserlist` response paired with independently checked displayed tier totals is still needed for that gate. No real capture was available for release 3.5.0. Unknown codes remain unclassified and appear in diagnostics; this update does not invent new mappings.

## Coverage

| Test | What it verifies |
| --- | --- |
| Live-session ownership | Getter-only session fields; direct/aliased-write source guard; coordinated commit/rollback; Reset/navigation/Stop reject candidate and delayed API work; clock cancellation keeps data; pause/resume, replay and save failure/retry stay independent. |
| Playback ownership | Getter-only roots and controls; copied/frozen recording and ATH data; equal pacing and gap timing; pause, seek, speed and completion; replay replacement/close ignore stale operations and queued callbacks. |
| Presentation boundaries | Deeply frozen display snapshots; painting earlier supplied values remains independent of current live counts/high mode; room highs are accepted before painting; replay display remains separate during live scans. |
| Persistence boundaries | Direct record operations have no DOM/live/replay/save-feedback side effects; failures return results; another tab Reset during replay and a pending scan preserves local data without reviving the old epoch; captured pre-Reset and departed-room writes are rejected. |
| Dependency boundaries | Record stores cannot import owners/presentation/controllers; views cannot import live selectors/owners/storage/controllers; explicit allowed compatibility fields; protected layers remain acyclic and new cyclic controller edges are rejected. |
| Modular build | The generated userscript matches source and version metadata; All 196 original functions remain tracked against 3.4.0 fingerprints with explicit reviewed exceptions; original startup defaults/effects stay locked after state-access normalization. All four owner bindings and explicit control callbacks have coverage. Explicit imports, bundled encoder license, only the intended metadata removals, no runtime module imports or shipped page/test API. |
| Maintenance safeguards | Throwing, missing or inaccessible console methods cannot bypass 401/403 blocks, 429/503 waits, fallback/backoff or DOM-health pause/recovery. Complete room routes and malformed/directory URLs; non-room Reset/Clear cause no prompts, writes or scans. Actual-room confirmation/isolation and file-room ATH Add/Clear remain functional on directory pages, including real browser controls. |
| Library book | Left-side docking and borrowed-position restoration; deliberate moves, scaling, live theme updates, narrow viewport fallback and observer cleanup; nonmodal chart interaction and focus after replay changes; selected current/stored JSON/TXT/CSV/GIF exports, real timestamps, full snapshots and live/replay isolation; closing cancels GIF generation. |
| Session tools | Real file import, explicit Keep/deduplication, automatic model folders with multiple sessions ordered newest first, global search from inside a folder, incremental display, safe title rendering, rename, confirmed delete, reload and library Replay; audience overview/proportions, peak-time tooltips, collapsed Summary picker with separate Compare state; session-average threshold defaults, custom input/reset, snapshot/metric changes, unavailable averages, reload and legacy preference isolation; backup download, validation preview, cancellation and confirmed restore; restored preferences, visible save errors and retry, dark/bright/narrow layouts, keyboard/focus, unchanged panel geometry/live history and navigation cleanup. |
| Library updates | Growing sessions replace their logical entry, preserve names, and reject older copies as replacements. Distinct starts or conflicting samples stay separate. History rollover, ambiguous legacy windows, concurrent later-arriving shorter snapshots, retained originals after failed writes/restore, update capacity at 1,000 entries, and cleanup of redundant versions on rename/delete. |
| Direct library controls | Library opens every Session tools tab with Sessions Book and its nested Search & sort initially collapsed; native keyboard toggles, preserved filters/drafts/selections and disclosure choices across Refresh/tab changes, reset on reopening, visible focus after pagination/history, Keep/import reveal, and storage/footer controls outside the book. Focus returns to the Library opener. Keep in library works in ordinary/file Replay: Enter/Space, full frozen recording beyond the playhead, correct file room despite background scans, deduplication and growing-session updates, failure/retry, feedback reset for a different file, no ATH writes, unchanged playback/live data, action/clock/timeline bounds and hidden control after leaving Replay. |
| Library and backup storage | Separate retention through Reset/expiry; default 1,000-record/50 MB bounds, complete 1,000-record backup round trip, competing tabs, damaged-record preservation; per-room ATH merge without lowering values; allowlisted preferences; library deduplication; full validation/capacity before writes; rollback before/after each failing write and clear incomplete-rollback feedback; cross-tab ATH clear and unsaved local highs. |
| Session statistics | Direct module tests and JSDoc type checking; time weighting across changing scan intervals, gap exclusion, zero/duplicate/backward timestamps, final-sample bounds, zero totals, clipped comparison intervals, out-of-range peaks and their first recorded times, session-high separation, viewer-time-weighted token/anonymous shares with explicit denominators, average-derived thresholds with integer rounding and deduplication, and multiple inclusive threshold durations/percentages using covered time. |
| Session clock | Session start survives repeated pause/resume and reload; active time excludes pauses; reported high offsets use wall time. |
| Session highs | Values and matching timestamps survive the 10,000-sample rollover, equal highs, lower samples, and reload. Saved highlights use session highs; Replay uses highs through the selected frame. |
| All-time highs | Accepted live peaks and timestamps; SH/ATH labels, header placement, keyboard and compact controls, mode-specific highlights and pulses; session Reset, Stop/Start and expiry; room isolation and persisted preference; explicit file Add including retained session peaks, idempotence and Replay isolation; concurrent writes/compaction, late writes after Clear, confirmation, corrupt records, failed acquisition/rendering/storage and retry. |
| Storage migration | Legacy values/times are reconstructed from the same retained sample; corrupt or unsupported records are skipped and preserved without blocking healthy siblings; repaired records become eligible without Reset; Reset can still clear records explicitly. |
| Multiple tabs | Each tab writes a different record; stale saves do not displace newer samples; Reset invalidates old tabs; expired writers rotate record IDs; valid expired old-epoch orphans are cleaned up while corrupt or unsupported records are retained. Cleanup failures do not block a healthy sibling. |
| Session files and chart windows | Actual JSON file picker/download and round-trip; full history, gaps, highs and timing; old files; rejected malformed/empty/oversized/future files; aggregate-only canonicalization; imported Replay isolation, GIF naming/decoding and re-export; live scans behind Replay; pending-read cancellation after Reset/navigation/close/newer file; directory-page use without acquisition; Full / 4h / 2h / 1h / 30min / 15min bounds, scale, clipped boundary segments, no future Replay samples, preferences and unchanged geometry. |
| Session lifecycle combinations | Pause → reload → failed acquisition → Stop → file Replay → close; Stop during an in-flight scan while file Replay is open; a frozen ordinary Replay export after new scans. |
| Stop and absence | Manual Stop confirmation and cancellation; frozen elapsed time, chart pixels, and trends; late-response rejection; stopped reload; separate-session Start; 2m/5m slowdown and 15m auto-pause; minute-by-minute presence checks without recording absent counts; automatic return behind FILE REPLAY; Stop after three hours auto-paused; one-click Resume override, refresh and manual Pause/Resume persistence, cancellation of the old Stop deadline, and re-arming only on a current API owner observation; selected interval and request restrictions; control bounds and retained Replay/CSV. |
| Startup | Immediate first attempt for a fresh room; countdown measured from completion; visible initial chart point; restored/paused behavior; pause, Reset and navigation during an in-flight request; shared retry/access restrictions; no new directory-page requests; compact scan-settings tooltip. |
| Acquisition | An explicitly synthetic response locks all seven tier codes with distinct totals through saved history. Throwing diagnostics cannot roll back a persisted scan or skip ATH. Session-write failure preserves live data and ATH; a later save catches up. Unsaved-room navigation starts fresh highs and timing. Bad totals, malformed records and duplicate usernames are rejected. Network failures retain saved data. Uncommitted processing failures restore history and highs. Drawing failures retain committed samples, highs and independent saves, then retry without duplicate samples or pulses. Late responses after navigation or Reset cannot commit. |
| DOM fallback | Browser fixtures verify accepted counts, cooldown, independent Replay, no clicks for an already selected Users tab, restoration of Chat/private tabs, skipping unknown selection, user tab changes during the wait, stale navigation and restoration after a parsing error. |
| Presentation | Saved counts stay non-live until acceptance. Sample-age formatting covers unit boundaries. |
| Layout | All 2,048 collapse combinations are checked at normal and 1.5 inherited line heights, including row overflow and restoration from all-collapsed. |
| Compact dashboard | Chart pixels and 15-minute range, metric persistence across reload, blank saved deltas, live deltas, source/age, settings controls without height growth, control bounds, a visible close button, Escape after focus leaves the panel, broadcast-room refresh at a non-default scale, and page-based startup across room and directory URLs with obsolete view preferences ignored. |
| High-value pulses | Two background/outline pulses on accepted live highs and returns after a dip, expanded and collapsed targets, no repeat at a plateau, no layout retrigger, steady final highlight, reduced motion, Replay isolation, minimized view, failed scans, and Reset cleanup. |
| Charts and inspection | Timestamp spacing and orange dashed gaps in expanded, compact, and Replay charts; dark/bright contrast; compact-window clipping; no future connectors or synthetic counts; bounded peak-preserving drawing; exact sample hover and keyboard inspection; no future data in Replay; centered flat/single samples; original dark-purple and dark-blue colors; no tooltip layout growth. |
| Request policy | HTTP 429 and Retry-After, 401/403 pause with explicit recovery, capped exponential retries, no fallback around restrictions, Reset/reload/multi-tab gates, stale-response races, and storage-write failure. |
| Data minimization | Legacy username fields are ignored on restore without rewriting source records or losing aggregates; new records omit both collections; TXT no longer includes unique female/trans totals; future-schema records remain untouched. |
| Theme | Dark default; checkbox placement and keyboard activation; no layout or tracking changes; original tier colors and green highlights; background opacity; readable registered chart and tooltips; compact/settings/Replay rendering; persistence across refresh and rooms; Reset and storage-failure behavior. |
| Controls | Drag/resize/reload, 100% size reset, edge clamping on expansion, buttons centered within available space, Stop between Pause and Reset, Replay/Library-only main shortcuts, empty-session availability, Library Save/Open actions in live and ordinary/file Replay, keyboard file actions, full frozen-session exports and replacement-file isolation, countdown and theme-toggle spacing, and CSV download. |
| Replay | Even sample pacing across recording pauses and scan-frequency changes in ordinary and file Replay; animated gap pixels that keep moving with equal endpoint counts; exact displayed counts/highs and unchanged history; pause/resume, speed changes, sample-based seeking, previous/next endpoints, pause-on-step, duplicate/backward timestamps, the 30-second cap, and the selected frame surviving collapse and live scans. |
| CSV | Column order, every retained sample, UTC timestamps, computed totals, and formula-safe text. |
| GIF | Actual omggif output is decoded and compared pixel-for-pixel with the renderer. Checks all 12 rows, drawing bounds, 480×640 size, 60-frame cap, ten-second duration, flat/zero/large data, 10,000 samples, cancellation and retry; dashed orange pixels, endpoint colors, gap legend, and no connectors before both samples are available. |

## GitHub automation

The workflow in `.github/workflows/tests.yml` runs `npm test` on pushes and pull requests. This first checks the committed userscript against a fresh in-memory build, then runs the unit, Chromium, and Firefox suites. It has read-only repository permissions. See [BUILDING.md](BUILDING.md) for source ownership and the build workflow.

## Before a release

Run the automated suite, then check the installed userscript in an actual room: one accepted API sample, pause/resume, refresh, Replay, and the downloads. Check another room and the browsers/userscript managers you support. Fixtures cannot guarantee that a changed site DOM or a userscript manager's storage implementation behaves identically.

The browser fixtures run in Chromium and Firefox. The local release check used container-specific Firefox sandbox settings because nested user namespaces were unavailable; this affected only the isolated test browser, not the userscript or its production settings. Other engines and browser/userscript-manager combinations require separate validation.

## Performance check

`npm run test:performance` measures 120 rendered Replay frames near the end of a 10,000-sample history, with all rows visible. It reports mean, 95th-percentile and maximum frame-render times; it is an informational benchmark, not a universal speed guarantee. The renderer retains exact stored samples while reducing draw calls to per-column extrema. See `PERFORMANCE.md` for the release measurement.

## 3.10.0 boundaries and performance

`control-ownership.test.cjs` checks stale request completion, retry/cooldown survival, cross-tab policy revisions, cancelled timer callbacks, immutable read views and local preferences after failed writes. Source guards cover all four owners and reject every application import cycle. `chart-cache.test.cjs` compares cached frozen plots against uncached plots across windows, seeks, duplicate timestamps and gaps, and checks mutable histories after edits/appends/trimming. The theme browser fixture checks the timing/action row order and fixed control bounds across elapsed times (including 100 hours), countdown, scanning, pause, Stop, absence and restriction messages in both themes. It also checks the accessible moon–sun switch, indicator position/color, click/Space activation, visible keyboard focus and reduced-motion behavior.

Run `TIERSCOPE_CPU_THROTTLE=4 npm run test:performance` for a Chromium CPU-slowdown comparison. This simulates CPU pressure, not a particular phone or computer. `TIERSCOPE_SOURCE=/path/to/older.user.js` uses the same fixture and test-only instrumentation for a paired comparison. Results and limitations are in [PERFORMANCE.md](PERFORMANCE.md).

## Recovery maintenance (3.11.0)

`recovery.test.cjs` covers failed painting with successful and failed saves, the automatic redraw interval, Reset/navigation/Stop during painting, Replay isolation, retained gaps/trends/highs, partial backups, raw damaged-value downloads, individual unreadable keys, unknown capacity, restore validation/rollback and preference persistence across tabs. The session-tools browser fixture exercises explicit partial-backup selection, omission warnings in previews and confirmation, recovery-file rejection as a normal backup, analysis choices across refresh, and visible preference-write failure/retry in both engines. The pulse fixture verifies that drawing recovery neither loses samples nor replays a missed high pulse.

## Library cache and benchmark (3.12.0)

`library-cache.test.cjs` verifies bounded reuse of validated records without skipping storage reads, isolation of returned containers, deep immutability of reused snapshots, invalidation on changed/deleted/missing/unreadable values and failed key listing, and fresh state after closing/reopening. It compares cached and uncached reads through deduplication, growing sessions, rename, deletion and backup restore, and checks UTF-8 byte counts for non-ASCII text and lone surrogates. The session-tools browser fixture uses an actual second page sharing storage to change a title and corrupt/restore a record while Library remains open.

`npm run test:library-performance` is informational, with no machine-dependent timing gate. It reports action work (including a forced layout), storage-read counts, backup record counts and JavaScript heap observations for 12 × 300, 500 × 500 and 36 × 10,000 retained samples. It uses an in-memory GM storage fixture, so it does not measure a userscript manager's storage bridge or actual website load. Use `TIERSCOPE_SOURCE=/path/to/older.user.js`, `TIERSCOPE_CPU_THROTTLE=4` and optionally `TIERSCOPE_BENCH_ROUNDS=1` for paired runs. `TIERSCOPE_PROFILE_PATH=/tmp/library-profile` writes Chromium CPU profiles. See [PERFORMANCE.md](PERFORMANCE.md) for measured results and remaining costs.

## Model history (3.13.0)

`model-history.test.cjs` checks cross-recording time weighting and token proportions, gap exclusion, room isolation, chronological windows and ties, retained versus full-session peaks, unavailable versus measured zero, overlap notices, immutable-cache replacement and mutable-input freshness. The calculation module participates in type checking and pure dependency guards; its view participates in presentation dependency guards.

`model-history-browser.cjs` runs in both engines as part of the full suite. It exercises exact displayed statistics, chart/table/keyboard selection, Summary and previous-recording Compare, Replay without live/ATH changes, both themes, narrow layouts and Scope stacking, cross-tab rename/corruption/removal/replacement, empty history, large-folder pagination, range selection, close/reopen and navigation cleanup. Fixture screenshots are saved under `/tmp/tierscope-model-history-<engine>-<theme>.png`.

Release 3.14.0 adds coverage for the first-position page-model shortcut (including empty history, a different replay model and directory pages), a visible comparison action above the chart, and automatic selection of the chosen recording plus up to five earlier recordings from the same model. Unit/browser cases verify selection across the latest-10/30 chart boundary, fewer available recordings, stable timestamp ties and the collapsed picker on entry to Compare.

For history costs, set `TIERSCOPE_BENCH_HISTORY=1 npm run test:library-performance`. This groups every recording in one model folder and measures its first overview, a new/cached metric, latest-10/all ranges, refresh and repeated entry. Existing normal and 4× CPU-slowdown settings apply. This is a synthetic cost measurement, not a user-input latency guarantee.

## Organization and interactive comparison (3.14.0)

`library-analysis.test.cjs` covers combined model/date/text/favorite filters and sorting, local-day inclusion through São Paulo's midnight DST transition, shared cursor behavior at gaps/duplicate timestamps/endpoints, bounded zoom, plot reduction with extrema/gaps/clipped holds and six-record coverage calculations. `library-metadata.test.cjs` exercises model favorites surviving recording deletion, beta 1 star migration, explicit unfavorite choices, recording-note persistence through growth/rename/backup/bundles, failed redundant writes, concurrent foreign writes, complete-batch validation and rollback of recordings/model favorites without ATH/preferences changes.

`library-analysis-browser.cjs` runs in Chromium and Firefox with a São Paulo timezone. It covers dated model browsing, folder stars/all-recordings favorite filtering and cross-tab changes, recording notes and plain-text rendering, selected bundle export, multi-file import and deduplication, six comparison slots, nonduplicated model labels with dates/custom titles, date/model pickers with retained selections, duplicate and removed selections, shared keyboard/pointer inspection, recording gaps, zoom/pan, line visibility, solid pink for the newest date and dashed older lines after slot reordering in both themes, unchanged statistics, live-state isolation, both themes, Scope stacking, reopening and navigation cleanup. Existing file, model-history and library-book fixtures remain active. The suite now runs 13 fixtures per engine.

`TIERSCOPE_BENCH_COMPARE=1 npm run test:library-performance` measures six-record chart metric changes, zoom and 120 cursor updates after 20 warmups. It uses the existing 12 × 300, 500 × 500 and 36 × 10,000 datasets, selecting six recordings per case. Set `TIERSCOPE_CPU_THROTTLE=4` for simulated slowdown. Cursor timing includes inspection-table layout and excludes native userscript storage and actual site load; see PERFORMANCE.md for results and limitations.

## Library continuity (3.15.0)

`library-drafts.test.cjs` checks independent draft/read copies, reverting edits, saved-note conflicts, explicit snapshot aliases, and missing/replaced recording recovery without guessing from timestamps. The Library analysis fixture checks editor-node preservation through individual/bulk selection, drafts through filters/tabs/close, explicit Save/Discard, failed persistence, another browser tab's conflicting edit, recoverable text after deletion, and beforeunload warning cleanup. It also checks unchanged chart/picker nodes on metric changes, zoom/hidden-line/pin retention through threshold updates, filtering and Summary/Compare transitions. Both theme fixtures check the generated version beneath the logo, separation from opacity controls and the 14-pixel footer introduced in 3.15.0 (18 pixels from 3.16.0 for the larger, bold version); all existing scale/collapse/narrow-window checks remain active.

The comparison benchmark additionally measures hiding/showing a line and applying a threshold. Paired runs against 3.14.0 use identical fixtures and alternate execution order; timings remain informational.


## Live-session Library controls (3.17.0)

`model-history.test.cjs` covers selection of up to five earlier sessions by session start, same-session exclusion after history rollover, room isolation, legacy start fallback and stable date ties. `model-library-browser.cjs` checks checkbox consent/cancellation with mouse and keyboard, locked confirmed favorites, cross-tab changes, pending saves, six-session comparison while a different model is replayed, fixed live snapshots through acquisition and replay closure, storage/list/footer order and both themes. Existing browser download fixtures now use the kept session’s More… actions or the replay card.


## Configurable capacity — 3.18.0

`library-capacity.test.cjs` covers existing-install defaults, local settings, cross-tab rereads, validation, corrupt/inaccessible preferences, failed/dropped/after-write/foreign settings writes, lowered allowances without eviction, automatic retry, old-copy byte headroom, capacity changes during writes, exports above local limits, restore/import preflight and the 80% warning boundaries. Existing Library tests now exercise 1,000-session capacity, competing additions, full-count updates and backup round trips. Cache bounds remain separately tested at 500 records / 25 MiB.

`library-capacity-browser.cjs` runs in both browser suites. It covers collapsed settings, persistence through reopen, keyboard/defaults/validation, visible settings-save failures, another tab's limits, warnings, preserved live state, Auto pending/retry, automatic feedback without replacing an unfinished settings editor, backup download/open/restore preflight, explicit repair of malformed limits, both themes and narrow-window input access. The other 14 browser fixtures remain enabled.

`TIERSCOPE_BENCH_CAPACITY=1 npm run test:library-performance` adds a 1,000 × 750-sample dataset (~40 MiB). It measures a backup beyond the former 32-MiB input bound, parsing/validation and duplicate restore as well as browsing. Add `TIERSCOPE_CPU_THROTTLE=4` for simulated slowdown. These are synthetic, informational timings with in-memory GM storage and no machine-dependent pass/fail timing gate.

## Audience display (3.20.0)

`audience-display.test.cjs` checks ratio rounding, the inclusive 5% equality band and zero/invalid denominators. Presentation boundary tests check supplied-frame and replay ratios against later live updates. `audience-browser.cjs` checks four subtotal trend boxes, registered-plus-anonymous deltas across Last/Start baselines, theme-matched yellow/pink borders, larger bottom boxes, adaptive numbers without clipping at 50–150% scale, the ratio’s count/high placement and zero denominator, SH/ATH independence, restored/live/ordinary/file-replay isolation, and narrow layout. The browser suites now include 16 fixtures per engine.

## Follow live (3.21.0)

`analysis-follow.test.cjs` covers snapshot isolation, freeze/catch-up, identity expiry and verified lineage. `follow-live-browser.cjs` covers Summary, six-way Compare and Model History updates from accepted scans; preserved zoom, pinned cursor, hidden lines, selectors, focus, custom thresholds and unfinished edits; frozen views through tab switches and Auto replacements; save failures, replay isolation, favorite revocation from another tab, Reset/navigation, first samples, timestamp gaps, both themes, narrow layouts and Current Live Session button priority. Repeated status refreshes without new samples do not capture more archives. All 18 browser fixtures run in Chromium and Firefox.

## Library chart controls (3.22.0)

`library-chart-controls-browser.cjs` checks background alpha before opening, while open and after reopening; both themes and unchanged text/element opacity; all twelve metrics in order with actual sample-inspection counts; one active radio, arrow wrapping, Home/End, Space and focus; preserved chart nodes; Model History changes; shared-length placement below the chart and above statistics; threshold controls beside Summary/Compare results; scales/narrow widths and unchanged live state. It runs with the existing fixtures in both Chromium and Firefox. The analysis and benchmark fixtures use the visible radios instead of the removed dropdowns.
