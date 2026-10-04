# TierScope performance measurements

## 3.1.15 replay performance check

The browser fixture renders 120 Replay frames near the end of a 10,000-sample history, with all 11 rows visible. Five warm-up frames are excluded. The same fixture was run against the published 3.1.14 source and the revised renderer in the same headless Chromium environment.

| Renderer | Mean frame time | 95th percentile | Maximum |
| --- | ---: | ---: | ---: |
| 3.1.14 | 4.77 ms | 7.30 ms | 11.20 ms |
| 3.1.15 | 3.21 ms | 4.80 ms | 8.60 ms |

This run reduced mean frame-render time by about 33%. These are local fixture measurements, not a guarantee for every device or browser. They measure rendering work, not network acquisition or total browser memory.

The revised renderer groups dense samples into pixel columns while preserving their first, last, minimum and maximum values in order. Pauses keep separate line segments. Exact sample data remains available to tooltips and exports. Replay frames reference the frozen snapshot instead of allocating copies of every history array, and unchanged frames are not repainted unless the layout changes.

Run `npm run test:performance` to repeat the measurement. `TIERSCOPE_SOURCE` can select an older userscript file for comparison. Browser-launch overrides are described in TESTING.md.

## 3.6.0-beta.1 regression check

The same 120-frame fixture completed in headless Chromium with Node.js 22: mean **3.20 ms**, 95th percentile **4.10 ms**, maximum **7.20 ms**. This is a local rendering check, not a measured improvement over 3.5.0; no paired 3.5.0 run was performed. It does not measure library loading, backup operations or the new analysis dialog.

## 3.8.0 ownership check

A paired run during 3.8.0-beta.1 review used the same fixture on Node.js 22/headless Chromium in the same cloud workspace. Release 3.8.0 preserves that reviewed runtime code; the measurements were:

| Build | Mean frame time | 95th percentile | Maximum |
| --- | ---: | ---: | ---: |
| Main 3.7.0 | 2.54 ms | 3.80 ms | 5.00 ms |
| 3.8.0-beta.1 code | 5.02 ms | 5.70 ms | 8.90 ms |

The new immutable recording/display boundary adds rendering cost in this fixture. Both runs remained below the existing 50 ms replay tick interval on this host; this is not a guarantee for slower devices. Replay history is frozen once and reused across frames instead of copied per frame. Browser pacing/layout checks still verify the moving gap connector and exact sample values. This benchmark measures frame work only, not opening a recording, live acquisition, memory or library/backup operations. Installed-script performance checks should include a long recording on the user’s normal browser.

## 3.10.0 paired replay check

The same 10,000-sample, 120-frame fixture was run three times per build and CPU setting, alternating published 3.9.0 and 3.10.0-beta.1 in one Node.js 22/headless Chromium environment during beta review. The measured renderer is unchanged in the stable 3.10.0 release. Five warm-up frames remain excluded. The table reports the median of the three run means and the range of the three 95th-percentile results.

| CPU setting | Build | Median mean frame time | Run means | Run p95 range |
| --- | --- | ---: | ---: | ---: |
| Normal | 3.9.0 | 4.81 ms | 4.81–4.88 ms | 5.40–5.50 ms |
| Normal | 3.10.0-beta.1 | 2.45 ms | 2.34–2.88 ms | 3.40–3.70 ms |
| 4× CPU slowdown | 3.9.0 | 23.54 ms | 23.02–24.20 ms | 26.80–27.70 ms |
| 4× CPU slowdown | 3.10.0-beta.1 | 11.36 ms | 10.71–12.37 ms | 13.00–14.40 ms |

The median mean improves by about **49% normally** and **52% with simulated slowdown**. A sampled CPU profile identified chart plot reduction as the largest JavaScript hotspot. The renderer now creates private dense copies of frozen value/gap arrays once and reuses them for reduction. Recording snapshots and display models remain immutable; tooltips, keyboard inspection and exports still use their exact original samples. Tests compare cached and uncached plots across windows, seeks, repeated timestamps and gaps. Mutable live histories bypass the cache.

The tradeoff is one extra array per rendered immutable series, plus its gaps array, retained while that source array remains reachable. WeakMap keys allow the cache to be collected with the recording; it does not keep an archive of old replays. Actual heap cost is engine-dependent and was not measured here. This benchmark measures warm frame work only: it excludes opening/freezing a recording, live acquisition, library loading and backup operations. CPU throttling is a useful stress comparison, not a measurement on a specific slower device. Real-browser testing with long recordings remains useful.

Reproduce with `npm run test:performance`, optionally setting `TIERSCOPE_SOURCE=/path/to/3.9.0.user.js` and `TIERSCOPE_CPU_THROTTLE=4`. The original unthrottled fixture and sample order are unchanged.

## 3.12.0-beta.1 paired library measurements

Measured on 2026-10-04 with Node.js 22 and pinned Playwright Chromium in the same cloud workspace. Three runs per build and CPU setting alternated published 3.11.0 and this beta. Each dataset starts in a fresh page; seeding is excluded. Profiling was disabled for the paired timings. The table reports medians in milliseconds. [Raw results](docs/benchmarks/library-3.12.0-beta.1.json) include all runs, action timings, storage-read counts, byte sizes and heap observations.

Datasets contain valid synthetic histories, known gaps and several recordings per model: 12 × 300 samples (0.20 MiB), 500 × 500 samples (13.45 MiB), and 36 × 10,000 samples (18.64 MiB). Both large cases fit the existing library limits.

| Library | Action | 3.11.0 | Beta | 3.11.0, 4× CPU slowdown | Beta, 4× CPU slowdown |
| --- | --- | ---: | ---: | ---: | ---: |
| 12 recordings | First open | 17.6 | 15.1 | 64.5 | 57.0 |
| 12 recordings | Summary tab | 12.5 | 7.3 | 51.0 | 33.0 |
| 12 recordings | Compare tab | 7.4 | 4.2 | 30.8 | 16.6 |
| 12 recordings | Change comparison metric | 2.9 | 3.8 | 15.4 | 16.6 |
| 12 recordings | Refresh | 4.4 | 0.8 | 19.8 | 3.2 |
| 12 recordings | Create full backup | 9.7 | 7.1 | 35.5 | 28.7 |
| 500 recordings | First open | 239.8 | 130.5 | 872.0 | 599.0 |
| 500 recordings | Summary tab | 245.8 | 28.1 | 818.8 | 113.9 |
| 500 recordings | Compare tab | 240.5 | 27.8 | 839.3 | 125.9 |
| 500 recordings | Change comparison metric | 30.0 | 23.7 | 136.6 | 123.7 |
| 500 recordings | Refresh | 184.5 | 3.8 | 661.0 | 13.1 |
| 500 recordings | Create full backup | 411.3 | 325.7 | 1547.6 | 1575.7 |
| 36 long recordings | First open | 191.6 | 207.4 | 791.2 | 780.2 |
| 36 long recordings | Summary tab | 207.0 | 16.2 | 775.8 | 65.6 |
| 36 long recordings | Compare tab | 175.6 | 11.4 | 663.8 | 44.8 |
| 36 long recordings | Change comparison metric | 6.6 | 10.3 | 32.5 | 44.6 |
| 36 long recordings | Refresh | 150.6 | 1.2 | 624.6 | 6.7 |
| 36 long recordings | Create full backup | 458.3 | 436.8 | 1892.9 | 1992.8 |

The main gain is repeated browsing: Summary and Compare improve by about **88%** in the 500-record fixture and **92–94%** in the long-recording fixture without CPU slowdown. Refresh improves by about **98–99%**. Every refresh/tab read still retrieves every stored raw value; the optimization skips repeated UTF-8 sizing, JSON decoding and validation only when that value is unchanged. Search and folder navigation already avoided storage reads and remain small in the raw results.

The initial CPU profile identified library reading, temporary Blob construction and sample validation as major costs. The beta uses a per-opening reader with bounded cached records, counts UTF-8 bytes without temporary Blobs, and avoids repeatedly formatting the same recording choices. Validated primitive arrays are frozen without a second element-by-element traversal. No stored index, storage migration or new userscript permission is required.

### Costs and limits

- First opening still reads and validates all recordings. The 500-record fixture improves, but long-recording first-open timings are roughly unchanged under slowdown and slightly worse in the normal runs. Closing discards the cache, so reopening pays that cost again.
- Changing a metric already avoided a library read. Freezing reused arrays adds some analysis cost for long recordings: approximately 6.6 → 10.3 ms normally and 32.5 → 44.6 ms under slowdown in this fixture. No blanket speedup is claimed.
- Full backups still validate and serialize every recording. They can take about two seconds under simulated slowdown; this change does not make bulk export asynchronous. The small differences in full-backup timings do not establish a consistent improvement.
- The cache holds at most 500 raw records and 25 MiB of raw data, alongside validated arrays. This is an admission bound, not a total-heap bound. In the large fixtures, the beta's observed V8 heap while Library was open was about 2.0–2.8 MiB higher than 3.11.0. After close and forced collection the two builds were within about 0.03 MiB. These are engine-specific snapshots, not peak process memory or a general leak proof; they exclude native DOM and userscript-manager memory. Initial versus final heap also reflects V8 string representation/collection, so raw before/after deltas are not solely cache usage.
- Action times include JavaScript and a forced layout. They exclude browser paint/compositing, network acquisition and the userscript manager's native storage bridge: the fixture uses an in-memory GM-value store. Actions execute in a deterministic sequence in one task, not as a measurement of user input latency. Four-times CPU throttling is a stress comparison, not a particular slow device.

Reproduce with `npm run test:library-performance`. Set `TIERSCOPE_SOURCE` for a prior generated script, `TIERSCOPE_CPU_THROTTLE=4` for slowdown, and `TIERSCOPE_BENCH_ROUNDS=1` when alternating individual runs. `TIERSCOPE_PROFILE_PATH=/tmp/library-profile` optionally saves profiles; leave it unset for comparable timing runs. Existing replay, layout, exports and cross-tab correctness checks remain separate regression gates.
