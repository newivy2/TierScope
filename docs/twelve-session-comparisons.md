# Twelve-session comparisons — 3.25.0 review beta

Compare up to **12 sessions** in Library, including through **Compare with previous** on the live card or Model History. These shortcuts choose the selected/current session and up to eleven earlier sessions from the same model. Each model card also has **Compare**, which selects that model’s newest twelve stored sessions independently of browse filters and opens the chart immediately. It is disabled with an explanation when fewer than two stored sessions exist. Manual comparisons can mix models.

The six newest selected sessions keep the existing colors and full opacity. The newest is solid pink; the others are dashed. Sessions seven through twelve use dashed lines at **85%, 75%, 65%, 55%, 45% and 35% opacity**, respectively. Their legend swatches match, while text and checkboxes stay fully readable. Styling follows recording dates, including after changing slots or hiding lines.

Elapsed-time and 24h time-of-day comparisons retain shared inspection, zoom, pinning, individual visibility, gap handling and complete statistics. The chart uses the existing drawing reduction; all accepted samples remain available for inspection and statistics.

Hover over the **Female / trans** tier, or its collapsed row button, to see separate female and trans counts from the displayed live sample. These use the genders reported by the existing acquisition paths and do not change the combined tier. Saved sessions and Replay retain only the combined count; their tooltip explains that the separate breakdown is unavailable.

For review, try six and twelve sessions in both themes, change slot order, hide a line, inspect a gap and switch the time axis. Hover over the expanded and collapsed Female / trans row after a live scan, then check a saved Replay.

## Performance check

Chromium, 4× CPU throttling, three fresh-page rounds per case. Values below are medians; these synthetic measurements are observations, not device guarantees. Cursor inspection reuses the chart bitmap.

| Sessions / samples each | Metric change | Full-range redraw | Cursor inspection p95 |
| --- | --- | --- | --- |
| 6 / 10,000 | 320 ms | 258 ms | 3.8 ms |
| 12 / 10,000 | 600 ms | 558 ms | 5.2 ms |

Twelve sessions increase the cost of metric changes and redraws. Zoom and cursor inspection keep their existing drawing reduction and bitmap cache; inspection still uses full-resolution samples. [Raw measurements](benchmarks/compare-3.25.0-beta.1.json).
