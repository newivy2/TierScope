# TierScope regression tests

The tests execute the userscript in controlled fixtures. They do not connect to Chaturbate, require an account, or add code to the installed script. Test-only hooks are injected into an in-memory copy of the source.

## Run locally

Use Node.js 22 and npm. From this directory:

```sh
npm ci
npx playwright install chromium
npm test
```

On a Linux machine missing browser libraries, use `npx playwright install --with-deps chromium` instead. Dependencies are pinned in `package-lock.json`.

Individual commands:

```sh
npm run test:unit
npm run test:browser
```

`TIERSCOPE_CHROMIUM_PATH` can select an already-installed Chromium executable. `TIERSCOPE_CHROMIUM_ARGS`, if needed, is a JSON array of launch arguments. Normal installations need neither setting. Browser tests remove temporary downloads and screenshots on completion.

## Coverage

| Test | What it verifies |
| --- | --- |
| Session clock | Session start survives repeated pause/resume and reload; active time excludes pauses; reported high offsets use wall time. |
| Session highs | Values and matching timestamps survive the 10,000-sample rollover, equal highs, lower samples, and reload. Saved highlights use session highs; Replay uses highs through the selected frame. |
| Storage migration | Legacy values/times are reconstructed from the same retained sample; corrupt or unsupported records are skipped and preserved without blocking healthy siblings; repaired records become eligible without Reset; Reset can still clear records explicitly. |
| Multiple tabs | Each tab writes a different record; stale saves do not displace newer samples; Reset invalidates old tabs; expired writers rotate record IDs; valid expired old-epoch orphans are cleaned up while corrupt or unsupported records are retained. Cleanup failures do not block a healthy sibling. |
| Acquisition | Bad totals, malformed records and duplicate usernames are rejected. Network failures retain saved data. Processing errors restore history and highs. Late responses after navigation or Reset cannot commit. |
| DOM fallback | A real browser fixture verifies Users/Chat clicks, accepted counts, fallback cooldown, and independent Replay. |
| Presentation | Saved counts stay non-live until acceptance. Sample-age formatting covers unit boundaries. |
| Layout | All 2,048 collapse combinations are checked at normal and 1.5 inherited line heights, including row overflow and restoration from all-collapsed. |
| Compact dashboard | Chart pixels and 15-minute range, metric persistence across reload, blank saved deltas, live deltas, source/age, settings controls without height growth, control bounds, a visible close button, Escape after focus leaves the panel, broadcast-room refresh at a non-default scale, and page-based startup across room and directory URLs with obsolete view preferences ignored. |
| Controls | Drag/resize/reload, 100% size reset, edge clamping on expansion, centered buttons, and CSV download. |
| Replay | Previous/next endpoints, pause-on-step, duplicate timestamps, and the selected frame surviving collapse and live scans. |
| CSV | Column order, every retained sample, UTC timestamps, computed totals, and formula-safe text. |
| GIF | Actual omggif output is decoded and compared pixel-for-pixel with the renderer. Checks all 12 rows, drawing bounds, 480×640 size, 60-frame cap, ten-second duration, flat/zero/large data, 10,000 samples, cancellation and retry. |

## GitHub automation

Copy this package's contents into the repository root, including `.github/workflows/tests.yml`. The workflow runs `npm test` on pushes and pull requests. It has read-only repository permissions. Adding these files does not publish or change the live userscript by itself.

## Before a release

Run the automated suite, then check the installed userscript in an actual room: one accepted API sample, pause/resume, refresh, Replay, and the downloads. Check another room and the browsers/userscript managers you support. Fixtures cannot guarantee that a changed site DOM or a userscript manager's storage implementation behaves identically.

The browser suite currently targets Chromium. Firefox and other browser engines have not been certified by these tests.
