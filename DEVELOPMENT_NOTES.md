# TierScope — Usage and development notes

Detailed reference for **version 3.1.14**. For a quick introduction and installation link, see the [README](readme.md).

## Contents

- [Installation and updates](#installation-and-updates)
- [Live controls and customization](#live-controls)
- [Replay](#replay)
- [GIF export](#download-a-gif)
- [Understanding the counts](#understanding-the-counts)
- [TXT and CSV exports](#txt-and-csv-exports)
- [Saved sessions](#saved-sessions)
- [Development and testing](#development-and-testing)
- [Acquisition and dependencies](#acquisition-and-dependencies)
- [Troubleshooting](#troubleshooting)
- [Version history](#version-history)

## Installation and updates

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Follow Tampermonkey’s [userscript permission instructions](https://www.tampermonkey.net/faq.php?q=Q209) for your browser so installed scripts can run.
3. Open [tierscope.user.js](https://raw.githubusercontent.com/newivy2/TierScope/main/tierscope.user.js) and accept the Tampermonkey installation prompt. Alternatively, open the [GitHub source file](https://github.com/newivy2/TierScope/blob/main/tierscope.user.js) and select **Raw**.
4. Refresh a Chaturbate broadcast room. TierScope appears at its saved position, or near the upper-right corner if no layout has been saved. A new session begins acquiring samples; a restored session keeps its saved pause state.

When updating, install the complete userscript, including its metadata header. The header loads the pinned GIF encoder dependency:

```javascript
// @require      https://cdn.jsdelivr.net/npm/omggif@1.0.10/omggif.js
```

The script also requests `GM_listValues` to find the separate saved records for each room.

Keep only one enabled copy of TierScope. After an update, refresh existing room tabs.

## Live controls

| Control | Action |
| --- | --- |
| Header / drag area | Move the panel; save its position when you release it. |
| Pink upper-left resize handle | Scale the panel; save its size when you release it. |
| **100%** in the header | Restore standard scale while keeping row visibility and session data. |
| **−**, **+**, or **Expand** | Switch between expanded and compact views. |
| **⏸ / ▶** in Controls or compact view | Pause or resume automatic acquisition and the tracking timer. An already-running scan may finish. |
| Compact-view timer controls | Adjust the interval from 30 to 300 seconds; presets are 30s, 60s, 2m, and 5m. |
| Row circle or icon | Collapse that row into the strip below the header. |
| Boxed icon in the collapsed-row strip | Restore its row to its original position. |
| Lamp slider | Adjust the main background and standard tier-row fills. |
| **TXT** | Download a text summary of the current session. |
| **CSV** | Download every retained history sample, including collapsed tiers. |
| **Replay** | Open recorded history for the current room. |
| **Reset** | Confirm clearing this room’s history, counters, and elapsed time, then request one fresh scan. Keep the automatic-scan pause state and layout preferences. |

The default scan interval is **60 seconds**, counted after a scan finishes. Faster polling does not guarantee fresher data from the site.

The footer shows the sample source and age, for example `API • 12s`, `DOM • 4m`, or `Saved • 2h 5m`. Ages use seconds, minutes, hours, or days as appropriate. They are measured from the **sample’s timestamp**, not the session’s last save time or the countdown to the next scan. Hover over the status to see the recorded timestamp.

Reset requests a one-off scan even when automatic acquisition is paused. It does not turn automatic acquisition back on, and reloading afterward preserves that paused state.

### Compact dashboard

The minimized panel retains its 140-pixel content width. Click the chart label to cycle **Room total → 💎 (With Tokens) → 📊 (Registered)**. This preference is saved across rooms and refreshes, independently of collapsed rows.

The chart shows the last **15 recorded minutes**, ending at the latest retained sample. Horizontal positions follow sample timestamps; vertical scale fits the visible values. A single sample is a dot, and a constant series is a horizontal line. Hover over the chart for its value range, sample count, and end time. The adjacent H value is the session high, not merely the high within the visible window.

The header shows room total and its change; the two rows below the chart show With Tokens and Registered counts and changes. Changes use the main panel's selected comparison window. Restored snapshots leave changes blank until a fresh sample is accepted; a comparison also needs sufficient history. Hover over counts for exact values and percentages, changes for their comparison window, and the header for room name and room high.

The footer shows sample source and age, or Paused and age. Hover for the source, timestamp, and scan timing. The clock button opens scan-interval controls over the chart without increasing panel height. Click the × close button, click the clock again, or press Escape to close them. Escape works even after focus moves outside the panel. Pause/Resume and Expand remain directly accessible.

### Position and size

Drag the header to move the panel, or drag the pink upper-left handle to resize it. Position and scale are saved when you release the mouse and restored after a refresh or room change. The panel starts expanded in broadcast rooms and minimized on other pages, such as Followed, Featured, and cam directories. Compact/expanded state is not remembered; the view preference saved by 3.1.11 is ignored. Position and scale still restore normally.

Click **100%** in the header to return to standard scale. Use it in different tabs to give their panels the same scale. It keeps your collapsed-row choices and session data; it does not reset tracking or return the panel to its original position.

Saved layout preferences are shared across rooms and tabs. A newly opened or refreshed tab uses the latest saved position and scale; panels already open in other tabs do not move or resize automatically.

Restoration, window resizing, and expansion from compact view adjust the position to keep the panel within the available viewport. If the chosen scale is larger than the viewport can accommodate, the panel is anchored at the top or left edge so the header remains reachable. Use **100%** or the resize handle to reduce it.

### Collapsible rows

All **11 panel rows** can be collapsed independently. The overall room total remains in the header.

1. Click a row’s circle or icon to hide its full row.
2. Its marker appears as a small bordered button in the strip below the header.
3. Click that button to restore the row to its original position. The buttons also support keyboard focus and Enter/Space.

**Moderators (red) and Fan Club (green) start collapsed** when no valid visibility preference has been saved. After you customize the layout, your choices apply across rooms and full page refreshes. Restoring every row is also remembered. Reset clears session data, not these preferences.

With at least one row open, the chart area keeps its original height and gives the remaining charts more vertical space. Collapsing all 11 rows shrinks it to the strip above Trends; restoring any row returns it to its original height. The separate compact/expanded toggle and resize handle still work normally.

Hover over a collapsed marker to see its count, high, and whether the displayed sample is saved, live, or from Replay. Green high-value highlights also appear on collapsed markers.

Collapsing a row changes presentation only. All rows continue to be tracked and remain available in trend comparisons, TXT reports, CSV exports, and GIFs. In Replay, hiding or restoring rows preserves the selected position and Play/Pause state; it does not seek or restart playback.

### Trends and highlights

The trend display uses green for increases, red for decreases, and yellow for unchanged counts. It shows the numeric change when nonzero.

Choose **Last**, **5m**, **15m**, **30m**, **1h**, or **Start**. A manual selection turns automatic escalation off. **AUTO** toggles escalation through Last → 5m → 15m → 30m → 1h as tracking time grows. If a requested window extends before available history, the earliest retained sample is used.

A row’s green high-value highlight is separate from its trend indicator: it appears whenever a positive count equals the session high, including a return to that value after a dip. In Replay, it compares against the retained history through the selected sample.

### High-value pulses

An accepted live sample triggers two gentle pulses when a row sets a new positive session high or returns to its high after a dip. The visible expanded row or collapsed marker pulses for about 1.7 seconds, then retains its steady green highlight. Text, counts, chart lines, and icons do not fade.

A count staying at its high does not restart the cue. Collapsing or restoring a row cancels its current pulse and never starts another. Entering Replay, minimizing the panel, resetting, or changing rooms cancels active pulses. Saved snapshots and Replay never pulse, and events while the compact panel or Replay is open are not queued for later. Zero counts do not trigger a pulse.

Reduced-motion preferences disable the animation while preserving the steady highlight. Browsers without the animation API also retain the steady highlight.

### Background opacity

The lamp slider ranges from **30% to 100%**, starting at **95%**. Moving left makes the main panel fill, normal tier-row fills, and normal collapsed-marker fills more transparent.

It preserves green high-value highlights, borders, text, charts, and the fills of the summary rows, Controls, and other buttons. It does not apply opacity to the whole panel. The setting is retained during navigation in the current page session, but is not saved across a full reload.

## Replay

Replay displays recorded audience samples. It does not record or play broadcast video or chat.

1. Acquire at least one sample, or restore a saved session containing history.
2. Click **Replay** in Controls. The header changes to `PLAYBACK`.
3. Use **Play / Pause**, the timeline slider, and **0.5× / 1× / 2×** to inspect the recording.
4. Use the previous/next sample buttons beside the timeline to step through individual saved samples.
5. Click **Return to Live** to return to the latest accepted sample, or the saved snapshot if no fresh scan has succeeded since restoration.

At 1×, recorded time is compressed by 60×, with playback capped at 30 seconds. The speed selector adjusts that playback duration. The displayed timeline represents recorded elapsed time.

Each step pauses Replay and moves to the previous or next recorded sample. Step buttons stop at the first and last samples; samples with identical timestamps can still be inspected separately. Hover over the time display to see the selected sample number. With only one sample, both step buttons are disabled.

Counts, highs, green highlights, and sparklines follow the selected sample. A single saved sample can be inspected, but has no time span to play. Minimize is disabled during Replay.

Replay freezes the available history when opened. New scans continue updating the live session, but do not enter the open Replay. Return to Live and reopen Replay to include them. Replay Pause does not pause live scans; pause acquisition in live Controls first if needed.

## Download a GIF

GIFs are drawn from recorded audience counts; they do not capture the broadcast video or panel.

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

Replay controls belong to the panel. The downloaded GIF does not contain pause, seeking, or stepping controls; playback controls depend on the app displaying it.

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

See Chaturbate’s [username-color documentation](https://support.chaturbate.com/hc/en-us/articles/360048893011-Username-colors). Users can limit the color they display, so the observed classification is not a measurement of their balance or future spending. Trends and session highs describe sampled counts; they do not explain why an audience changed or measure individual viewers’ activity or purchases.

| Display | How TierScope calculates it |
| --- | --- |
| Header / GIF **Total** | Registered plus Anonymous. |
| 💎 / **With Tokens** | The six non-grey color tiers added together, including moderators and fan club members. This is a classification-based count, not a balance check. |
| 📊 / **Registered** | Named user records returned in the sample. |
| 👻 / **Anonymous** | The API’s anonymous count; during DOM fallback, an estimate of room total minus registered records, with a minimum of zero. |
| ♀⚧ / **Female/Trans** | An overlapping gender classification, not an eighth exclusive color tier. |

With API samples, owner records are excluded from the seven color tiers but remain in Registered. The displayed female/trans count can include a matching-gender owner; the report’s unique female/trans viewer totals exclude the room owner.

## TXT and CSV exports

### TXT session summary

**TXT** downloads a `.txt` file containing the latest displayed session counts, high values and their recorded times, tier breakdowns, unique female/trans viewer totals, acquisition details, and storage/version information. Before the first fresh scan after restoration, it explicitly labels its counts as a saved snapshot. Collapsed rows are included. It is a summary, not a raw time-series export.

### CSV history

Click **CSV** next to TXT in live Controls to download the current room’s **entire retained history**, with one row per sample. Unlike the GIF, this export is not limited to 60 frames. It includes all tiers regardless of which panel rows are collapsed.

The CSV columns are:

| Columns | Meaning |
| --- | --- |
| `room`, `sample_index` | Room name and sample number, starting at 1 within the exported history. |
| `timestamp_utc`, `elapsed_seconds` | Sample timestamp in UTC and seconds since the first retained sample. |
| `room_total`, `registered`, `anonymous`, `with_tokens` | Viewer totals for that sample. |
| `moderators`, `fan_club`, `dark_purple`, `light_purple`, `dark_blue`, `light_blue`, `grey` | The seven tier counts in panel order. |
| `female_trans` | The overlapping female/trans count. |

The file uses comma-separated fields, a header row, and UTF-8 with a byte-order mark for spreadsheet compatibility. Text fields are escaped, and potentially formula-like text is prefixed to prevent spreadsheet formula interpretation. If a spreadsheet opens it in one column, import it as UTF-8 and select a comma delimiter.

CSV contains recorded aggregate counts, not usernames, high-value timestamps, or inferred per-sample acquisition sources. Saved history can be exported before a fresh scan. At least one recorded sample is required.

## Saved sessions

Sessions are stored per room through Tampermonkey’s storage API, with a separate record for each tab. A compatible record is eligible for restoration if its last save was no more than **three hours ago**. This is a restore window, not a three-hour limit on an active session. Valid expired tab records are cleaned up when that room's storage is inspected, including records left behind by late writes from an old Reset generation. Old-generation records never participate in restoration. Corrupt or unsupported records are preserved rather than automatically deleted.

When several tabs have saved the same room, TierScope restores the record with the newest accepted sample. Ties prefer more retained samples, then the latest save. Histories are not merged. Closing an older tab cannot overwrite another tab's record, and open tabs keep their own in-memory histories.

Reset starts a new storage generation for the room and clears its saved records. Other already-open tabs can continue displaying and collecting local data, but cannot save it back into the reset session. Their footer shows **Local only • room reset** after a save attempt; export TXT/CSV if needed, then refresh to join the new session.

When restored history contains a sample, TierScope displays that sample until a new scan is accepted:

- The header reads **SAVED:** and the footer reads **Saved** with the sample’s age.
- Counts and charts come from saved history; highs come from the saved session-high records. They are not treated as a fresh acquisition.
- Trends wait for a fresh sample, avoiding false drops caused by an empty live user list after reload.
- The report labels the figures as **last saved stats**, includes the sample timestamp, and distinguishes them from live acquisition details.
- A failed scan leaves the saved display intact. The first accepted scan replaces it with fresh data and resumes normal trend comparisons.

Paused sessions remain paused after restoration. Resume acquisition with **▶** when ready.

History is capped at **10,000 accepted samples**. Older points are discarded when that limit is reached. Replay, GIF, and CSV exports use the retained history. Session-high values and their matching timestamps are stored separately, so tier and total highs survive the removal of older chart samples. Replay highs remain limited to retained samples through the selected frame.

Each saved record is checked independently. Corrupt or unsupported newer-schema records are skipped and preserved without blocking valid records from the same room. If none are usable, tracking starts fresh in a separate record. The TXT report shows the number of skipped records, and the console identifies them and the reason. **Reset** explicitly clears the current room’s saved records, including skipped records; it is not required to restore healthy sibling records. Deleting the script or its manager data can remove saved sessions.

The session's original start is separate from the active tracking timer. Pauses do not move the session start. The TXT report's high offsets use wall time since session start, including pauses; the tracking timer excludes paused time.

On upgrade from older versions, tier/summary highs and their timestamps are rebuilt from matching retained samples. Already-discarded peaks and an exact original start altered by earlier pauses cannot be recovered. The report labels a legacy start as estimated.

## Development and testing

The repository includes a repeatable test suite and a GitHub Actions workflow. See [TESTING.md](TESTING.md) for setup, coverage, and release checks. Tests run during development and add no overhead to the installed userscript.

```sh
npm ci
npx playwright install chromium
npm test
```

## Acquisition and dependencies

TierScope depends on Chaturbate’s room data and page structure; changes to either can affect acquisition.

- **Primary source:** same-origin `/api/getchatuserlist/`, with a 10-second timeout.
- **Validation:** malformed or duplicate records reject the sample. Additional count-change checks can reject suspicious changes. Rejected samples add no history point.
- **Fallback:** reads the Users tab if the API is unavailable or rejected, then attempts to return to Chat. Fallback attempts are spaced by at least 60 seconds, or the configured scan interval when longer.
- **Freshness:** the last accepted data stays visible through failed attempts. The site’s Users tab and TierScope can refresh at different times.
- **Storage format:** session schema version 2, with tab records under `tierscope:tab:v2:<room>:<record-id>` and a Reset generation under `tierscope:epoch:v2:<room>`. Compatible legacy records under `tierscope:v1:<room>` are validated and migrated in memory; new saves use version 2. Older releases cannot read these new records. Row visibility preferences are stored separately under `tierscope:ui:collapsedRows:v1`, and position/scale under `tierscope:ui:geometry:v1`.
- **GIF dependency:** [omggif](https://github.com/deanm/omggif), version 1.0.10, MIT licensed.

The script does not upload TXT reports, CSV files, GIFs, or tracking history to a TierScope server. It makes room-data requests to Chaturbate; the userscript manager loads the encoder from jsDelivr. Saved session data includes observed usernames used for session bookkeeping.

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

This is expected only when all 11 rows are collapsed. Restoring any row brings back the original chart-area height. If it changes size while a row remains open, confirm that only version 3.1.14 is enabled, refresh the tab, and report the browser and steps that reproduce it.

**The panel is too large or near a screen edge**

Click **100%** to restore standard scale, or use the resize handle. Expanding from compact view should reposition the panel immediately. On a small viewport, reducing the scale may be necessary to fit the whole panel.

**Replay is unavailable, or Play is disabled**

Replay needs a recorded sample for this room. Play needs a nonzero recorded time span. Check the `PLAYBACK` header if you expected current live counts.

**The step buttons are disabled**

The previous button is disabled at the first sample and the next button at the last. Both are disabled for a single-sample recording. Play may be unavailable when the recording has no time span, even if there are multiple samples to step through.

**No CSV download**

CSV requires at least one recorded sample. Use the **CSV** button in live Controls; return from Replay first if those controls are hidden.

**No GIF button**

Click **Replay** first. GIF export is deliberately absent from live Controls.

**“GIF encoder missing”**

Reinstall the complete script with its `@require` header and refresh the room. Check whether the userscript manager can load the pinned jsDelivr dependency.

**A download does not appear**

Check the browser’s downloads list and any blocked-download notification. Allow the requested download for the room and retry.

**Storage is “Protected / read-only”**

A room-level storage access failure can still make saving read-only. Individual corrupt or unsupported records are skipped instead: healthy history can restore and new records can save. See the TXT report and browser console for details. Skipped records remain untouched unless you explicitly Reset the room.

## Version history

| Version | Notes |
| --- | --- |
| **3.1.14** | Two gentle live high-value pulses on expanded rows and collapsed markers, with reduced-motion support. |
| 3.1.13 | Compact metric icons; slightly brighter green highlights; larger third-row trend boxes; diamond trend background follows change direction while retaining its pink border. |
| 3.1.12 | Restored page-based startup: expanded in broadcast rooms, minimized elsewhere; retain position/scale persistence and scan-settings close fixes. |
| 3.1.11 | Added a close button and document-level Escape handling for scan settings; remember compact/expanded view with panel geometry. |
| 3.1.10 | Compact dashboard with a remembered switchable chart, count changes, sample freshness, and scan settings overlay. |
| 3.1.9 | Isolate corrupt or unsupported saved records; restore healthy siblings; expire valid old-epoch orphan records. |
| 3.1.8 | Separate session start from active time; preserve session highs beyond history rollover; isolate same-room tab saves; add repeatable regression tests and CI. |
| 3.1.7 | Reposition the panel immediately on expansion. |
| 3.1.6 | Remember panel position and scale; added the 100% size reset, Replay sample stepping, and CSV history export alongside TXT reports. |
| 3.1.5 | Fixed panel-height redistribution when collapsing rows, including inherited line-spacing cases. Shrink only when all 11 rows are collapsed. |
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
