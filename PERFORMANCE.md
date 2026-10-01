# TierScope 3.1.15 performance check

The browser fixture renders 120 Replay frames near the end of a 10,000-sample history, with all 11 rows visible. Five warm-up frames are excluded. The same fixture was run against the published 3.1.14 source and the revised renderer in the same headless Chromium environment.

| Renderer | Mean frame time | 95th percentile | Maximum |
| --- | ---: | ---: | ---: |
| 3.1.14 | 4.77 ms | 7.30 ms | 11.20 ms |
| 3.1.15 | 3.21 ms | 4.80 ms | 8.60 ms |

This run reduced mean frame-render time by about 33%. These are local fixture measurements, not a guarantee for every device or browser. They measure rendering work, not network acquisition or total browser memory.

The revised renderer groups dense samples into pixel columns while preserving their first, last, minimum and maximum values in order. Pauses keep separate line segments. Exact sample data remains available to tooltips and exports. Replay frames reference the frozen snapshot instead of allocating copies of every history array, and unchanged frames are not repainted unless the layout changes.

Run `npm run test:performance` to repeat the measurement. `TIERSCOPE_SOURCE` can select an older userscript file for comparison. Browser-launch overrides are described in TESTING.md.
