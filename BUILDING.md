# Building TierScope

TierScope is developed as ES modules in `src/`. The repository-root `tierscope.user.js` is the generated, installable artifact. Tampermonkey still installs one script at the same path; there are no runtime module imports or extra installation steps. The pinned omggif encoder is bundled into that file; the installed script loads no encoder from a CDN. Its MIT notice ships in the generated script and in `THIRD_PARTY_LICENSES.txt`.

## Build and test

Use Node.js 22:

```sh
npm ci
npm run build
npm run typecheck
npx playwright install chromium firefox
npm test
```

Edit `src/`, run `npm run build`, and commit both the source and generated script. The build uses pinned esbuild, preserves readable function names, and does not minify the output. It produces no timestamps or machine-specific paths, so identical inputs produce identical output.

`npm run build:check` rebuilds in memory and fails if the committed script differs. `npm test` runs this check before the unit and browser suites, including on GitHub. It never silently repairs a stale script. A source edit must therefore be built before its tests can pass.

Set the release version in `package.json` and update `package-lock.json` with `npm install --package-lock-only`. The build supplies that version to both the Tampermonkey metadata and internal session/report version. Edit matches and permissions only in `src/userscript-header.txt`. Encoder and build dependencies are pinned in `package.json` and verified by the integrity hashes in `package-lock.json` during `npm ci`.

## Source map

| File | Responsibility |
| --- | --- |
| `main.js` | Start one private tracker; panel controls stay inside the userscript sandbox. |
| `runtime.js`, `bootstrap.js` | Leaf compatibility object; separate defaults, preferences, owner bindings and startup effects. |
| `live-session.js` | Owned live data and coordinated sample/lifecycle operations; no effects. See [state ownership](STATE_OWNERSHIP.md). |
| `playback-state.js`, `playback-data.js` | Owned replay controls/clock and immutable recording snapshots; frame calculations. |
| `acquisition-state.js`, `acquisition-context.js` | Owned request generations, deadlines, retry state, fallback cadence and injected timer resources; current-page context adapter. |
| `scanning.js`, `request-policy.js` | API/DOM acquisition and sample-commit coordination; request-policy persistence. |
| `analysis-preferences.js`, `analysis-preference-data.js` | Owned remembered analysis choices; pure typed validation shared by backup code. |
| `panel-preferences.js` | Owned theme, highs mode, chart window, collapsed rows, scale/geometry, compact view and trend choices. |
| `dom.js`, `dom-health.js`, `room-context.js` | Site selectors/fallback parsing, health coordination; pure supported-room route parser. |
| `storage.js`, `record-validation.js` | Session validation/migration, record outcomes, tab records and room generations; shared validation primitives. |
| `session-persistence.js` | Coordinate session capture/save/restore, playback cleanup and save feedback. |
| `session-capture.js`, `session-file-format.js` | Capture an exportable recording; independently validate its file format. |
| `history.js`, `history-data.js` | Append adapter and gap policy; chart-time axes and gap inference. |
| `highs-store.js`, `high-selectors.js`, `highs.js`, `high-pulses.js`, `high-feedback.js` | ATH records, high display values, explicit actions, independent pulse decoration and action feedback. |
| `lifecycle.js` | Timers, pause/resume, Stop, absence checks, Reset and scan scheduling. |
| `files.js`, `session-replay.js`, `replay.js` | File picker/download and chart-window controls; validated file replay; replay transitions and controls. |
| `display-model.js`, `presentation-data.js`, `display-values.js` | Immutable panel/trend models, pure live-count calculations and supplied high labels. |
| `sample-presentation.js`, `presentation-health.js` | Repaint committed samples, retain session-specific drawing warnings and retry without recording or saving again. |
| `presentation.js`, `presentation-status.js` | Coordinate display model selection, painting and explicit control callbacks. |
| `panel-view.js`, `compact-view.js`, `trend-view.js`, `status-view.js` | Render supplied values without reading live/playback state or storage. |
| `chart-view.js`, `charts.js` | Plot/draw/inspect supplied chart data; select live/replay history and coordinate row layout. |
| `panel.js`, `layout.js`, `row-layout.js`, `trends.js` | Panel markup/events, collapsing/geometry/drag/resize, trend settings and escalation. |
| `theme.js`, `theme-values.js`, `format.js` | Theme actions, color preferences and compact number formatting. |
| `session-health.js`, `status-model.js` | Per-room save results; data for source/freshness/save-failure display. |
| `session-library.js`, `backup.js` | Explicit recording persistence, compatible updates/deduplication, limits; validated ATH/library/preferences backup and rollback. |
| `session-analysis.js`, `session-tools.js` | Pure typed statistics; library/summary/compare/restore coordination and explicit recording actions. |
| `library-dock.js`, `library-shell.js` | Nonmodal library positioning, matching theme and responsive shell; no live/session/replay dependencies. |
| `recording-export-data.js`, `recording-exports.js` | Pure archive TXT/CSV builders and validated selected-record downloads. |
| `reports.js`, `gif.js`, `data-io.js` | TXT/CSV/GIF exports and bounded JSON reading/download helpers. |
| `startup.js`, `utils.js`, `diagnostics.js` | Initialization/navigation, shared formatting helpers and non-throwing logging. |
| `immutable-data.js` | Deep-freeze freshly copied recording/display data. |

Feature modules import dependencies explicitly. Live-session, playback, acquisition and panel-preference owners expose getter-only compatibility reads; playback recordings and panel models are deeply frozen. Storage metadata and transient DOM/layout coordination still use shared runtime fields. [STATE_OWNERSHIP.md](STATE_OWNERSHIP.md) describes the boundaries and their limits.

The complete application import graph is acyclic. `dependency-boundaries.test.cjs` rejects any cycle and enforces the protected view/storage layers. Bootstrap wires the explicit scan and presentation callbacks that cross controller boundaries; there is no generic event bus or service locator. Modules must not read runtime values or start effects at module load. `initializeRuntime()` in `bootstrap.js` preserves original preference/default/effect order and then binds owners and explicit presentation callbacks before navigation polling.

## Migration safeguards

The existing tests still execute the generated userscript. `tests/helpers/instrument.cjs` adapts their test-only hooks to shared/owned state and bundler formatting in memory; the assertions are unchanged, and no test API is included in the installed script. The helper also exposes the private tracker only inside the test copy; the installed script does not publish `window.ViewerTracker` or request `unsafeWindow`.

`tests/modular-build.test.cjs` compares all 196 extracted function syntax trees and the initialization sequence with fingerprints of 3.4.0 in `tests/fixtures/3.4.0-structure.json`. Only state access, declaration placement, and the release version are normalized. The original baseline is unchanged. Release 3.5.0 introduced five explicit function exceptions, each with behavior coverage: `performScanThenReturn` and `log` for commit/logging safety, `acquireDOMSnapshot` for tab restoration, `generateGifFromHistory` for its bundled encoder, and `updateHighControls` for the retention tooltip. Release 3.6.0 additionally changes `saveSession`, `updateAcquisitionStatus`, `updateMiniFreshness`, `bindPanelOptions` and `updatePanelOptions` for save feedback and the tools entry, plus `createPanel` for the direct replay Keep in library button. Those changes have unit/browser coverage. Release 3.6.1 additionally changes `acquireRoomSnapshot` and `validateDOMHealth` for safe diagnostics, `getModelNameFromUrl` and `isBroadcastRoom` for consistent room routes, and `resetAllTracking`, `resetTrackingData` and `updateStopControls` for non-room Reset guards. `maintenance-regressions.test.cjs` and the ATH browser fixture cover these paths. Release 3.7.0 introduced session ownership. Release 3.8.0 adds playback operations, display models/views and record-store separation, with initialization coverage for the playback and presentation bindings. Release 3.9.0 updates already-reviewed panel, file-control and GIF functions for the attached Library and selected-record exports; library-book and updated file/ATH/browser fixtures cover the new flow. Release 3.10.0 adds reviewed ownership adapters, controller callback wiring and the chart rendering cache. The full set of 196 original functions is still checked, with explicit exceptions in `modular-build.test.cjs`; the original fingerprints have not been regenerated. The original defaults/effect order remains locked. New feature modules and helpers have behavior/boundary tests rather than original-function fingerprints. Metadata checks permit only removal of `unsafeWindow` and the external `@require`; the raw bundle is tested for absence of a page control API. The baseline commit is recorded in the fixture.

These fingerprints guard the unchanged parts of the migration. A later feature change must explicitly update or retire the relevant migration checks in its reviewed change, alongside behavior tests; do not regenerate the fingerprints merely to make a failure disappear.

The browser suite covers both engines, all 2,048 row-collapse combinations, themes, playback, files, ATH, pulses, acquisition, and downloads. Follow the actual-room release check in [TESTING.md](TESTING.md) before publishing a release.

## Session tools development

The nonmodal Library is attached beside the panel by `library-dock.js`; it owns temporary position adjustments, DOM observers and their cleanup. `library-shell.js` uses the panel theme variables. The tools coordinator validates selected archives before downloads or replay. Export builders receive complete recordings and never read live/playback state. These new view/data modules are included in dependency boundary checks.

The new tools keep their own state instead of adding fields to the shared runtime. Analysis functions take an archive and return statistics without touching DOM, storage, tracking or replay. Their JSDoc types are checked with TypeScript (`npm run typecheck`), and their tests import the ES modules directly. `src/package.json` declares the source modules explicitly; existing CommonJS test helpers are unchanged.

Library keys use `tierscope:library:v1:<id>`, independent of temporary sessions and ATH. Keep is explicit; no Stop hook or automatic expiry is installed. Model folders are a view of archive room names and require no migration. Updates match room/session start and verify shared samples, retained extent and highs before choosing a fuller copy. New immutable snapshots are written before obsolete ones are removed; concurrent compatible versions read as one entry, selecting the fuller copy. Titles and initial addition times survive updates. Capacity checks include temporary snapshot bytes, and a failed operation removes only its own new entry. Backup restore validates everything and preflights capacity before writing. It retains original library and ATH snapshots until the complete restore succeeds; rollback compares values before undoing its own writes. If rollback also fails, the user sees an incomplete-restore warning.

Statistics hold each sample until the next accepted sample, exclude marked gaps and zero-duration intervals, and assign no duration after the last sample. Comparison alignment starts at the first retained sample, not an estimated earlier session start. Shared-duration mode clips weighted intervals at the shorter recording's span. Full-session highs stay separate from peaks within that range.

All console access goes through `diagnostics.js`; a structural check prevents new direct calls elsewhere. Logging failures must never alter acquisition, request restrictions or persistence. `room-context.js` recognizes only complete `/<room>/`, `/b/<room>/` and `/<room>/cam/` routes (with optional trailing slash), excluding reserved directories and invalid room names. File archives use their independently validated room field, so directory-page replay retains its own ATH actions.

## Recovery maintenance (3.11.0)

Valid acquisitions commit before any drawing or persistence effect. `recovery.test.cjs` and the pulse/browser fixtures verify sample retention, independent save failures, automatic redraw, stale-session protection and Replay isolation. The library reader can isolate individual read failures; a partial backup requires explicit opt-in, declares omissions and leaves originals intact. Raw recovery exports are deliberately separate from importable backups. Remembered analysis choices use `tierscope:ui:analysis:v1`; their validation is shared with backup code without a store-to-controller dependency. Existing import-cycle and ownership gates continue to apply.

## Library performance (3.12.0 beta)

`createLibraryReader()` in `session-library.js` owns a cache for one open Library. Every read enumerates current keys and retrieves raw values; only identical strings can reuse validated data and UTF-8 byte counts. Changed/deleted/unavailable values invalidate their entries, and a failed key listing clears the cache. Admission is bounded by 500 raw records and 25 MiB of raw data; an oversized or over-count library is still fully reported. The cache stores frozen, validated aggregate snapshots and returns new grouping containers. Arrays contain validated primitives and are frozen before recursively freezing enclosing objects, avoiding another per-sample walk.

The tools coordinator clears the reader and source-label choices on close. Source labels are reused while the selected snapshot and library view are unchanged. Storage mutations and backup creation continue to use fresh reads and validation. UTF-8 sizing uses TextEncoder instead of constructing temporary Blobs; Unicode and lone-surrogate tests verify identical size accounting. `library-cache.test.cjs` covers reuse, bounds, invalidation, immutable snapshots, growing sessions and restore. Browser fixtures use a second tab to verify refresh after title changes and corruption.

`npm run test:library-performance` measures small, 500-record and long-recording libraries. It supports the same source and CPU-throttle environment settings as the replay benchmark. Results, methodology and limitations are in [PERFORMANCE.md](PERFORMANCE.md). No benchmark hooks ship in the installed script.
