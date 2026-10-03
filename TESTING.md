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
```

`TIERSCOPE_CHROMIUM_PATH` can select an already-installed Chromium executable. `TIERSCOPE_CHROMIUM_ARGS`, if needed, is a JSON array of launch arguments. Normal installations need neither setting. Browser tests remove temporary downloads and screenshots on completion.

## Tier-map evidence

`tests/fixtures/user-list-tiers.json` is synthetic. Its distinct per-tier counts detect accidental mapping swaps, but do not independently prove the current website protocol. A captured, anonymized `getchatuserlist` response paired with independently checked displayed tier totals is still needed for that gate. No real capture was available for release 3.5.0. Unknown codes remain unclassified and appear in diagnostics; this update does not invent new mappings.

## Coverage

| Test | What it verifies |
| --- | --- |
| Modular build | The generated userscript matches source and version metadata; 185 unchanged extracted functions and startup initialization match 3.4.0 after state-access normalization; eleven documented 3.5.0/3.6.0 changes have behavioral coverage. Explicit imports, bundled encoder license, only the intended metadata removals, no runtime module imports or shipped page/test API. |
| Session tools | Real file import, explicit Keep/deduplication, automatic model folders with multiple sessions ordered newest first, global search from inside a folder, incremental display, safe title rendering, rename, confirmed delete, reload and library Replay; audience overview/proportions, peak-time tooltips, multiple threshold input validation and metric changes; backup download, validation preview, cancellation and confirmed restore; restored preferences, visible save errors and retry, dark/bright/narrow layouts, keyboard/focus, unchanged panel geometry/live history and navigation cleanup. |
| Library updates | Growing sessions replace their logical entry, preserve names, and reject older copies as replacements. Distinct starts or conflicting samples stay separate. History rollover, ambiguous legacy windows, concurrent later-arriving shorter snapshots, retained originals after failed writes/restore, update capacity at 500 entries, and cleanup of redundant versions on rename/delete. |
| Direct library controls | Library opens every Session tools tab and starts with model folders, with keyboard access and focus returned to its opener. Keep in library works in ordinary/file Replay: Enter/Space, full frozen recording beyond the playhead, correct file room despite background scans, deduplication and growing-session updates, failure/retry, feedback reset for a different file, no ATH writes, unchanged playback/live data, action/clock/timeline bounds and hidden control after leaving Replay. |
| Library and backup storage | Separate retention through Reset/expiry; 500-record/25 MB bounds, complete 500-record backup round trip, competing tabs, damaged-record preservation; per-room ATH merge without lowering values; allowlisted preferences; library deduplication; full validation/capacity before writes; rollback before/after each failing write and clear incomplete-rollback feedback; cross-tab ATH clear and unsaved local highs. |
| Session statistics | Direct module tests and JSDoc type checking; time weighting across changing scan intervals, gap exclusion, zero/duplicate/backward timestamps, final-sample bounds, zero totals, clipped comparison intervals, out-of-range peaks and their first recorded times, session-high separation, viewer-time-weighted token/anonymous shares with explicit denominators, and multiple inclusive threshold durations/percentages using covered time. |
| Session clock | Session start survives repeated pause/resume and reload; active time excludes pauses; reported high offsets use wall time. |
| Session highs | Values and matching timestamps survive the 10,000-sample rollover, equal highs, lower samples, and reload. Saved highlights use session highs; Replay uses highs through the selected frame. |
| All-time highs | Accepted live peaks and timestamps; SH/ATH labels, header placement, keyboard and compact controls, mode-specific highlights and pulses; session Reset, Stop/Start and expiry; room isolation and persisted preference; explicit file Add including retained session peaks, idempotence and Replay isolation; concurrent writes/compaction, late writes after Clear, confirmation, corrupt records, failed acquisition/rendering/storage and retry. |
| Storage migration | Legacy values/times are reconstructed from the same retained sample; corrupt or unsupported records are skipped and preserved without blocking healthy siblings; repaired records become eligible without Reset; Reset can still clear records explicitly. |
| Multiple tabs | Each tab writes a different record; stale saves do not displace newer samples; Reset invalidates old tabs; expired writers rotate record IDs; valid expired old-epoch orphans are cleaned up while corrupt or unsupported records are retained. Cleanup failures do not block a healthy sibling. |
| Session files and chart windows | Actual JSON file picker/download and round-trip; full history, gaps, highs and timing; old files; rejected malformed/empty/oversized/future files; aggregate-only canonicalization; imported Replay isolation, GIF naming/decoding and re-export; live scans behind Replay; pending-read cancellation after Reset/navigation/close/newer file; directory-page use without acquisition; Full / 4h / 2h / 1h / 30min / 15min bounds, scale, clipped boundary segments, no future Replay samples, preferences and unchanged geometry. |
| Session lifecycle combinations | Pause → reload → failed acquisition → Stop → file Replay → close; Stop during an in-flight scan while file Replay is open; a frozen ordinary Replay export after new scans. |
| Stop and absence | Manual Stop confirmation and cancellation; frozen elapsed time, chart pixels, and trends; late-response rejection; stopped reload; separate-session Start; 2m/5m slowdown and 15m auto-pause; minute-by-minute presence checks without recording absent counts; automatic return behind FILE REPLAY; Stop after three hours auto-paused; one-click Resume override, refresh and manual Pause/Resume persistence, cancellation of the old Stop deadline, and re-arming only on a current API owner observation; selected interval and request restrictions; control bounds and retained Replay/CSV. |
| Startup | Immediate first attempt for a fresh room; countdown measured from completion; visible initial chart point; restored/paused behavior; pause, Reset and navigation during an in-flight request; shared retry/access restrictions; no new directory-page requests; compact scan-settings tooltip. |
| Acquisition | An explicitly synthetic response locks all seven tier codes with distinct totals through saved history. Throwing diagnostics cannot roll back a persisted scan or skip ATH. Session-write failure preserves live data and ATH; a later save catches up. Unsaved-room navigation starts fresh highs and timing. Bad totals, malformed records and duplicate usernames are rejected. Network failures retain saved data. Processing errors restore history and highs. Late responses after navigation or Reset cannot commit. |
| DOM fallback | Browser fixtures verify accepted counts, cooldown, independent Replay, no clicks for an already selected Users tab, restoration of Chat/private tabs, skipping unknown selection, user tab changes during the wait, stale navigation and restoration after a parsing error. |
| Presentation | Saved counts stay non-live until acceptance. Sample-age formatting covers unit boundaries. |
| Layout | All 2,048 collapse combinations are checked at normal and 1.5 inherited line heights, including row overflow and restoration from all-collapsed. |
| Compact dashboard | Chart pixels and 15-minute range, metric persistence across reload, blank saved deltas, live deltas, source/age, settings controls without height growth, control bounds, a visible close button, Escape after focus leaves the panel, broadcast-room refresh at a non-default scale, and page-based startup across room and directory URLs with obsolete view preferences ignored. |
| High-value pulses | Two background/outline pulses on accepted live highs and returns after a dip, expanded and collapsed targets, no repeat at a plateau, no layout retrigger, steady final highlight, reduced motion, Replay isolation, minimized view, failed scans, and Reset cleanup. |
| Charts and inspection | Timestamp spacing and orange dashed gaps in expanded, compact, and Replay charts; dark/bright contrast; compact-window clipping; no future connectors or synthetic counts; bounded peak-preserving drawing; exact sample hover and keyboard inspection; no future data in Replay; centered flat/single samples; original dark-purple and dark-blue colors; no tooltip layout growth. |
| Request policy | HTTP 429 and Retry-After, 401/403 pause with explicit recovery, capped exponential retries, no fallback around restrictions, Reset/reload/multi-tab gates, stale-response races, and storage-write failure. |
| Data minimization | Legacy username fields are ignored on restore without rewriting source records or losing aggregates; new records omit both collections; TXT no longer includes unique female/trans totals; future-schema records remain untouched. |
| Theme | Dark default; checkbox placement and keyboard activation; no layout or tracking changes; original tier colors and green highlights; background opacity; readable registered chart and tooltips; compact/settings/Replay rendering; persistence across refresh and rooms; Reset and storage-failure behavior. |
| Controls | Drag/resize/reload, 100% size reset, edge clamping on expansion, buttons centered within available space, Stop between Pause and Reset, direct Save/Open actions beside Replay, empty-session availability, direct Save/Open actions in ordinary and file Replay, keyboard file actions, full frozen-session exports and replacement-file isolation, countdown and theme-toggle spacing, and CSV download. |
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
