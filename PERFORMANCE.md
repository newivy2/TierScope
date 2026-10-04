# TierScope 3.1.15 performance check

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

## 3.10.0-beta.1 paired replay check

The same 10,000-sample, 120-frame fixture was run three times per build and CPU setting, alternating published 3.9.0 and the beta in one Node.js 22/headless Chromium environment. Five warm-up frames remain excluded. The table reports the median of the three run means and the range of the three 95th-percentile results.

| CPU setting | Build | Median mean frame time | Run means | Run p95 range |
| --- | --- | ---: | ---: | ---: |
| Normal | 3.9.0 | 4.81 ms | 4.81–4.88 ms | 5.40–5.50 ms |
| Normal | 3.10.0-beta.1 | 2.45 ms | 2.34–2.88 ms | 3.40–3.70 ms |
| 4× CPU slowdown | 3.9.0 | 23.54 ms | 23.02–24.20 ms | 26.80–27.70 ms |
| 4× CPU slowdown | 3.10.0-beta.1 | 11.36 ms | 10.71–12.37 ms | 13.00–14.40 ms |

The median mean improves by about **49% normally** and **52% with simulated slowdown**. A sampled CPU profile identified chart plot reduction as the largest JavaScript hotspot. The renderer now creates private dense copies of frozen value/gap arrays once and reuses them for reduction. Recording snapshots and display models remain immutable; tooltips, keyboard inspection and exports still use their exact original samples. Tests compare cached and uncached plots across windows, seeks, repeated timestamps and gaps. Mutable live histories bypass the cache.

The tradeoff is one extra array per rendered immutable series, plus its gaps array, retained while that source array remains reachable. WeakMap keys allow the cache to be collected with the recording; it does not keep an archive of old replays. Actual heap cost is engine-dependent and was not measured here. This benchmark measures warm frame work only: it excludes opening/freezing a recording, live acquisition, library loading and backup operations. CPU throttling is a useful stress comparison, not a measurement on a specific slower device. Real-browser testing with long recordings remains useful.

Reproduce with `npm run test:performance`, optionally setting `TIERSCOPE_SOURCE=/path/to/3.9.0.user.js` and `TIERSCOPE_CPU_THROTTLE=4`. The original unthrottled fixture and sample order are unchanged.
