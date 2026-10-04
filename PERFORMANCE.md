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

## 3.12.0 paired library measurements

Measured on 2026-10-04 with Node.js 22 and pinned Playwright Chromium in the same cloud workspace. Three runs per build and CPU setting alternated published 3.11.0 and 3.12.0-beta.1 during review. The measured runtime code is unchanged in stable 3.12.0. Each dataset starts in a fresh page; seeding is excluded. Profiling was disabled for the paired timings. The table reports medians in milliseconds. [Raw results](docs/benchmarks/library-3.12.0-beta.1.json) include all runs, action timings, storage-read counts, byte sizes and heap observations.

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

## 3.13.0 model history costs

Measured during 3.13.0-beta.1 review on 2026-10-04 with the same pinned Node.js/Chromium environment, three fresh pages per dataset and CPU setting. Stable 3.13.0 preserves the measured runtime code. Every recording belongs to one model to exercise the whole dataset in a single overview. The cases remain 12 × 300 samples (0.20 MiB), 500 × 500 (13.45 MiB) and 36 × 10,000 (18.64 MiB). [Raw results](docs/benchmarks/model-history-3.13.0-beta.1.json) include every run, storage reads and heap observations. These are costs of the new feature, not a speedup comparison with an older release.

| Model folder | Action | Median, normal | Median, 4× CPU slowdown |
| --- | --- | ---: | ---: |
| 12 recordings | First overview | 13.3 ms | 58.2 ms |
| 12 recordings | Revisit overview | 3.2 ms | 24.5 ms |
| 500 recordings | First overview | 66.1 ms | 319.2 ms |
| 500 recordings | New metric | 37.8 ms | 176.3 ms |
| 500 recordings | Cached metric | 19.6 ms | 99.3 ms |
| 500 recordings | Latest 10 | 4.4 ms | 26.5 ms |
| 500 recordings | Refresh | 19.5 ms | 111.9 ms |
| 500 recordings | Revisit overview | 19.8 ms | 113.6 ms |
| 36 long recordings | First overview | 71.8 ms | 278.1 ms |
| 36 long recordings | New metric | 32.4 ms | 172.0 ms |
| 36 long recordings | Cached metric | 7.7 ms | 43.2 ms |
| 36 long recordings | Refresh | 7.1 ms | 40.6 ms |

Calculations run only when opening a model overview; folder browsing does not compute them. A private WeakMap reuses compact summaries of immutable archives, without copying sample arrays. It is cleared on Library close. New metrics still scan retained samples; changed archives are recomputed. The table renders at most 50 rows initially, while the chart and selector represent all selected recordings. The existing Library initial read remains a separate cost (about 131 ms for 500 recordings and 189 ms for long recordings here; approximately 624/878 ms under slowdown).

Large overviews can still pause the UI briefly, especially on slower devices. Selecting an already calculated metric or reducing the view to the latest 10 avoids most calculation work, but building hundreds of selector entries also has a cost. These measurements include synchronous JavaScript and forced layout, excluding paint, native userscript storage, website workload and user input scheduling. Four-times slowdown is a stress simulation, not a named device. Heap snapshots in the raw data are observations after forced collection, not peak process memory or a leak proof.

Reproduce with `TIERSCOPE_BENCH_HISTORY=1 npm run test:library-performance`, optionally adding `TIERSCOPE_CPU_THROTTLE=4`. Leave history mode unset to retain the existing multi-model Library/backup benchmark.

## 3.14.0-beta.1 interactive comparison costs

Measured on 2026-10-04 in the same pinned Node.js 22/Chromium cloud environment. Three fresh pages per dataset and CPU setting compare six recordings, using the existing small (12 × 300), many (500 × 500) and long (36 × 10,000) datasets. The table reports median action times, or the median of three mean cursor-update times. Each cursor run includes 120 updates after 20 warmups. [Raw results](docs/benchmarks/compare-3.14.0-beta.1.json) include the generated-script hash, every run, storage reads and heap snapshots. These are costs of the new feature, not a comparison with an older release.

| Library / six selected recordings | Action | Normal | 4× CPU slowdown |
| --- | --- | ---: | ---: |
| 12 recordings / 300 samples each | Change metric | 13.1 ms | 62.4 ms |
| 12 recordings / 300 samples each | Zoom in | 2.5 ms | 12.0 ms |
| 12 recordings / 300 samples each | Cursor update | 0.37 ms | 1.93 ms |
| 500 recordings / 500 samples each | Change metric | 90.5 ms | 518.9 ms |
| 500 recordings / 500 samples each | Zoom in | 3.5 ms | 19.8 ms |
| 500 recordings / 500 samples each | Cursor update | 0.40 ms | 1.73 ms |
| 36 recordings / 10,000 samples each | Change metric | 72.9 ms | 342.7 ms |
| 36 recordings / 10,000 samples each | Zoom in | 33.4 ms | 169.1 ms |
| 36 recordings / 10,000 samples each | Restore full range | 51.9 ms | 244.1 ms |
| 36 recordings / 10,000 samples each | Cursor update | 0.39 ms | 2.18 ms |

Cursor p95 values were 0.5–0.6 ms normally and 2.4–3.8 ms under slowdown across these runs. Inspection uses binary search against original samples and draws over a cached chart bitmap; moving the cursor does not rescan or redraw every series. Full chart redraws reduce each pixel column to its ordered first/last and extreme samples, flushing at gaps. Exact original values remain available to inspection and statistics. The bitmap is discarded on a view change or Library close.

Remaining costs are visible in large cases. Metric changes rebuild analysis and the source selectors; six unfiltered selectors can contain roughly 3,000 options in a 500-record library. Model/date filters reduce the choices. Zoom and visibility changes rebuild the chart, so long recordings can still pause briefly on slower devices. First Library opening remains separate work: 136.8/678.2 ms for 500 recordings and 188.2/916.9 ms for the long-recording dataset at normal/4× CPU settings. Bulk import/export validation and serialization remain synchronous.

The fixture includes JavaScript, canvas drawing commands and forced layout, but excludes paint/compositing, userscript-manager storage overhead, website activity and input scheduling. CPU slowdown is a stress simulation, not a particular device. Heap snapshots exclude native canvas/DOM memory and are not peak-memory measurements or a leak proof. No machine-dependent timing assertions are added to CI.

Reproduce with `TIERSCOPE_BENCH_COMPARE=1 npm run test:library-performance`, optionally setting `TIERSCOPE_CPU_THROTTLE=4`. Use one benchmark mode at a time.

## 3.15.0-beta.1 Library continuity

Stable 3.15.0 preserves the measured beta behavior; only the displayed release version changes. Paired measurements on 2026-10-04 compare published 3.14.0 with 3.15.0-beta.1 using the same Node.js 22/Playwright Chromium environment and the comparison fixture. Three fresh-page runs per build and CPU setting alternate build order. Existing datasets, six recordings, 20 cursor warmups and 120 measured cursor updates are unchanged. The fixture now also measures hiding/showing one line and applying a threshold after restoring the full range. Values below are medians in milliseconds. [Raw results](docs/benchmarks/library-continuity-3.15.0-beta.1.json) include both script hashes, all runs, storage reads and heap snapshots.

| Dataset / action | 3.14.0 normal | Beta normal | 3.14.0 at 4× slowdown | Beta at 4× slowdown |
| --- | ---: | ---: | ---: | ---: |
| 12 × 300 / change metric | 12.5 | 8.3 | 63.1 | 44.7 |
| 500 × 500 / change metric | 107.4 | 10.7 | 419.1 | 48.3 |
| 500 × 500 / apply threshold | 79.2 | 2.1 | 422.0 | 11.2 |
| 36 × 10,000 / change metric | 67.9 | 70.1 | 381.8 | 278.5 |
| 36 × 10,000 / apply threshold | 65.8 | 6.3 | 324.5 | 38.3 |
| 36 × 10,000 / hide line | 39.7 | 37.9 | 213.2 | 197.3 |
| 36 × 10,000 / show line | 52.4 | 50.0 | 247.1 | 234.5 |

The main improvement comes from keeping the recording selectors and chart controls attached when changing metrics or thresholds. Threshold updates skip chart work entirely. Selection checkboxes update selection controls without rebuilding recording rows; browser tests check node identity and preserve open note editors. Reduced chart plots are retained for one series/window/width combination, saving reduction work during visibility/theme redraws. Drawing the paths still costs time.

This does not remove first-open storage validation or every expensive redraw. For 500 recordings, first opening measured 151.1 → 143.9 ms normally and 614.4 → 653.6 ms under slowdown; for long recordings, 189.8 → 204.7 ms normally and 942.0 → 959.7 ms under slowdown. No consistent first-open improvement is claimed. Long metric changes and line redraws still take hundreds of milliseconds under slowdown. Bulk import/export validation and serialization are unchanged. Draft retention adds only note text and small identity/display metadata, not recording arrays; chart interaction and plot caches are released on Library close.

These are synthetic timings with in-memory storage, excluding userscript-manager storage overhead, actual site activity, paint/compositing and input scheduling. CPU slowdown is not a device guarantee. GC-assisted heap snapshots are not peak process memory or a leak proof. Reproduce using `TIERSCOPE_BENCH_COMPARE=1`, `TIERSCOPE_BENCH_ROUNDS=1` and `TIERSCOPE_SOURCE` with the same fixture for each build, alternating order three times at normal and `TIERSCOPE_CPU_THROTTLE=4` settings. There is no machine-dependent timing gate.
