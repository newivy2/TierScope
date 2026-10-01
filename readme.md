# TierScope

A Tampermonkey userscript that tracks viewer tiers in a Chaturbate room and shows how the audience changes over time.

**Current release: 3.1.5 — September 30, 2026**

· [Report an issue](https://github.com/newivy2/TierScope/issues)

![TierScope panel](Tracking%20example%205.jpg)

## What’s new in 3.1.5

- **Stable panel height:** collapsing or restoring rows keeps the expanded panel at the same height while at least one row remains open. The remaining charts share the freed vertical space.
- **All-collapsed view:** when all 11 rows are collapsed, the chart area shrinks to the icon strip directly above Trends. Restoring any row brings back the original chart-area height.
- **Correct row measurements:** resizing accounts for text height and inherited line spacing, fixing the shrink-then-grow behavior in 3.1.4.

The customizable rows introduced in 3.1.4 remain available: click a row’s marker to collapse it, then click its boxed marker below the header to restore it. Your choices are remembered across rooms and refreshes.

## Features

- Seven viewer color tiers, anonymous counts, and an additional female/trans overlay.
- Eleven collapsible rows with remembered visibility preferences and taller charts for the rows left open.
- Sparklines, high values, and green highlights when a positive count reaches or returns to its recorded high.
- Trend comparisons against Last, 5m, 15m, 30m, 1h, or Start, with optional automatic window changes.
- Replay of a frozen history snapshot while live acquisition continues independently.
- 480 × 640 animated GIF downloads from Replay and text reports from live Controls.
- Per-room session storage with validation, a three-hour restore window, and clearly labeled saved snapshots after a refresh.
- A draggable, resizable panel with expanded and compact views.

## Installation and updates

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Follow Tampermonkey’s [userscript permission instructions](https://www.tampermonkey.net/faq.php?q=Q209) for your browser so installed scripts can run.
3. Open [tierscope.user.js](https://raw.githubusercontent.com/newivy2/TierScope/main/tierscope.user.js) and accept the Tampermonkey installation prompt. Alternatively, open the [GitHub source file](https://github.com/newivy2/TierScope/blob/main/tierscope.user.js) and select **Raw**.
4. Refresh a Chaturbate broadcast room. TierScope appears near the upper-right corner. A new session begins acquiring samples; a restored session keeps its saved pause state.

When updating, install the complete userscript, including its metadata header. The header loads the pinned GIF encoder dependency:

```javascript
// @require      https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js
```

Keep only one enabled copy of TierScope. After an update, refresh existing room tabs.

## Live controls

| Control | Action |
| --- | --- |
| Header / drag area | Move the panel. |
| Pink upper-left resize handle | Scale the panel. |
| **−**, **+**, or **Expand** | Switch between expanded and compact views. |
| **⏸ / ▶** in Controls or compact view | Pause or resume automatic acquisition and the tracking timer. An already-running scan may finish. |
| Compact-view timer controls | Adjust the interval from 30 to 300 seconds; presets are 30s, 60s, 2m, and 5m. |
| Row circle or icon | Collapse that row into the strip below the header. |
| Boxed icon in the collapsed-row strip | Restore its row to its original position. |
| Lamp slider | Adjust the main background and standard tier-row fills. |
| **Report** | Download a text report of the current session. |
| **Replay** | Open recorded history for the current room. |
| **Reset** | Confirm clearing this room’s history, counters, and elapsed time, then request one fresh scan. Keep the automatic-scan pause state and row visibility preferences. |

The default scan interval is **60 seconds**, counted after a scan finishes. Faster polling does not guarantee fresher data from the site.

The footer shows the sample source and age, for example `API • 12s`, `DOM • 4m`, or `Saved • 2h 5m`. Ages use seconds, minutes, hours, or days as appropriate. They are measured from the **sample’s timestamp**, not the session’s last save time or the countdown to the next scan. Hover over the status to see the recorded timestamp.

Reset requests a one-off scan even when automatic acquisition is paused. It does not turn automatic acquisition back on, and reloading afterward preserves that paused state.

### Collapsible rows

All **11 panel rows** can be collapsed independently: the seven color tiers, the female/trans overlay, With Tokens, Registered, and Anonymous. The overall room total remains in the header.

1. Click a row’s circle or icon to hide its full row.
2. Its marker appears as a small bordered button in the strip below the header.
3. Click that button to restore the row to its original position. The buttons also support keyboard focus and Enter/Space.

**Moderators (red) and Fan Club (green) start collapsed** when no valid visibility preference has been saved. After you customize the layout, your choices apply across rooms and full page refreshes. Restoring every row is also remembered. Reset clears session data, not these preferences.

With at least one row open, the chart area keeps its original height and gives the remaining charts more vertical space. Collapsing all 11 rows shrinks it to the strip above Trends; restoring any row returns it to its original height. The separate compact/expanded toggle and resize handle still work normally.

Hover over a collapsed marker to see its count, high, and whether the displayed sample is saved, live, or from Replay. Green high-value highlights also appear on collapsed markers.

Collapsing a row changes presentation only. All rows continue to be tracked and remain available in trend comparisons, reports, and GIF exports. In Replay, hiding or restoring rows preserves the selected position and Play/Pause state; it does not seek or restart playback.

### Trends and highlights

The trend display uses green for increases, red for decreases, and yellow for unchanged counts. It shows the numeric change when nonzero.

Choose **Last**, **5m**, **15m**, **30m**, **1h**, or **Start**. A manual selection turns automatic escalation off. **AUTO** toggles escalation through Last → 5m → 15m → 30m → 1h as tracking time grows. If a requested window extends before available history, the earliest retained sample is used.

A row’s green high-value highlight is separate from its trend indicator: it appears whenever a positive count equals the highest value in its retained history, including a return to that value after a dip.

### Background opacity

The lamp slider ranges from **30% to 100%**, starting at **95%**. Moving left makes the main panel fill, normal tier-row fills, and normal collapsed-marker fills more transparent.

It preserves green high-value highlights, borders, text, charts, and the fills of the summary rows, Controls, and other buttons. It does not apply opacity to the whole panel. The setting is retained during navigation in the current page session, but is not saved across a full reload.

## Replay

1. Acquire at least one sample, or restore a saved session containing history.
2. Click **Replay** in Controls. The header changes to `PLAYBACK`.
3. Use **Play / Pause**, the timeline slider, and **0.5× / 1× / 2×** to inspect the recording.
4. Click **Return to Live** to return to the latest accepted sample, or the saved snapshot if no fresh scan has succeeded since restoration.

At 1×, recorded time is compressed by 60×, with playback capped at 30 seconds. The speed selector adjusts that playback duration. The displayed timeline represents recorded elapsed time.

Counts, highs, green highlights, and sparklines follow the selected sample. A single saved sample can be inspected, but has no time span to play. Minimize is disabled during Replay.

Replay freezes the available history when opened. New scans continue updating the live session, but do not enter the open Replay. Return to Live and reopen Replay to include them. Replay Pause does not pause live scans; pause acquisition in live Controls first if needed.

## Download a GIF

Open **Replay**, then click **GIF**. Progress and **Cancel** appear within the existing Replay controls.

| Property | Output |
| --- | --- |
| Format | Animated `.gif`, looping indefinitely |
| Dimensions | **480 × 640** |
| Duration | **10 seconds per loop** |
| Frames | Up to **60**; one recorded sample produces a single-frame GIF |
| Tier rows | Seven color tiers plus the female/trans overlay |
| Summary rows | Total, With Tokens, Registered, Anonymous |
| Content | Historical lines, counts, and recorded elapsed time |
| Rendering | Fixed palette, bitmap lettering, two-pixel chart strokes |
| Encoder | `omggif` 1.0.10, loaded by the userscript manager |

Export uses the **entire frozen Replay range**, regardless of cursor position or playback speed. With more than 60 samples, it selects moments across the recorded time range and includes the first and last samples. Each chart shows history only through its selected sample and scales independently to its visible minimum and maximum.

The GIF always includes every tier and all four summary lines, including rows collapsed in the panel. It has a fixed dark background; the panel’s opacity slider and row heights do not affect its layout. Generation happens locally and does not require watching or recording ten seconds of playback. File size and generation time depend on the history and device; there is no fixed file-size guarantee.

Leaving Replay, changing rooms, resetting tracking, or unloading the page cancels an active export.

## Understanding the counts

The seven color tiers follow the site’s username classifications:

| Color | Classification |
| --- | --- |
| Red | Moderator |
| Green | Fan club member |
| Dark Purple | Tipped at least 1,000 tokens in the past two weeks |
| Light Purple | Tipped at least 250 tokens in the past two weeks |
| Dark Blue | Tipped at least 50 tokens in the past two weeks |
| Light Blue | Owns or has purchased tokens |
| Grey | No-token classification |

See Chaturbate’s [username-color documentation](https://support.chaturbate.com/hc/en-us/articles/360048893011-Username-colors). Users can limit the color they display, so the observed classification is not a measurement of their balance or future spending.

| Display | How TierScope calculates it |
| --- | --- |
| Header / GIF **Total** | Registered plus Anonymous. |
| 💎 / **With Tokens** | The six non-grey color tiers added together, including moderators and fan club members. This is a classification-based count, not a balance check. |
| 📊 / **Registered** | Named user records returned in the sample. |
| 👻 / **Anonymous** | The API’s anonymous count; during DOM fallback, an estimate of room total minus registered records, with a minimum of zero. |
| ♀⚧ / **Female/Trans** | An overlapping gender classification, not an eighth exclusive color tier. |

With API samples, owner records are excluded from the seven color tiers but remain in Registered. The displayed female/trans count can include a matching-gender owner; the report’s unique female/trans viewer totals exclude the room owner.

## Reports and saved sessions

**Report** downloads a `.txt` file containing the latest displayed session counts, high values and their recorded times, tier breakdowns, unique female/trans viewer totals, acquisition details, and storage/version information. Before the first fresh scan after restoration, it explicitly labels its counts as a saved snapshot. Collapsed rows are included. It is a summary, not a raw time-series export.

Sessions are stored per room through Tampermonkey’s storage API. A compatible record is restored if its last save was no more than **three hours ago**. This is a restore window, not a three-hour limit on an active session.

When restored history contains a sample, TierScope displays that sample until a new scan is accepted:

- The header reads **SAVED:** and the footer reads **Saved** with the sample’s age.
- Counts, highs, and charts come from saved history. They are not treated as a fresh acquisition.
- Trends wait for a fresh sample, avoiding false drops caused by an empty live user list after reload.
- The report labels the figures as **last saved stats**, includes the sample timestamp, and distinguishes them from live acquisition details.
- A failed scan leaves the saved display intact. The first accepted scan replaces it with fresh data and resumes normal trend comparisons.

Paused sessions remain paused after restoration. Resume acquisition with **▶** when ready.

History is capped at **10,000 accepted samples**. Older points are discarded when that limit is reached. Replay and GIF export use the retained history. Tier/summary highs are derived from that history; the room-total high is also tracked separately.

Corrupt or unsupported newer-schema records are preserved and protected from automatic overwrite. **Reset** explicitly clears the current room’s stored record. Deleting the script or its manager data can remove saved sessions.

## Acquisition and dependencies

- **Primary source:** same-origin `/api/getchatuserlist/`, with a 10-second timeout.
- **Validation:** malformed or duplicate records reject the sample. Additional count-change checks can reject suspicious changes. Rejected samples add no history point.
- **Fallback:** reads the Users tab if the API is unavailable or rejected, then attempts to return to Chat. Fallback attempts are spaced by at least 60 seconds, or the configured scan interval when longer.
- **Freshness:** the last accepted data stays visible through failed attempts. The site’s Users tab and TierScope can refresh at different times.
- **Storage format:** session schema version 1 under `tierscope:v1:<room>`. Compatible legacy records are validated before restoration. Row visibility preferences are stored separately under `tierscope:ui:collapsedRows:v1`.
- **GIF dependency:** [omggif](https://github.com/deanm/omggif), version 1.0.10, MIT licensed.

The script does not upload reports, GIFs, or tracking history to a TierScope server. It makes room-data requests to Chaturbate; the userscript manager loads the encoder from jsDelivr. Saved session data includes observed usernames used for session bookkeeping.

## Troubleshooting

**No panel or no scans**

Refresh the room, confirm TierScope and Tampermonkey are enabled, and check userscript permissions. Look for `[TierScope ...]` messages in the browser console. Automatic acquisition is intended for broadcast-room pages.

**Counts look frozen**

Check whether acquisition is paused and whether the last-sample age keeps increasing. The source may not have refreshed, or new samples may be failing validation. DOM fallback has its own cooldown. A failed scan does not mean zero viewers.

**The header says SAVED, or trends are waiting**

TierScope has restored a previous sample and has not yet accepted a fresh one. Check whether automatic acquisition is paused. The saved counts remain visible through failed scans; they are not new live measurements.

**Some rows are missing**

Look for their boxed markers below the header and click to restore them. Moderators and Fan Club are collapsed by default. Your chosen layout persists across rooms and reloads, and Reset does not clear it.

**The panel shrank after collapsing rows**

In 3.1.5, this is expected only when all 11 rows are collapsed. Restoring any row brings back the original chart-area height. If it changes size while a row remains open, confirm that only version 3.1.5 is enabled, refresh the tab, and report the browser and steps that reproduce it.

**Replay is unavailable, or Play is disabled**

Replay needs a recorded sample for this room. Play needs a nonzero recorded time span. Check the `PLAYBACK` header if you expected current live counts.

**No GIF button**

Click **Replay** first. GIF export is deliberately absent from live Controls.

**“GIF encoder missing”**

Reinstall the complete script with its `@require` header and refresh the room. Check whether the userscript manager can load the pinned jsDelivr dependency.

**A download does not appear**

Check the browser’s downloads list and any blocked-download notification. Allow the requested download for the room and retry.

**Storage is “Protected / read-only”**

The saved record failed validation or uses an unsupported schema. It has not been overwritten. Use Reset only if you want to discard that room’s saved record.

## Version history

| Version | Notes |
| --- | --- |
| **3.1.5** | Fixed panel-height redistribution when collapsing rows, including inherited line-spacing cases. Shrink only when all 11 rows are collapsed. |
| 3.1.4 | Added collapsible tier and summary rows, a restore strip, remembered visibility preferences, and taller remaining charts. Moderators and Fan Club start collapsed. |
| 3.1.3 | Fixed pause/reset persistence and saved-count restoration; labeled saved snapshots; added compact sample ages and 480 × 640 GIFs. |
| 3.1.2 | Background-only opacity slider and compact footer; Replay-only 640 × 400 GIF export with tier and totals line charts. |
| 3.1.1.3 | Trend display uses green, red, and yellow backgrounds instead of arrows. |
| 3.1.1.2 | High-value highlights also appear in Replay. |
| 3.1.1.1 | Green row highlights at positive highs, including returns to a previous high. |
| 3.1.1.0 | Replay with independent live acquisition; unique-viewer count removed from the header and report. |
| 3.1.0 | API-first acquisition, DOM fallback, storage schema v1, and acquisition status. |
| 3.0.7 | Trend comparison auto-escalation. |
| 3.0.4 | Last, 5m, 15m, 30m, 1h, and Start comparisons. |
| 3.0.0 | Spike detector removed; trends compare accepted samples. |
| 2.9.9.3 | Visual improvements. |
| 2.9.9.2 | Window resize fix. |
| 2.9.9.1 | Persistent storage, Controls, Reset, and unique-viewer tracking. |
| 2.9.8.2 | Minor fix. |
| 2.9.8.1 | Anonymous canvas adjustment. |
| 2.9.8.0 | Broadcaster detection, tracking keys, and CSS. |
| 2.9.7.3 | Base reference. |

## Thanks

- **Andrew Weed** — API acquisition and Replay mode.
- **checksnmale** — testing and feedback.
- **Dean McNamee** — the omggif encoder.

## License

MIT. See [LICENSE](https://github.com/newivy2/TierScope/blob/main/LICENSE).

For personal use while broadcasting or watching a room. Not affiliated with Chaturbate.
