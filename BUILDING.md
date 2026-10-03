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
| `runtime.js` | Shared state, constants, saved preferences, and startup side effects in their original order. |
| `scanning.js` | API acquisition, request restrictions, fallback coordination, accepted scans, and rollback. |
| `dom.js` | Site selectors, DOM health, fallback parsing, and room counts. |
| `storage.js` | Session validation, migration, persistence, tab records, and room generations. |
| `history.js` | Accepted history samples, gaps, and retained history limits. |
| `highs.js` | Session/ATH values, persistence, explicit file additions, clearing, labels, and pulses. |
| `lifecycle.js` | Session timers, pause/resume, Stop, absence checks, Reset, and scan scheduling. |
| `files.js` | Session file capture/validation/open/save and the chart-window options menu. |
| `replay.js` | Replay snapshots, clocks, stepping, controls, and live/replay transitions. |
| `charts.js` | Plotting, time spacing, drawing, gaps, and sample inspection. |
| `trends.js` | Trend comparisons, presets, automatic escalation, and rendering. |
| `panel.js` | Existing panel markup, event bindings, and main display rendering. |
| `compact.js` | Compact dashboard and freshness display. |
| `layout.js` | Row collapsing, geometry, dragging, resizing, and view changes. |
| `theme.js` | Theme tokens, bright/dark mode, and opacity. |
| `reports.js` | TXT and CSV exports. |
| `gif.js` | GIF drawing, encoding, and cancellation. |
| `session-health.js` | Per-room save status and failure presentation without owning scan state. |
| `session-library.js` | Recording snapshots, compatible-session updates, deduplication, limits and explicit deletion. |
| `backup.js` | Allowlisted preferences, validated ATH/library backups, merge plans and rollback. |
| `session-analysis.js` | Pure, typed real-time summary and comparison calculations. |
| `session-tools.js` | Accessible dialog, library actions, comparison charts and restore preview. |
| `data-io.js` | Bounded JSON file reading and downloads. |
| `startup.js` | Initialization, delayed startup, and room navigation. |
| `utils.js` | Room names, time formatting, tier markers, and logging. |

Feature modules import their function dependencies explicitly and read/write the private `runtime` object. Shared state remains centralized in this migration so scans, timers, storage, and rendering retain the same coordination. This is not yet a redesign into independently owned state stores.

Some function dependencies are circular. Feature modules only declare functions: do not perform work or read runtime values at module load time. `initializeRuntime()` runs after the modules are loaded and initializes fields and listeners in the original order. Keep changes to state ownership or startup order separate and covered by lifecycle tests.

## Migration safeguards

The existing tests still execute the generated userscript. `tests/helpers/instrument.cjs` adapts their test-only hooks to shared state and bundler formatting in memory; the assertions are unchanged, and no test API is included in the installed script. The helper also exposes the private tracker only inside the test copy; the installed script does not publish `window.ViewerTracker` or request `unsafeWindow`.

`tests/modular-build.test.cjs` compares all 196 extracted function syntax trees and the initialization sequence with fingerprints of 3.4.0 in `tests/fixtures/3.4.0-structure.json`. Only state access, declaration placement, and the release version are normalized. The original baseline is unchanged. Release 3.5.0 introduced five explicit function exceptions, each with behavior coverage: `performScanThenReturn` and `log` for commit/logging safety, `acquireDOMSnapshot` for tab restoration, `generateGifFromHistory` for its bundled encoder, and `updateHighControls` for the retention tooltip. The 3.6.0 beta additionally changes `saveSession`, `updateAcquisitionStatus`, `updateMiniFreshness`, `bindPanelOptions` and `updatePanelOptions` for save feedback and the tools entry, plus `createPanel` for the direct replay Keep in library button. Those changes have unit/browser coverage. The other 185 original functions and initialization remain locked to 3.4.0. New feature modules have behavioral tests rather than migration fingerprints. Metadata checks permit only removal of `unsafeWindow` and the external `@require`; the raw bundle is tested for absence of a page control API. The baseline commit is recorded in the fixture.

These fingerprints guard the unchanged parts of the migration. A later feature change must explicitly update or retire the relevant migration checks in its reviewed change, alongside behavior tests; do not regenerate the fingerprints merely to make a failure disappear.

The browser suite covers both engines, all 2,048 row-collapse combinations, themes, playback, files, ATH, pulses, acquisition, and downloads. Follow the actual-room release check in [TESTING.md](TESTING.md) before publishing a release.

## Session tools development

The new tools keep their own state instead of adding fields to the shared runtime. Analysis functions take an archive and return statistics without touching DOM, storage, tracking or replay. Their JSDoc types are checked with TypeScript (`npm run typecheck`), and their tests import the ES modules directly. `src/package.json` declares the source modules explicitly; existing CommonJS test helpers are unchanged.

Library keys use `tierscope:library:v1:<id>`, independent of temporary sessions and ATH. Keep is explicit; no Stop hook or automatic expiry is installed. Model folders are a view of archive room names and require no migration. Updates match room/session start and verify shared samples, retained extent and highs before choosing a fuller copy. New immutable snapshots are written before obsolete ones are removed; concurrent compatible versions read as one entry, selecting the fuller copy. Titles and initial addition times survive updates. Capacity checks include temporary snapshot bytes, and a failed operation removes only its own new entry. Backup restore validates everything and preflights capacity before writing. It retains original library and ATH snapshots until the complete restore succeeds; rollback compares values before undoing its own writes. If rollback also fails, the user sees an incomplete-restore warning.

Statistics hold each sample until the next accepted sample, exclude marked gaps and zero-duration intervals, and assign no duration after the last sample. Comparison alignment starts at the first retained sample, not an estimated earlier session start. Shared-duration mode clips weighted intervals at the shorter recording's span. Full-session highs stay separate from peaks within that range.
