# Building TierScope

TierScope is developed as ES modules in `src/`. The repository-root `tierscope.user.js` is the generated, installable artifact. Tampermonkey still installs one script at the same path; there are no runtime module imports or extra installation steps. The existing pinned omggif userscript dependency is unchanged.

## Build and test

Use Node.js 22:

```sh
npm ci
npm run build
npx playwright install chromium firefox
npm test
```

Edit `src/`, run `npm run build`, and commit both the source and generated script. The build uses pinned esbuild, preserves readable function names, and does not minify the output. It produces no timestamps or machine-specific paths, so identical inputs produce identical output.

`npm run build:check` rebuilds in memory and fails if the committed script differs. `npm test` runs this check before the unit and browser suites, including on GitHub. It never silently repairs a stale script. A source edit must therefore be built before its tests can pass.

Set the release version in `package.json` and update `package-lock.json` with `npm install --package-lock-only`. The build supplies that version to both the Tampermonkey metadata and internal session/report version. Edit matches, permissions, or the existing external dependency only in `src/userscript-header.txt`.

## Source map

| File | Responsibility |
| --- | --- |
| `main.js` | Start one tracker and publish the existing `ViewerTracker` API. |
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
| `startup.js` | Initialization, delayed startup, and room navigation. |
| `utils.js` | Room names, time formatting, tier markers, and logging. |

Feature modules import their function dependencies explicitly and read/write the private `runtime` object. Shared state remains centralized in this migration so scans, timers, storage, and rendering retain the same coordination. This is not yet a redesign into independently owned state stores.

Some function dependencies are circular. Feature modules only declare functions: do not perform work or read runtime values at module load time. `initializeRuntime()` runs after the modules are loaded and initializes fields and listeners in the original order. Keep changes to state ownership or startup order separate and covered by lifecycle tests.

## Migration safeguards

The existing tests still execute the generated userscript. `tests/helpers/instrument.cjs` adapts their test-only hooks to shared state and bundler formatting in memory; the assertions are unchanged, and no test API is included in the installed script.

`tests/modular-build.test.cjs` compares all 196 extracted function syntax trees and the initialization sequence with fingerprints of 3.4.0 in `tests/fixtures/3.4.0-structure.json`. Only state access, declaration placement, and the release version are normalized. Markup, CSS, user-facing strings, public API, storage keys, and userscript permissions are covered. The baseline commit is recorded in that fixture.

These fingerprints deliberately lock this beta to 3.4.0 behavior. A later feature change must explicitly update or retire the relevant migration checks in its reviewed change, alongside behavior tests; do not regenerate the fingerprints merely to make a failure disappear.

The browser suite covers both engines, all 2,048 row-collapse combinations, themes, playback, files, ATH, pulses, acquisition, and downloads. Follow the actual-room release check in [TESTING.md](TESTING.md) before promoting the beta.
