# TierScope — Usage and development notes

Detailed reference for **3.21.0** ([Follow live guide](docs/follow-live.md)). [Audience trends and ratio guide](docs/audience-trends.md). [Sessions Book guide](docs/sessions-book.md). The simplified Current Live Session card provides Keep in Library, Auto, Compare with previous, and History. File controls are below the session list, and exports remain on stored-session menus and the separate replay card. Development uses modular sources and a single installable script; see [BUILDING.md](BUILDING.md). For installation instructions, see the [README](readme.md).

## Contents

- [Installation and updates](#installation-and-updates)
- [Live controls and customization](#live-controls)
- [Charts and sample inspection](#charts-and-sample-inspection)
- [Request failures and retries](#request-failures-and-retries)
- [Replay](#replay)
- [Session files](#session-files)
- [Session tools](#session-tools)
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

When updating, install the complete userscript, including its metadata header. TierScope bundles the pinned GIF encoder into the script; no external `@require` or separate encoder download is needed. Its MIT license is included in the script and [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt).

The script also requests `GM_listValues` to find the separate saved records for each room.

Keep only one enabled copy of TierScope. After an update, refresh existing room tabs.

## Live controls

| Control | Action |
| --- | --- |
| Header / drag area | Move the panel; save its position when you release it. |
| Pink upper-left resize handle | Scale the panel; save its size when you release it. |
| **100%** in the header | Restore standard scale while keeping row visibility and session data. |
| **Full ▾ / 4h ▾ / 2h ▾ / 1h ▾ / 30m ▾ / 15m ▾** in the expanded header | Open chart-window and high-record options. |
| **−**, **+**, or **Expand** | Switch between expanded and compact views. |
| **⏸ / ▶** in Controls or compact view | Pause or resume the current session. An already-running scan may finish. |
| **■ Stop** | Confirm closing the session, freeze elapsed time and history, and discard pending scan results. |
| **Start** after Stop | Confirm starting a separate session with an empty chart and a fresh timer. |
| Compact-view timer controls | Adjust the interval from 30 to 300 seconds; presets are 30s, 60s, 2m, and 5m. |
| Row circle or icon | Collapse that row into the strip below the header. |
| Boxed icon in the collapsed-row strip | Restore its row to its original position. |
| Lamp slider | Adjust the main background and standard tier-row fills. |
| Moon–sun switch at the bottom right of Controls | Moon / blue track for dark mode; sun / amber track for bright mode. Click or press Space when focused to switch. |
| **Replay** | Open recorded history for the current room. |
| **Library** | Open recordings, model folders, session files and exports, summaries, comparison and backups beside the chart. |
| **Reset** | Confirm clearing this room’s history, counters, and elapsed time, then request one fresh scan. Keep the automatic-scan pause state and layout preferences. |

The top control row shows **Controls**, elapsed time and the scan countdown/status. The bottom row contains **Library**, **Replay**, play/pause, **Stop**, **Reset** and the theme switch. Library and Replay match the other action buttons, and Library uses the same pink accent as its replay shortcut. Reserved timer space keeps these rows steady as status text changes.

The default scan interval is **60 seconds**, counted after a scan finishes. A new, unpaused room session requests its first sample as soon as the panel is initialized, then starts the normal countdown when that attempt completes. Existing retry waits and access restrictions still apply. Restored sessions keep their existing startup behavior; paused sessions wait for Resume. Faster polling does not guarantee fresher data from the site.

The footer shows the sample source and age, for example `API • 12s`, `DOM • 4m`, or `Saved • 2h 5m`. Ages use seconds, minutes, hours, or days as appropriate. They are measured from the **sample’s timestamp**, not the session’s last save time or the countdown to the next scan. Hover over the status to see the recorded timestamp.

Reset requests a one-off scan even when automatic acquisition is paused. It does not turn automatic acquisition back on, and reloading afterward preserves that paused state.

### Pause, Stop, and new sessions

**Pause** suspends automatic acquisition and freezes the elapsed timer. An in-flight request may still finish. Resume continues the same history; the time away can appear as a sampling gap.

**Stop** asks for confirmation before closing the current tab’s session. Cancel leaves the session running with its existing settings. It freezes elapsed time, retains the final counts and chart, cancels live high pulses, and invalidates any in-flight acquisition so that its result cannot append another sample. The header and status show **STOPPED / Stopped**. The chart’s time range and stopped trend comparisons do not advance with the clock. Replay, TXT, CSV, and GIF export remain available. Stop does not erase data or backdate/remove previously accepted samples.

After Stop, Pause/Resume becomes **Start**. Starting again requires confirmation and begins separate history and elapsed time. Export the stopped session first if you want a lasting copy. Its existing tab record is left intact until normal storage cleanup, but there is no archive picker; ordinary restore still selects the room record with the newest sample. Other tabs retain their independent sessions. Reset retains its existing room-wide clearing behavior.

Stopped state survives restoration of that saved record and never resumes automatically. The normal three-hour saved-record restore window still applies. Older builds can read the aggregate history and paused flag, but do not implement the new Stop behavior.

### Broadcaster absence and automatic pause

TierScope uses the owner flag in well-formed user-list API responses. This identifies presence in that list; it does not distinguish a private show, an away period, or an offline broadcast.

- The first response without an owner starts an absence window. A second such response enables a **minimum two-minute** interval.
- After **ten minutes**, the minimum interval becomes **five minutes**.
- After **15 minutes** of established absence, recording and active elapsed time **automatically pause**. The last accepted sample remains visible.
- While auto-paused, TierScope checks the same user-list API **every minute** for the owner. This return-check interval is independent of the selected recording interval. These checks do not add absent-room counts to history, update highs, or use the DOM fallback.
- A well-formed response containing the owner resumes the selected scan interval and active timer. Its audience counts are recorded only if they pass the usual sample validation. The first accepted sample after the pause has an orange dashed gap connector.
- After **three continuous hours auto-paused**, the session **Stops** without a confirmation prompt. This means **three hours and 15 minutes from the first absence observation**, provided absence has been confirmed. A later return needs a new session.

Controls shows **Reduced** during slowdown, then a **Check** countdown while auto-paused. The status line and compact view show **Auto-paused**; tooltips explain the return checks and Stop deadline. Playback, FILE REPLAY, and exports remain available while return checks continue in the background.

While auto-paused, the button becomes **▶ Resume recording**. One click restarts recording and active elapsed time at the selected scan interval, cancels the pending automatic Stop, and replaces return-only checks with normal scans. Absence slowdown, automatic pause, and automatic Stop stay disabled for that continuous absence. Only a new, well-formed API response containing the owner re-enables absence automation for a later departure.

This manual override is saved with the session and survives refresh and ordinary Pause/Resume. Reset or starting a new session clears it. Manual Stop still ends the session after confirmation. The countdown tooltip and TXT report identify an active override.

Errors, malformed responses, and DOM-only samples cannot establish absence or confirm a return. Once absence is established, its deadlines use wall time; a failed check does not prove a return or extend the deadline. Checks respect rate limits, server waits, and retry backoff, so detecting a return can take longer than one minute. Manual override also respects these restrictions. Access denial (401/403) switches to manual pause and requires explicit Resume; an internal failure cannot activate the override. Selected scan intervals never become shorter during slowdown.

Absence and the automatic-pause time are saved with the session. Restoring an eligible auto-paused record resumes return checks without restarting elapsed time. The normal three-hour saved-record restore window still applies; completed return checks refresh that record without adding samples. If a suspended tab wakes late, active time freezes at the 15-minute pause deadline and an overdue Stop uses the original deadline. Pending responses cannot reopen a stopped session or survive Reset, navigation, or cancellation of return checks.

### Compact dashboard

The minimized panel retains its 140-pixel content width. Click the chart label to cycle **Room total → 💎 (With Tokens) → 📊 (Registered)**. This preference is saved across rooms and refreshes, independently of collapsed rows.

The chart shows the last **15 recorded minutes**, ending at the latest retained sample. Horizontal positions follow sample timestamps; vertical scale fits the plotted values. When a missing interval crosses the window’s left edge, the preceding recorded endpoint is included in the scale so its orange connector can continue into view; it is not counted as a sample inside the window. A single sample is a dot, and a constant series is a horizontal line. Hover over the chart for its value range, sample count, and end time. The adjacent SH or ATH value is the selected session or all-time high, independent of the visible window; click it to switch modes.

The header shows room total and its change; the two rows below the chart show With Tokens and Registered counts and changes. Changes use the main panel's selected comparison window. Restored snapshots leave changes blank until a fresh sample is accepted; a comparison also needs sufficient history. Hover over counts for exact values and percentages, changes for their comparison window, and the header for room name and room high.

The footer shows sample source and age, or Paused and age. Hover for the source, timestamp, and scan timing. The clock button opens scan-interval controls over the chart without increasing panel height. Its tooltip explains that it adjusts how often TierScope scans. Click the × close button, click the clock again, or press Escape to close them. Escape works even after focus moves outside the panel. Pause/Resume and Expand remain directly accessible.

### Position and size

Drag the header to move the panel, or drag the pink upper-left handle to resize it. Position and scale are saved when you release the mouse and restored after a refresh or room change. The panel starts expanded in broadcast rooms and minimized on other pages, such as Followed, Featured, and cam directories. Compact/expanded state is not remembered; the view preference saved by 3.1.11 is ignored. Position and scale still restore normally.

Click **100%** in the header to return to standard scale. Use it in different tabs to give their panels the same scale. It keeps your collapsed-row choices and session data; it does not reset tracking or return the panel to its original position.

Saved layout preferences are shared across rooms and tabs. A newly opened or refreshed tab uses the latest saved position and scale; panels already open in other tabs do not move or resize automatically.

Restoration, window resizing, and expansion from compact view adjust the position to keep the panel within the available viewport. If the chosen scale is larger than the viewport can accommodate, the panel is anchored at the top or left edge so the header remains reachable. Use **100%** or the resize handle to reduce it.

### Collapsible rows

All **12 panel rows** can be collapsed independently. **Room Total (👥)** sits below Anons and includes registered and anonymous viewers, with its own chart and SH/ATH high. The header identifies the displayed model and has its favorite star, with left spacing clear of the resize handle; during file Replay it identifies the file’s model. The compact view keeps a separate room count below that header.

1. Click a row’s circle or icon to hide its full row.
2. Its marker appears as a small bordered button in the strip below the header.
3. Click that button to restore the row to its original position. The buttons also support keyboard focus and Enter/Space.

**Moderators (red), Anons, and Room Total start collapsed; all other tiers start expanded** when no valid visibility preference has been saved. After you customize the layout, your choices apply across rooms and full page refreshes. Restoring every row is also remembered. Reset clears session data, not these preferences.

With at least one row open, the chart area keeps its original height and gives the remaining charts more vertical space. Collapsing all 12 rows shrinks it to the strip above Trends; restoring any row returns it to its original height. The separate compact/expanded toggle and resize handle still work normally.

Hover over a collapsed marker to see its count, high, and whether the displayed sample is saved, live, or from Replay. Green high-value highlights also appear on collapsed markers.

Collapsing a row changes presentation only. All rows continue to be tracked and remain available in trend comparisons, TXT reports, CSV exports, and GIFs. In Replay, hiding or restoring rows preserves the selected position and Play/Pause state; it does not seek or restart playback.

### Charts and sample inspection

Expanded charts default to **Full history**, up to 10,000 retained samples. The header menu offers **Full history**, **Last 4 hours**, **Last 2 hours**, **Last hour**, **Last 30 minutes**, and **Last 15 minutes**, in that order. In live view, the selected window ends at the latest recorded sample and stays still while no new sample arrives. In Replay, it follows the moving connection toward the next recorded sample, including across gaps. Short sessions use the available span. Horizontal positions follow sample timestamps; Full history continues to fit the whole retained span as history grows. Replay's recorded points and sample inspection stop at the selected sample; the animated connection adds no samples. Each row scales independently to the values drawn in that window; a preceding endpoint may be included to connect and clip a segment crossing its left boundary. A single sample appears as a dot; a constant series is centered vertically.

The window choice is remembered across rooms and refreshes. It changes chart presentation only: counts, session highs, comparisons, stored samples, CSV, GIFs, and session-file exports keep their existing full retained range. Reset keeps the preference. The compact chart keeps its independent 15-minute window. Changing windows during Replay preserves the selected sample and Play/Pause state. The menu overlays the panel, adds no height, and closes with ×, Escape, or an outside click.

Known pauses, failed acquisition attempts, refresh boundaries, and unusually long acquisition intervals interrupt the measured line. Thin, dashed orange connectors join the recorded endpoints across those intervals in expanded charts, the compact chart, Replay, and GIFs. The actual duration remains on the time axis. These connectors are visual annotations: they add no samples and do not alter counts, highs, trend comparisons, TXT reports, or CSV history. Until the next accepted sample exists, the live line ends at the last observation; nothing is projected forward. Replay already has both recorded endpoints, so it animates the connection across a gap; moving dashes show progress even when the endpoint counts match. Breaks are saved with new history. For older sessions without break metadata, gaps are inferred conservatively from unusually long timestamp intervals; the original pause boundaries cannot always be recovered. If the system clock moves backward, horizontal positions are clamped to preserve sample order; inspection still shows the original recorded timestamp.

Hover over an expanded or compact chart to see the nearest recorded sample’s count and local time, its sample number, and the plotted minimum and maximum. Hovering inside a marked gap shows “No samples recorded during this interval,” the two endpoint times, and an explanation of the orange dashes. It does not display an estimated count for the missing interval. Keyboard users can Tab to a chart, use Left/Right to move between samples, Home/End to jump to either end, and Escape to close the tooltip. Inspection adds no panel height.

Dense charts preserve the first, last, minimum, and maximum samples in each pixel column. This reduces drawing work without discarding stored samples or changing CSV counts. Replay reuses its frozen history and updates the animated connection every 50 milliseconds while playing. Paused Replay repaints only when its position or layout changes.

### Trends and highlights

The trend display uses green for increases, red for decreases, and yellow for unchanged counts. It shows the numeric change when nonzero. Its larger bottom row contains With Tokens (yellow border), Registered, Anons, and Room Total (pink border). Room Total is registered plus anonymous viewers, compared at the same baseline as the other boxes. All rows use four columns; the bottom boxes remain taller. Delta fonts adjust to fit, large changes use k/m shorthand, and each box’s tooltip gives the exact current count, comparison count and change.

Choose **Last**, **5m**, **15m**, **30m**, **1h**, or **Start**. A manual selection turns automatic escalation off. **AUTO** toggles escalation through Last → 5m → 15m → 30m → 1h as tracking time grows. If a requested window extends before available history, the earliest retained sample is used.

A row’s green high-value highlight is separate from its trend indicator. In SH mode, it appears whenever a positive count equals the session high, including a return to that value after a dip. In ATH mode, it compares against the room's saved all-time high. In Replay, SH compares against retained history through the selected sample; ATH compares against the saved room records opened with Replay.

### Session highs and all-time highs

The **SH / ATH** button immediately left of the chart-window menu switches every tier and summary high, including the room total. **SH** is the current session high. **ATH** is the greatest accepted value TierScope has recorded for that room across sessions in this browser's userscript storage. Both are tracked regardless of the selected display mode. The preference is remembered across rooms and refreshes. In compact view, click the high beside the chart metric to switch modes.

Hover a high for its full value, recorded date/time when available, and whether an ATH came from live recording, a restored local session, or an explicitly added file. Long values are abbreviated in the narrow high-value column; the tooltip retains the exact number. `ATH:—` means there is no record yet. Highlights and live high-value pulses follow the selected mode; switching modes or replaying history never triggers a pulse.

ATH records are separate for every room, including across multiple tabs. They survive normal session Reset, Stop/Start, the three-hour session restore window, and history rollover. The first upgrade can seed them from an available validated local session. Missing or previously deleted history cannot be recovered. Records do not automatically sync between browsers or devices, and clearing userscript-manager storage can remove them.

Opening a session file is read-only. To include its peaks, click **Add to all-time highs** beside the room name in FILE REPLAY. The same action is also available in the chart-window menu. The replay button confirms **Added to ATH** or **Already in ATH**; hover it for the room and full result. A failed save shows **Retry adding to ATH**. This adds the complete file's session highs, including peaks older than its retained chart samples, to the **room named in the file**, even when another room is currently open. Lower values never reduce a record; equal values retain the earliest known timestamp. Repeating the action is safe. It does not change live history, the file, or the selected Replay position.

Replay uses the room's ATH records captured when it opens, so background live scans do not change its comparison. Switching SH/ATH refreshes that comparison from storage; explicitly adding the file also refreshes it. SH retains its existing historical meaning. TXT/CSV/GIF and session-file exports retain their session-based values and formats.

**Clear all-time highs…** in the same menu is a separate, confirmed action for the displayed room (the file's room during FILE REPLAY). It preserves session history and files. After clearing, only new accepted samples or an explicit file addition start new records; reloading an old session does not restore the cleared peaks. A storage failure is reported in the menu and high-value tooltip; unsaved peaks remain local to the open tab and are retried on later accepted scans. Invalid or unsupported stored records are skipped and preserved.

### High-value pulses

An accepted live sample triggers two gentle pulses when a row sets a new positive high or returns to its high after a dip, using session highs in SH mode and all-time highs in ATH mode. The visible expanded row or collapsed marker pulses for about 1.7 seconds, then retains its steady green highlight. Text, counts, chart lines, and icons do not fade.

A count staying at its high does not restart the cue. Collapsing or restoring a row cancels its current pulse and never starts another. Entering Replay, minimizing the panel, resetting, or changing rooms cancels active pulses. Saved snapshots and Replay never pulse, and events while the compact panel or Replay is open are not queued for later. Zero counts do not trigger a pulse.

Reduced-motion preferences disable the animation while preserving the steady highlight. Browsers without the animation API also retain the steady highlight.

### Background opacity

The lamp slider ranges from **30% to 100%**, starting at **95%**. Moving left makes the main panel fill, normal tier-row fills, and normal collapsed-marker fills more transparent.

It preserves green high-value highlights, borders, text, charts, and the fills of the summary rows, Controls, and other buttons. It does not apply opacity to the whole panel. The setting is retained during navigation in the current page session, but is not saved across a full reload.

### Dark and bright mode

The moon–sun switch at the bottom right of Controls starts in **dark mode** when no preference has been saved: its indicator sits beside the moon on a blue track. Switch to **bright mode** to move the indicator toward the sun on an amber track. Click the switch or reach it with Tab and press Space. Keyboard focus remains visible, and reduced-motion preferences disable the sliding animation. The choice is remembered across rooms and refreshes, independently of session data; Reset keeps it. Other already-open tabs keep their current theme until reloaded.

The theme applies to expanded and compact views, Replay controls, scan settings, and chart tooltips. Bright mode uses light surfaces and darker neutral/status text. The registered-total chart switches from white to dark so it stays visible; tier colors, including dark purple and dark blue, stay unchanged. High-value backgrounds and pulses retain their green treatment, and the opacity slider keeps the same scope. Switching themes does not resize the panel, change tracking, or move the Replay position. GIF exports use a fixed dark background and palette, including orange for missing intervals.

## Request failures and retries

Acquisition distinguishes server restrictions from temporary failures:

- **HTTP 429:** no DOM fallback is attempted. `Retry-After` is honored as either seconds or an HTTP date. Without a usable header, acquisition waits at least one minute and uses the backoff schedule below.
- **HTTP 401 or 403:** automatic acquisition and its timer pause, and the panel shows **Access denied** with the status code. DOM fallback is not attempted. After resolving the access problem, use **Resume** to retry; Reset and reload do not clear the restriction. A server-provided wait still applies.
- **Other failures:** retries start after the longer of one minute or the configured interval, then double after consecutive API failures, up to 15 minutes. A longer `Retry-After` takes precedence. The existing DOM fallback remains available for ordinary failures, with its own cooldown, but is skipped when the server specifies a future retry time.

Successful, validated API acquisition clears the failure backoff unless another tab has since recorded a newer restriction. The last accepted sample stays visible throughout failures. The status and countdown show the retry or access state; the sample timestamp remains available in the status tooltip.

Request restrictions are shared through userscript storage across TierScope tabs on the same origin and survive reloads. Changing the scan interval, resetting a room, or attempting another scan cannot shorten a server wait. This is a shared retry gate, not a single shared scanner: simultaneous tabs can still start requests before either receives a restriction.

## Replay

Replay displays recorded audience samples. It does not record or play broadcast video or chat.

1. Acquire at least one sample, or restore a saved session containing history.
2. Click **Replay** in Controls. The header changes to `PLAYBACK`.
3. Use **Play / Pause**, the timeline slider, and **0.5× / 1× / 2×** to inspect the recording.
4. Use the previous/next sample buttons beside the timeline to step through individual saved samples.
5. Click **Return to Live** to return to the latest accepted sample, or the saved snapshot if no fresh scan has succeeded since restoration.

At 1×, each transition between recorded samples takes one second, with the total playback capped at 30 seconds. Longer recordings divide those 30 seconds evenly among their sample transitions. The speed selector adjusts that playback duration. Recording pauses and changes in scan frequency do not slow Replay down. The slider follows sample progress evenly; the time display and chart spacing retain the original recorded timing.

Each step pauses Replay and moves to the previous or next recorded sample. Step buttons stop at the first and last samples; samples with identical timestamps can still be inspected separately. Hover over the time display to see the selected sample number. With only one sample, both step buttons are disabled.

The chart line moves between recorded samples, with animated orange dashes across gaps. Counts, highs, and green highlights change only when Replay reaches an actual sample. Pausing Replay freezes the animation, and resuming continues from the same position. A single saved sample can be inspected, but has no next sample to play toward. Multiple samples can play even if their timestamps match. These controls and pacing also apply to Replay opened from a session file. Minimize is disabled during Replay.

Replay freezes the available history when opened. New scans continue updating the live session, but do not enter the open Replay. Return to Live and reopen Replay to include them. Replay Pause does not pause live scans; pause acquisition in live Controls first if needed.

## Session files

Click **Library** beside Replay, keep the live session with **Keep in Library**, then use that session’s **More… → Save file**. You can also use **Save file** on the separate replay card without keeping a Library copy. The download ends in `.tierscope.json` and contains the room name, capture time, full retained sample history, gap markers, session highs and their recorded times, session start information, active elapsed time, and paused/stopped state. It contains aggregate counts, without viewer username collections. A running session can be saved without pausing or stopping it. Save becomes available after the first recorded sample.

Click **Open saved file…** in Library to reopen a download. It opens paused in a separate **FILE REPLAY** view, with the same stepping, playback speed, row controls, chart windows, and GIF export as ordinary Replay. The file’s room name stays visible above the Replay controls, independently of the room currently open in the browser. Long names shorten with an ellipsis; hover over the name to read it in full. The options menu shows its room, capture time, sample count, and whole-session room high. The Replay time tooltip includes captured active time and session state. Replay SH values still use retained samples through the selected frame; the file also preserves whole-session highs that may predate those samples. ATH mode compares against the file room's saved all-time records. Opening the file does not add its highs; use the separate **Add to all-time highs** action in Library or in the chart-window menu.

Both ordinary Replay and FILE REPLAY have a **Library** button beside the playback controls. The library stays open during playback; it displays a separate card for the replay snapshot alongside Current Live Session. **Save file** downloads the entire session without moving playback, and **Open saved file…** switches to another saved file. Open works without a live session; on directory pages, expand the panel to reach Library.

Opening a file does not replace, merge, save over, or resume the current room session. Current live acquisition continues with its existing pause/Stop state. **Close Replay** returns to that room’s latest data. It is also possible to expand TierScope on a directory page and open a file there; opening the file itself makes no acquisition requests. Imported Replay is not automatically restored after refresh or navigation: reopen the file when needed.

The file has no three-hour expiration. Keep the download wherever you normally keep documents. It contains only the samples still retained when captured; it cannot recover data already removed by the 10,000-sample limit. Saving from ordinary Replay captures its entire frozen session, and saving from FILE REPLAY downloads that file’s supported data again. Chart-window selection and playback position do not trim these exports. GIF filenames use the file’s room when exporting imported Replay. TXT and CSV in Library use the replay snapshot or stored library entry, including samples beyond the playhead.

Files are validated before opening. Unsupported versions, malformed data, empty histories, invalid counts, and files over 8 MB are rejected without replacing the current Replay. File format version 1 uses a `TierScopeSession` envelope with a supported session schema, separately from the userscript version. Import copies only supported aggregate fields; it does not evaluate file contents or restore acquisition settings. A pending file read is discarded after Reset, navigation, closing Replay, or selecting a newer file.

## Download a GIF

GIFs are drawn from recorded audience counts; they do not capture the broadcast video or panel.

Open **Library** and use a stored recording’s **More… → GIF**, or **GIF** on the separate replay card. To export live data through the session list, keep the session first. You do not need to enter replay first. Progress and **Cancel** appear at the top of Library; closing Library cancels generation.

| Property | Output |
| --- | --- |
| Format | Animated `.gif`, looping indefinitely |
| Dimensions | **480 × 640** |
| Duration | **10 seconds per loop** |
| Frames | Up to **60**; one recorded sample produces a single-frame GIF |
| Tier rows | Seven color tiers plus the female/trans overlay |
| Summary rows | Total, With Tokens, Registered, Anonymous |
| Content | Historical lines, counts, and recorded elapsed time |
| Rendering | Fixed palette, bitmap lettering, two-pixel measured lines, thinner orange dashed gap connectors |
| Encoder | `omggif` 1.0.10, bundled into the userscript |

Export uses the **entire frozen Replay range**, regardless of cursor position or playback speed. With more than 60 samples, it selects moments across the recorded time range and includes the first and last samples. Each chart shows history only through its selected sample, uses timestamp spacing and recorded gaps, and scales independently to its visible minimum and maximum. Flat series are centered. Orange dashed connectors appear only once both recorded endpoints are included in the frame; a small legend identifies them as intervals with no samples.

The GIF always includes every tier and all four summary lines, including rows collapsed in the panel. It has a fixed dark background; the panel’s opacity slider and row heights do not affect its layout. Generation happens locally and does not require watching or recording ten seconds of playback. File size and generation time depend on the history and device; there is no fixed file-size guarantee.

Leaving Replay, changing rooms, resetting tracking, or unloading the page cancels an active export.

Replay controls belong to the panel. The downloaded GIF does not contain pause, seeking, or stepping controls; playback controls depend on the app displaying it.

## Session tools

Click **Library** beside Replay in Controls or beside Play in Replay. It opens a matching page to the left of the chart, with Sessions, Summary, Compare and Backup tabs. The chart remains usable. The page follows panel movement, scale and theme; small windows use a scrollable sheet. The main panel stays above Library wherever they overlap, including in sheet layout, and receives clicks in the overlapping area. The × button, Library button or Escape closes Library. Temporary space borrowed for docking is restored on close unless you moved the panel. Room navigation closes Library and discards pending file reads.

### Library

**Keep in Library** in either the Current Live Session card or the separate replay card takes a frozen copy of the full retained recording, including its session highs. In file Replay it keeps the file's recording. **Import to library…** adds a downloaded recording directly. **Open saved file…** opens one for replay without retaining it automatically. Neither action changes ATH or live history. Re-saving the same recording with a different export timestamp or producer version does not create a duplicate.

Repeated saves recognize the model and recorded session start. A fuller compatible copy updates the existing entry and preserves its custom name; an equal or older/shorter copy does not replace it. Shared samples must agree, so conflicting recordings remain separate even when their start timestamps match. New sessions for the same model remain separate. Updates store the replacement before removing obsolete copies, so a failed save retains the prior recording. After history rollover, the library follows the existing 10,000-sample retention limit; it does not extend live history indefinitely. Estimated legacy start times cannot link windows with no overlapping samples.

Current Live Session provides **Keep in Library**, **Auto**, **Compare with previous**, and **History** with its session count. The separate replay card also offers **Save file**, **TXT**, **CSV**, **GIF**, and **Add to ATH**; stored sessions have these exports under **More…**. Keep always stores the whole replayed recording, including samples beyond the playhead, and shows whether it added, updated or already had the recording. A storage failure appears in Library and the action can be retried. Keeping a file uses that file’s room and does not add its peaks to ATH. Playback position, speed and background live data are preserved.

Expand **Sessions Book** below the storage counter and limits to browse **model folders** ordered by their first matching recording under the selected sort, each showing its recording count and most recent recording date. Open a folder to see that model's recordings, newest first by their first retained sample; **All models** returns to the folder list. Existing recordings are grouped automatically without moving stored data. Keep/import opens the matching model folder. Model, date and text filters work together. Select **All sessions** to search across models; searching within a model keeps that model selected. Each recording shows a selection checkbox, **Replay** and **Summary**; **More…** contains Save file, TXT, CSV, GIF, Add to all-time highs, Rename and confirmed Delete. These exports use that recording without opening it in replay. Large lists show 50 folders or recordings at a time with **Show more**. Library Replay keeps the library open and uses the existing file Replay controls; explicit Add to ATH is available in the recording card. The library persists across session Reset and the temporary session's three-hour expiry. It is kept only in this browser's userscript storage, with default limits of **1,000 sessions / 50 MB**. Either limit can fill the library; updates also need temporary space to save the replacement safely. Nothing is automatically deleted or evicted; a full library asks you to raise Storage limits or export and remove entries. Unreadable entries are retained. **Download unreadable records** keeps their raw stored values for manual recovery before any explicit removal. If a value cannot be read, its size is unknown and library additions wait until it can be read or you explicitly remove it.

While Library is open, unchanged recordings are validated once and reused across its tabs. **Refresh**, switching tabs and reopening still check stored values, so additions, changes and deletions from another tab are visible. An unreadable record never falls back to its cached copy. Closing Library discards the cache; reopening performs a fresh read. This does not change library capacity, automatic retention, or file contents.

### Storage limits — 3.18.0

In **Library → Sessions**, open **Storage limits** below the usage counter. Set a whole-number session limit (1–10,000) and storage allowance (1–250 MB), then **Save limits**. **Use defaults** fills 1,000 sessions / 50 MB; Save applies those defaults. Values use 1 MB = 1,048,576 bytes, as the existing counter does. Limits are shared by all models in this browser, read fresh before writes, and verified after saving. Existing installations receive the higher defaults without rewriting recordings. Actual browser/userscript storage can still reject a write earlier.

At 80% of either allowance, the Library shows a capacity warning. At or over a limit it offers raising the allowance or exporting/removing sessions. Automatic checkpoints refresh the usage/warning without replacing an open settings editor. **Refresh** also rereads changes from other tabs. Lowering limits never deletes sessions: recordings remain available for reading, replay, analysis and export; additions/updates wait while usage exceeds the allowance. A full session-count allowance still permits updates to existing sessions when enough byte space remains. Safe updates retain the previous copy until its replacement has been verified, so temporary space is required.

Storage limits are local preferences and are not changed by backup restore or Library import. Backups up to 300 MB / 10,000 sessions can be opened even when this browser’s allowance is smaller; restore checks capacity before changing recordings, ATH or preferences. Raise Storage limits first when restoring a larger Library. Backups and exports remain available after lowering limits below current usage. These file bounds accommodate the largest configurable Library plus metadata; they do not reserve space or guarantee that every device will handle a maximum-size file quickly. Full-library validation and transfer remain synchronous.

A failed settings save keeps the prior value when recovery succeeds and retains the entered fields for retry. A concurrent settings write is not overwritten during rollback. Unreadable or unsupported limits stop new Library writes rather than silently assuming the defaults; recordings and backups remain accessible, and explicitly saving valid limits repairs the preference.

### Automatic keeping for favorites

The Library is titled **Library**, with **Session Storage and Analysis** beneath it. Its tabs are **Sessions**, **Summary**, **Compare**, and **Backup**. Sessions starts with **Current Live Session**; a replayed session has its own separate card, so Save/Keep/exports always target the labeled model. Keep in Library and Auto share the first action row; Compare with previous and History share the next. **Sessions Book** follows the session/storage counter and Storage limits. It starts collapsed; expand it to browse model folders and sessions. A separate collapsed **Search & sort** section contains the existing model and sort selectors, Favorites only, date range and text search. An active-filter indicator remains visible when search is closed. Folding preserves filters, selections and note drafts; disclosure choices survive tab changes and Refresh while Library stays open. Closing and reopening Library starts both sections collapsed again. Keep/import and returning from model history open the book to reveal the relevant sessions. Open saved file, Import to library and Refresh remain at the bottom, outside the book.

**Auto** reflects the model’s confirmed favorite setting. Clicking it while off asks you to favorite the model and confirm automatic keeping. Cancelling leaves it off. When enabled it is checked and locked; remove the model’s star to stop automatic keeping without deleting stored sessions. Existing/imported favorites still need individual confirmation.

For a confirmed favorite, the first live sample is kept immediately. As new samples arrive, TierScope updates the compatible Library session at most once per minute. Pause/resume, Stop, Reset/Start, leaving the room and normal tab close also checkpoint the current retained live data. It does not record while TierScope is closed, add replay files automatically, or bypass scan restrictions. A browser crash or forced termination can lose data since the last completed checkpoint. The normal retained-sample limit still applies; automatic keeping is not an unlimited archive.

Automatic updates preserve saved names and notes. Draft notes also follow a verified update of their session, without being reassigned by date. The configured session/storage limits apply, including temporary space needed for a safe replacement. A failure leaves the previous Library copy and valid live data intact, shows **Library save pending**, and retries on later samples; **Retry keeping** or a manual session-file download is available in Library. Reset starts a new live session while keeping prior Library sessions. Backups and imports carry favorite choices, but enabling automatic keeping on a new browser still requires confirmation for each model.

### Finding, annotating and moving recordings

Choose a model folder or use **Model** to switch directly between models and **All sessions**. **From** and **Through** use the first retained sample's calendar date in your browser's local timezone; both dates are inclusive, including daylight-saving transitions. An invalid range shows no matches until corrected. Search matches titles, model names and recording notes within the selected model and dates. Sort newest/oldest first, by title or model, or with favorite models first. **Favorites only** includes every recording from starred models and works with the other filters. Filters and selections last while Library is open; **Clear filters** preserves the selection and **Clear** in the selection controls preserves the filters.

Use the star in the model header, Current Live Session card, beside a model folder, or **Favorite model** inside the folder. Adding a favorite asks for confirmation before enabling automatic keeping for that model. Existing or imported favorites remain starred with automatic keeping off; use **Enable automatic keeping…** to confirm each one. Removing the star stops automatic keeping and retains sessions already kept. Its choice applies to every recording in that folder and survives deleting individual recordings. Stars set on recordings in beta 1 become model favorites without overriding later model choices. Under a recording’s **More…**, edit up to 2,000 characters of plain-text notes and choose **Save notes**. Unsaved notes stay in this tab through selection, filtering, tab changes and closing/reopening Library. **Save notes** writes the note; **Discard changes** removes the draft. The **unsaved notes · Review** button shows all drafts, including notes for recordings that became unavailable. Those drafts remain available to copy or discard; they are never attached to a different recording by guessing from its date. If saved notes changed in another tab, saving asks before replacing them. A failed save retains the draft. Drafts are temporary: save before refreshing or leaving the site; the browser is asked to warn while drafts remain.

Names and notes survive fuller saves of the same session. Full backups and library bundles carry recording notes and favorite models; import preserves existing local model choices, including explicit unfavorites, and local recording metadata. Ordinary single-session files keep their existing aggregate-data format.

Expand **Select sessions for Compare or export**, then use the row checkboxes or **Select matching** (all matches, including later pages). Selecting a row also opens these controls. The selection count includes recordings hidden by subsequent filtering. **Compare** accepts 2–6 recordings; **Export** downloads every selected recording in one JSON library bundle, including recording titles/notes and the selected models’ favorites. Export checks the current stored values; if a selected entry disappeared or was replaced, refresh and select it again.

**Import to library…** accepts multiple session files and library bundles, up to 10,000 files/recordings and 300 MB in total, subject to this browser’s configured Library limits and temporary space needed for safe updates. Choosing these files is the explicit save action. All files are read and validated before writing; a malformed file prevents the batch from being saved. Compatible duplicates are skipped or updated to fuller copies. Bundles use the existing backup envelope; this import action brings in recordings only, without changing ATH or panel preferences. Use Backup to review a partial backup with omitted recordings. Failed imports attempt to roll back only their own writes and report if recovery is incomplete. Cancelling, navigating away or replacing the replay during file reading invalidates the pending import.

### Model history

Open Library and use **History · count** beside Save file in the Current Live Session card to open the history for the model on the current page. This shortcut shows the saved-recording count and stays tied to the page when replaying a different model. It also works before the first recording is kept, showing the empty-history guidance; directory pages have no page-model shortcut. Alternatively, open a model folder and choose **History overview**. The recording selector and main actions sit above the chart. Each saved recording has a circle for its time-weighted average and a diamond for its peak within retained samples. Choose any audience/tier metric and show all recordings or the latest 10 or 30. Dates and spacing use the **first retained sample**, not the export date, an estimated session start, or evenly paced Replay time. Separate recordings on the same day remain separate; points are not joined across unrecorded time.

The overview shows the recording count, average, peak, token-holder share of registered viewers, covered time and excluded gaps for the selected set. Averages weight the covered intervals across recordings; token share divides token-holder viewer-time by registered-viewer time. Time between separate recordings is not counted as a recording gap. Durations are summed across recordings; overlapping time ranges show an explicit notice because they can count a period more than once. Library deduplication still combines compatible copies of the same session, but conflicting recordings remain distinct.

Select a chart point, a table entry, or a recording from the dropdown. **Summary** opens its detailed statistics; **Replay** keeps the overview open; **Compare with previous** is a main action above the chart. It opens the selected recording as A, followed by its five nearest earlier saved recordings as B–F, or fewer when fewer exist (six total maximum). Earlier recordings come from that model’s complete chronological history, even outside the chart’s Latest 10/30 window. The picker starts collapsed so the comparison chart is immediately available. The hint shows the actual count; the action is disabled only when no earlier saved recording exists for that model. A single-sample or gap-only recording still shows its peak, but has no time-weighted average or token share. Full-session highs are listed separately in the selected recording card and can predate retained history. Overview peaks are not ATH, and the view never writes ATH or adds recordings automatically.

The list shows 50 recordings at a time with **Show more**; the chart and totals include the entire selected set. The metric shares the existing remembered analysis preference; range and recording selection last only while Library is open. **Refresh** checks other tabs' edits, additions, deletions and unreadable records. Unreadable records are excluded with a notice and remain available for recovery from Sessions. **‹ Sessions** returns to the model folder; the Sessions tab also returns to library browsing.

### Summary and comparison

**Compare with previous** on Current Live Session captures the live recording and selects up to five earlier sessions for that model, six total. Saved copies with the same session start are excluded, including after retained-history rollover. This temporary snapshot does not save a Library record. With Follow live on, the matching current session grows with new accepted samples; earlier recordings stay fixed. File replay does not replace the explicitly live comparison. **Refresh live snapshot** in the recording picker captures newer live data explicitly. The button is disabled with an explanation when no earlier sessions are available.

Open **Choose recordings & filters** to find the current/replayed snapshot or a saved recording by model, date, title or notes. Labels show the model once and the recording date/time; a custom title appears only when different from the model name. Summary starts with this picker collapsed to make room for the chart. Summary and Compare retain separate open/closed choices while Library stays open. Existing selections stay in their slots when outside the filters, labeled accordingly. A removed/replaced recording must be reselected, except that an actively followed session can retain its selection through an Auto replacement with verified storage lineage. **Refresh current / replayed snapshot** captures newer data without saving it to the library. The individual **Summary** starts with the selected metric's chart below the controls, matching Compare. The audience overview follows: room audience (registered + anonymous), registered viewers, viewers with tokens and anonymous viewers, each with a time-weighted average, peak within retained history and full-session high. Hover a recording peak for its first recorded time. Audience proportions show token holders as a share of registered viewers and the whole room, plus the anonymous share of the whole room.

Summary defaults to the displayed metric’s time-weighted session average **−25%, average, and +25%**, rounded to whole viewers. Repeated values after rounding are combined. A session without covered recording time has no automatic thresholds. Changing the recording, metric or captured snapshot recalculates the defaults; zoom does not change the session-wide statistics. You can enter up to eight non-negative whole-number thresholds, separated by commas (for example, `25, 50, 100`), then choose **Apply thresholds** or press Enter. **Use average** restores the calculated values. Custom thresholds stay with the same snapshot and metric while Library is open; they do not become defaults for other sessions or later reopenings. Duplicates are removed and the thresholds are sorted. The table shows time at or above each count and its percentage of **covered recording time**. Counts equal to a threshold are included. Detailed statistics for the selected metric follow the overview and threshold table. These thresholds are analysis controls, not live alerts. The selected metric, comparison threshold and **Match shared length** choice are remembered across rooms, Library reopenings and refreshes. Recording selections are not remembered. If saving choices fails, a warning explains that they remain in this tab only; the next choice change retries saving.

Time calculations use original timestamps, not evenly paced Replay time. Each sample's count is held until the next sample; marked gaps and zero-duration intervals contribute no weight. The last sample adds no assumed duration. With no covered interval, averages, proportions and threshold durations are shown as unavailable. A measured zero remains zero. Audience proportions divide the relevant viewer-time totals; a crowded interval contributes more than a quiet interval of the same length. They are not averages of per-sample percentages. A zero denominator is shown as unavailable.

Compare up to six distinct recordings (A–F) on the same elapsed-time axis, starting from each recording's first retained sample. The newest selected recording by first retained date is solid pink; older recordings use distinct colors with dashed lines. The legend marks the latest recording and shows matching line styles. Styling follows recording dates when slots change; equal dates use the first tied slot. Hiding a line does not reassign its style. Use **Add recording** for more slots, or select 2–6 recordings in Library and choose **Compare**. The recordings may belong to one model or several. Duplicate slots must be corrected before a comparison is displayed. Comparison keeps its single threshold control; use **Apply threshold** or press Enter to update it. **Match shared length** restricts all selected recordings to the shortest recording's elapsed span. Turn it off to show their complete retained spans on the longest recording’s axis. Gaps remain blank and are excluded separately for each recording, so check coverage when comparing averages. Full-session highs may predate retained history and are not clipped to the comparison range.


Changing the metric preserves zoom, cursor position, pinning and hidden lines. Applying thresholds updates the statistics without rebuilding the chart or recording selectors. Changing the shared-length setting fits the current window and cursor within the available range. Filters and switching between Summary and Compare retain their separate chart settings while the same recording snapshots remain selected. A different selection or replacement snapshot resets the chart; closing Library clears these chart settings. Statistics still use the complete analysis range, independently of zoom and hidden lines.

Summary and Compare charts now support shared inspection. Move over the chart to see each visible recording's count and original sample timestamp at that elapsed time. Between accepted samples, the table labels a count held until the next sample. Marked gaps and time beyond a recording's last sample show no value. Click or use **Pin** to hold the cursor. With the canvas focused, Left/Right move through sample times, Home/End jump to the visible endpoints, and Escape releases the cursor; other Library Escape handling remains unchanged.

Use **Zoom +/−**, drag a horizontal range, or press +/− with the chart focused. The arrow buttons pan and **Full range** resets zoom. Checkboxes show/hide lines, retaining at least one visible recording. Colors and dash patterns distinguish A–F; hover a legend label for its complete recording name/date. Zoom and hidden lines affect presentation only: statistics and **Match shared length** still use the selected recordings' complete comparison range. With Follow live off, new scans leave the comparison frozen. With it on, only the matching current live session updates; earlier recordings remain fixed. Switching sources, metric or analysis view builds a new chart; the zoom, visibility and cursor state are temporary.

### Follow live (3.21.0)

Summary, Compare and Model History offer **Follow live** for the active session of a confirmed favorite. It defaults on for an eligible source and keeps a separate choice per view until Library closes. Updates follow accepted scans in this tab, independently of the Library save cadence. They do not scan other rooms or save additional records. The status distinguishes a pending Library save from the newer live data being displayed.

Turning Follow live off freezes that view; turning it back on catches up. Summary/Compare update their existing chart so zoom, cursor/pinning, hidden lines, selectors and focus survive. Full range grows; a zoomed range is retained within the available axis. Applied custom thresholds and unfinished edits survive arriving samples; average-derived thresholds recalculate from the latest covered time. Model History updates the current kept session and totals without changing the selected recording or table page. Match shared length retains its existing clipping behavior.

An explicit file-replay source remains fixed even if it belongs to the current room. Reset expires the old binding: select or refresh the new recording and turn Follow live on to follow it. Room navigation closes Library. Removing the favorite or a favorite-setting read failure freezes the display. Existing owner checks continue to reject late acquisition results; Follow live only reads accepted data. Storage failures leave live analysis available and report pending saves.

Current Live Session emphasizes **Compare with previous** with the primary pink border. **Keep in Library** uses a borderless style; neither action moved.

### Backup and restore

**Download backup** includes ATH for every room and saved preferences: theme, panel size/position, collapsed rows, compact metric, chart window, SH/ATH mode and saved analysis choices. Include library recordings by leaving its checkbox selected. Temporary live-session restore records and session-only controls such as scan interval are not included; use Save or Keep in library for recordings you want to retain. Keep backups outside the browser for device changes or reinstallation.

If library entries are unreadable, the normal backup refuses to silently omit them. Select **Back up healthy recordings; omit unreadable entries** to download a clearly named partial backup. It contains healthy recordings, ATH and preferences, plus a list of omitted keys. The originals remain in storage. **Download unreadable records** creates a separate raw JSON recovery file; this is for manual recovery and cannot be restored as a normal backup. If a value cannot be read at all, that file records the error instead of claiming to have exported it.

Choose a backup of up to **300 MB / 10,000 sessions** to validate it and preview its room/preference/recording counts. Select the categories and confirm **Restore selected data**. ATH merges without lowering existing records; new library sessions are added, fuller compatible versions update existing entries, and equal/older copies are skipped. Custom recording names are preserved on updates. A partial backup warns about its omissions in both preview and confirmation; the missing recordings cannot be restored from it. Older backups without analysis choices leave the current choices alone. Older TierScope versions can read backups within their own file/session limits but cannot show the partial-backup omission notice. Only the known saved preferences are accepted. Refresh room tabs when convenient to apply restored preferences; the live session is not replaced or restarted automatically.

Invalid or future formats are rejected before writing. A restore checks available library space before modifying ATH or preferences. If saving fails partway through, it attempts to undo only its own writes. If undoing also fails, it explicitly reports that some changes may remain. Preserve the backup and retry after resolving the storage failure.

### Session save feedback

A failed automatic session save displays **Session not saved** in expanded and compact modes. The live recording card in Library shows the last successful save time or a storage warning. Live tracking continues; keep the tab open and use Save to download the current session. The warning clears after a successful save. ATH retains its separate storage feedback.

A drawing failure shows **Display needs refresh**. A validated sample is already committed before the panel draws, so its counts, history and highs remain available; saving is attempted independently. Drawing retries on the existing one-second display tick without recording the sample again or repeating pulses. Retry waits while Replay is displayed and cannot revive data after Reset or a room change. If saving also fails, **Session not saved** takes priority. This does not extend the 10,000-sample history or three-hour temporary restore window.

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

With API samples, owner records are excluded from the seven color tiers but remain in Registered. The displayed female/trans count can include a matching-gender owner. The female/trans row and its history remain aggregate sample counts; unique-viewer totals are no longer collected or reported.

### Anons-to-registered ratio

The expanded Anons row shows Anons divided by registered viewers between the count and SH/ATH: for example, **0.8x** or **1.2x**. The inclusive **0.95–1.05** range shows **1:1**. Zero registered viewers shows **—**, with an explanatory tooltip. Values use the currently displayed sample, including restored data and ordinary/file Replay, and are independent of the selected high mode.

## TXT and CSV exports

### TXT session summary

**TXT** under a stored recording’s **More…** menu or on the separate replay card downloads a `.txt` summary of that recording’s room, original timing, final retained counts, tier breakdowns, and full-session highs with their real timestamps. It uses the selected recording without borrowing live-room diagnostics. To include the latest live data, keep or update the session first, or open a fresh replay snapshot. Collapsed rows are included; TXT is a summary, not a raw time-series export.

### CSV history

Click **CSV** in Library’s separate replay card or a stored recording’s **More…** actions to download that recording’s **entire retained history**, with one row per sample. Unlike the GIF, this export is not limited to 60 frames. It includes all tiers regardless of which panel rows are collapsed.

The CSV columns are:

| Columns | Meaning |
| --- | --- |
| `room`, `sample_index` | Room name and sample number, starting at 1 within the exported history. |
| `timestamp_utc`, `elapsed_seconds` | Sample timestamp in UTC and seconds since the first retained sample. |
| `room_total`, `registered`, `anonymous`, `with_tokens` | Viewer totals for that sample. |
| `moderators`, `fan_club`, `dark_purple`, `light_purple`, `dark_blue`, `light_blue`, `grey` | The seven tier counts in panel order. |
| `female_trans` | The overlapping female/trans count. |

The file uses comma-separated fields, a header row, and UTF-8 with a byte-order mark for spreadsheet compatibility. Text fields are escaped, and potentially formula-like text is prefixed to prevent spreadsheet formula interpretation. If a spreadsheet opens it in one column, import it as UTF-8 and select a comma delimiter.

CSV contains recorded aggregate counts, not usernames, high-value timestamps, or inferred per-sample acquisition sources. Gap metadata is used for drawing and is not an additional CSV column; the timestamp column retains the actual sample times. Saved history can be exported before a fresh scan. At least one recorded sample is required.

## Saved sessions

Sessions are stored per room through Tampermonkey’s storage API, with a separate record for each tab.

New saves contain aggregate history and session state, without per-viewer username collections. When restoring supported older records, the obsolete `sessionUniqueUsers` and `sessionFemaleTransUsers` fields are ignored. The source records are not rewritten during migration, preserving concurrent tab saves; their existing name fields remain on disk until normal record cleanup or an explicit room Reset. New saves omit these fields. Unsupported or corrupt records remain untouched, and older script versions still running in other tabs can continue writing names.

A compatible record is eligible for restoration if its last save was no more than **three hours ago**. This is a restore window, not a three-hour limit on an active session. Valid expired tab records are cleaned up when that room's storage is inspected, including records left behind by late writes from an old Reset generation. Old-generation records never participate in restoration. Corrupt or unsupported records are preserved rather than automatically deleted.

When several tabs have saved the same room, TierScope restores the record with the newest accepted sample. Ties prefer more retained samples, then the latest save. Histories are not merged. Closing an older tab cannot overwrite another tab's record, and open tabs keep their own in-memory histories.

Reset starts a new storage generation for the room and clears its saved records. Other already-open tabs can continue displaying and collecting local data, but cannot save it back into the reset session. Their footer shows **Local only • room reset** after a save attempt; export TXT/CSV if needed, then refresh to join the new session.

When restored history contains a sample, TierScope displays that sample until a new scan is accepted:

- The header reads **SAVED:** and the footer reads **Saved** with the sample’s age.
- Counts and charts come from saved history; SH comes from saved session-high records and ATH from the room's separate all-time records. They are not treated as a fresh acquisition.
- Trends wait for a fresh sample, avoiding false drops caused by an empty live user list after reload.
- The report labels the figures as **last saved stats**, includes the sample timestamp, and distinguishes them from live acquisition details.
- A failed scan leaves the saved display intact. The first accepted scan replaces it with fresh data and resumes normal trend comparisons.

Manually paused sessions remain paused after restoration. Resume acquisition with **▶** when ready. Automatically paused sessions restore their return checks; recording resumes when the broadcaster is detected again or you select **▶ Resume recording** to override the pause.

History is capped at **10,000 accepted samples**. Older points are discarded when that limit is reached. Replay, GIF, and CSV exports use the retained history. Session-high values and their matching timestamps are stored separately, so tier and total highs survive the removal of older chart samples. Replay highs remain limited to retained samples through the selected frame.

Each saved record is checked independently. Corrupt or unsupported newer-schema records are skipped and preserved without blocking valid records from the same room. If none are usable, tracking starts fresh in a separate record. The TXT report shows the number of skipped records, and the console identifies them and the reason. **Reset** explicitly clears the current room’s saved records, including skipped records; it is not required to restore healthy sibling records. Deleting the script or its manager data can remove saved sessions.

The session's original start is separate from the active tracking timer. Pauses do not move the session start. The TXT report's high offsets use wall time since session start, including pauses; the tracking timer excludes paused time.

On upgrade from older versions, tier/summary highs and their timestamps are rebuilt from matching retained samples. Already-discarded peaks and an exact original start altered by earlier pauses cannot be recovered. The report labels a legacy start as estimated.

## Development and testing

The repository includes a repeatable test suite and a GitHub Actions workflow. See [TESTING.md](TESTING.md) for setup, coverage, and release checks. Tests run during development and add no overhead to the installed userscript. Browser fixtures run in Chromium and Firefox; they do not replace checks of the installed userscript on the live site.

```sh
npm ci
npx playwright install chromium firefox
npm test
```

## Acquisition and dependencies

TierScope depends on Chaturbate’s room data and page structure; changes to either can affect acquisition.

- **Primary source:** same-origin `/api/getchatuserlist/`, with a 10-second timeout.
- **Validation:** malformed or duplicate records reject the sample. Additional count-change checks can reject suspicious changes. Rejected samples add no history point.
- **Fallback:** reads Users if it is already selected. Otherwise it temporarily opens Users only when it can identify and restore the previously selected tab, including a private tab. It does not restore or accept the fallback sample if the user changes tabs during the wait, or the room changes. When selected-tab markers are unavailable or ambiguous, it skips fallback and retains the previous valid data. Fallback attempts are spaced by at least 60 seconds, or the configured scan interval when longer.
- **Freshness:** the last accepted data stays visible through failed attempts. The site’s Users tab and TierScope can refresh at different times.
- **Storage format:** session schema version 2, with an optional `history.breaks` boolean array aligned to sample timestamps. Optional `isStopped`, `stoppedAt`, `stopReason`, `broadcasterAbsence`, `absencePausedAt`, and boolean `absenceOverrideActive` fields retain session closure, absence timing, and manual override. Builds before 3.3.3 ignore `absencePausedAt` and restore an auto-paused session as an ordinary manual pause. Builds before 3.3.5 ignore the override flag and can restart absence automation. Missing optional fields retain their backward-compatible defaults. Tab records are under `tierscope:tab:v2:<room>:<record-id>` and a Reset generation under `tierscope:epoch:v2:<room>`. Compatible legacy records under `tierscope:v1:<room>` are validated and migrated in memory; new saves use version 2. Releases before 3.1.8 do not read this per-tab format. Builds 3.1.8–3.1.14 can restore aggregate history but ignore the optional gap metadata. Row visibility preferences are stored separately under `tierscope:ui:collapsedRows:v1`, position/scale under `tierscope:ui:geometry:v1`, and the theme under `tierscope:ui:theme:v1`.
- **Retry state:** `tierscope:requests:v1:<origin>` stores shared retry timing and access-denial status. It contains no viewer usernames and is separate from room Reset.
- **GIF dependency:** [omggif](https://github.com/deanm/omggif), version 1.0.10, MIT licensed.

The script does not upload TXT reports, CSV files, GIFs, or tracking history to a TierScope server. It makes room-data requests to Chaturbate; GIF encoding uses the bundled encoder without contacting a CDN. Usernames returned by acquisition are used transiently in memory to validate and count the current sample. They are no longer collected into session name lists or written in new saved-session records. The room name remains part of storage keys and exported filenames/CSV rows.

TierScope no longer publishes a `ViewerTracker` API to page scripts. Use the panel controls for Reset and exports; existing panel functionality is unchanged.

## Troubleshooting

**No panel or no scans**

Refresh the room, confirm TierScope and Tampermonkey are enabled, and check userscript permissions. Look for `[TierScope ...]` messages in the browser console. Automatic acquisition is intended for broadcast-room pages.

**Counts look frozen**

Check whether acquisition is paused and whether the last-sample age keeps increasing. The source may not have refreshed, or new samples may be failing validation. DOM fallback has its own cooldown. A failed scan does not mean zero viewers.

**The header says SAVED, or trends are waiting**

TierScope has restored a previous sample and has not yet accepted a fresh one. Check whether automatic acquisition is paused. The saved counts remain visible through failed scans; they are not new live measurements.

**Some rows are missing**

Look for their boxed markers below the header and click to restore them. Moderators, Anons and Room Total are collapsed by default; all other tiers start expanded. Your chosen layout persists across rooms and reloads, and Reset does not clear it.

**The panel shrank after collapsing rows**

This is expected only when all 12 rows are collapsed. Restoring any row brings back the original chart-area height. If it changes size while a row remains open, confirm that only one TierScope version is enabled, refresh the tab, and report the version, browser, and steps that reproduce it.

**The panel is too large or near a screen edge**

Click **100%** to restore standard scale, or use the resize handle. Expanding from compact view should reposition the panel immediately. On a small viewport, reducing the scale may be necessary to fit the whole panel.

**Replay is unavailable, or Play is disabled**

Replay needs a recorded sample for this room. Play needs at least two samples, even if their timestamps match. Check the `PLAYBACK` header if you expected current live counts.

**The step buttons are disabled**

The previous button is disabled at the first sample and the next button at the last. Both are disabled for a single-sample recording.

**No CSV download**

CSV requires at least one recorded sample. Open **Library** and use **CSV** in the separate replay card or a stored recording’s **More…** actions.

**No GIF button**

Open **Library**. GIF is in the separate replay card and in **More…** for stored recordings.

**“GIF encoder missing”**

Reinstall the complete script and refresh the room. The encoder is included in the script, so no CDN request is needed. Developers should run `npm ci` and `npm run build` to regenerate the complete artifact.

**A download does not appear**

Check the browser’s downloads list and any blocked-download notification. Allow the requested download for the room and retry.

**Storage is “Protected / read-only”**

A room-level storage access failure can still make saving read-only. Individual corrupt or unsupported records are skipped instead: healthy history can restore and new records can save. See the TXT report and browser console for details. Skipped records remain untouched unless you explicitly Reset the room.

## Version history



| Version | Notes |
| --- | --- |
| **3.21.0** | Add Follow live to Summary, Compare and Model History for the active session of confirmed favorites; preserve chart controls, frozen views, session identity and independent save feedback. Promote Compare with previous in Current Live Session. |
| **3.20.0** | Match the With Tokens trend border to yellow, add a pink Room Total trend box to the larger four-column bottom row, adjust delta fonts, and show an Anons/registered ratio from the displayed sample with a 5% equality band. |
| **3.19.0** | Add a collapsed Sessions Book with nested Search & sort. Default Moderators/Anons/Room Total to collapsed, preserve saved layouts, and give the model header room beside the resize handle. Start Summary with its picker collapsed and derive thresholds from the displayed session’s time-weighted metric average. |
| **3.18.0** | Default to 1,000 sessions / 50 MB, add local configurable storage limits and capacity notices, preserve prior recordings on failed updates, and support backups/imports through 300 MB / 10,000 sessions with capacity preflight. |
| **3.17.0** | Simplify Current Live Session to Keep in Library, Auto, Compare with previous and History. Keep exports on individual sessions, move file/import/refresh controls below the list, and compare a fixed live snapshot with up to five earlier sessions without including saved copies of the current start. Auto reflects confirmed favorites and locks when enabled. |
| **3.16.1** | Use yellow for With Tokens and pink for Room Total, including charts, counts and collapsed-row borders. Match the compact chart colors and use theme-adjusted shades in bright mode. |
| **3.16.0** | Release the model-focused Library, confirmed automatic keeping for favorites, separate live/replay cards, and streamlined Sessions controls. Add the yellow Room Total row below Anons; default Female/Trans to collapsed while preserving saved layouts. Enlarge the model header and adjacent star and the footer version. Preserve compatible session updates, notes, storage failure recovery and explicit replay imports. |
| **3.15.0** | Release protected tab-local note drafts, preserved chart settings, faster comparison controls and the small footer version label. Preserve the approved beta behavior and existing recording formats. |
| **3.15.0-beta.1** | Protect temporary note drafts with Save/Discard and cross-tab conflict handling; preserve chart interaction through metric/threshold changes; reuse comparison controls and reduced plots; fit a small version label beneath the logo without increasing footer height. |
| **3.14.0** | Release model/date Library filters, favorite models, recording notes and bulk import/export; interactive Summary/Compare charts for up to six recordings; direct page-model history and comparison with up to five earlier recordings. The newest recording is solid pink and older recordings are dashed. Preserve the reviewed beta behavior and explicit saving. |
| **3.14.0-beta.4** | Use longer dashed lines for older recordings, keeping the newest recording solid pink and matching the legend styles. |
| **3.14.0-beta.3** | Add a direct page-model history shortcut, promote history comparison above the chart, and automatically compare the selected recording with up to five earlier recordings from that model. Use solid pink for the newest selected recording and dotted lines for older recordings. |
| **3.14.0-beta.2** | Favorite model folders and all their recordings, preserve model choices across recording changes and imports, migrate beta 1 stars, and remove repeated model names from comparison labels. |
| **3.14.0-beta.1** | Add up-to-six-record comparisons with model/date pickers, shared sample inspection, gap-aware cursor values, zoom/pan and line visibility. Add Library filters/sorting, favorites, notes and explicit bulk import/export with metadata preservation and rollback. |
| **3.13.0** | Release model history overviews inside Library folders, with per-recording average/peak charts, covered-time statistics, token-holder proportions and direct Summary/Replay/Compare actions. Preserve the reviewed beta behavior and existing saved data. |
| **3.13.0-beta.1** | Add model-folder history overviews with per-recording average/peak charts, time-weighted totals, token-holder shares, coverage/gaps, recording windows and Summary/Replay/Compare actions. Preserve live data, ATH, library formats and explicit saving. |
| **3.12.0** | Speed up repeated Library reads with bounded, per-opening reuse of validated records; preserve refresh and cross-tab changes, avoid repeated source-label formatting, and measure large-library performance and memory. |
| **3.11.0** | Retain committed samples through drawing failures and retry presentation independently; add explicit healthy-recording partial backups with omission notices and separate raw recovery downloads; remember analysis metric, thresholds and shared-length choices, including in backups. |
| **3.10.1** | Keep the main panel above Library in both attached and narrow-window sheet layouts, so overlap cannot hide Scope or intercept its controls. Preserve positioning, scale and the sheet breakpoint. |
| **3.10.0** | Give acquisition and panel preferences explicit state owners; eliminate application import cycles; cache immutable chart data for faster long replays. Group timers above Library, Replay and the other actions, keep control positions stable, match button sizes and the pink Library accent, and add an accessible moon–sun theme switch. Preserve saved-data compatibility. |
| **3.9.0** | Release the attached Library, consolidated recording actions and simplified controls. Put the Summary chart first below its controls, followed by the audience overview and statistics. Preserve existing saved recordings and tracking behavior. |
| **3.9.0-beta.1** | Unfold Library beside the panel with matching themes, model folders and responsive docking. Consolidate current/replayed/stored session files and TXT/CSV/GIF exports in Library; keep the chart usable and simplify main controls. |
| **3.8.0** | Give playback protected state and frozen recording snapshots; render supplied display values; separate record storage from session/panel coordination. Enforce ownership and dependency boundaries while preserving controls, appearance and saved-data formats. |
| **3.7.0** | Coordinate live-session sample acceptance, highs, timing and lifecycle operations under one owner. Keep timer cancellation separate from clearing data; preserve valid live samples through failed saves and reject stale responses after Reset, navigation or Stop. |
| **3.6.1** | Release safe diagnostic logging and consistent room targets. Preserve API restrictions through console failures; guard non-room Reset/ATH Clear while retaining file replay actions for its own room. |
| **3.6.1-beta.1** | Prevent console failures from bypassing API access blocks, retry waits, fallback or DOM health handling. Recognize complete room routes consistently; disable non-room Reset and ATH Clear while preserving file replay's own-room actions. |
| **3.6.0** | Release Session tools with model folders, a 500-recording / 25 MB library, safe updates to growing sessions, direct Library and replay Keep controls, time-weighted audience summaries and thresholds, two-recording comparison, validated ATH/preferences/library backup and restore, and visible session-save failures. |
| **3.6.0-beta.3** | Add a Library shortcut to the full Session tools window, direct replay Keep in library, automatic model folders with global search, and safe updates for fuller versions of an existing session. Preserve custom names, fuller recordings, playback/live state and ATH; retain prior snapshots through failed updates/restore. |
| **3.6.0-beta.2** | Raise library capacity to 500 recordings while retaining the 25 MB bound; paginate large lists and search all entries. Add an individual audience overview, explicit token-holder/anonymous proportions, peak-time tooltips and multiple threshold durations/percentages, using real timestamps and excluding gaps. |
| **3.6.0-beta.1** | Add visible session-save failures, an explicit local recording library, validated ATH/preferences/library backups with restore preview and rollback, time-weighted summaries and two-recording comparison. Preserve the main panel; bookmarks and alerts are deferred. |
| **3.5.0** | Release modular sources with a reproducible single-script build, bundled GIF encoding, reliable scan commits, private controls, tab-aware fallback, clearer SH/ATH retention and expanded regression coverage. |
| **3.5.0-beta.2** | Preserve accepted scans through diagnostic/storage errors; bundle the pinned GIF encoder with its license; remove the page control API and unsafeWindow grant; restore the original tab after fallback; explain SH/ATH retention; add tier, navigation and failure regression tests. |
| **3.5.0-beta.1** | Extract feature modules with explicit imports and shared runtime state; build one installable script with esbuild, verify generated output in CI, and check preservation of the 3.4.0 logic and UI. |
| **3.4.0** | Release per-room all-time highs, SH/ATH controls and matching pulses, explicit saved-file Add and confirmed clearing, and direct Save/Open controls in Replay. |
| **3.4.0-beta.3** | Add direct Save and Open buttons to ordinary Replay and FILE REPLAY beside the time display. |
| **3.4.0-beta.2** | Add a direct Add to all-time highs button beside the FILE REPLAY room name, with visible result feedback. |
| **3.4.0-beta.1** | Preview persistent per-room all-time highs, an SH/ATH display switch, explicit Add to all-time highs for saved files, and separate confirmed clearing. |
| 3.3.7 | Smooth ordinary and saved-file Replay with evenly paced samples and animated connections through recording gaps; preserve pause/resume progress and start duplicate-timestamp recordings at their first sample. Counts, highs, timestamps, and saved history remain based on recorded samples. |
| 3.3.6 | Added Save and Open beside Replay in Controls; moved Stop between Pause and Reset. |
| 3.3.5 | One-click Resume overrides automatic absence pause and Stop until a confirmed broadcaster return; override is preserved across refresh and manual Pause/Resume. |
| 3.3.4 | Check for the broadcaster every minute while auto-paused; retain the three-hour auto-pause Stop deadline. |
| 3.3.3 | Auto-pause recording after 15 minutes of broadcaster absence, check for returns every five minutes, resume automatically on return, and Stop after three hours auto-paused. |
| 3.3.2 | Show the saved session’s room name in FILE REPLAY, with long-name truncation and unchanged panel dimensions. |
| 3.3.1 | Add 4h, 2h, and 30min chart windows; keep the order Full / 4h / 2h / 1h / 30min / 15min. |
| 3.3.0 | Download and reopen session files in isolated, read-only Replay; remembered Full / 1h / 15m expanded chart windows; expanded file, rendering, and lifecycle regression tests. |
| 3.2.0 | Orange dashed connectors mark missing intervals in expanded and compact charts, Replay, and GIFs, preserving elapsed-time spacing without adding samples. Gap inspection explains the missing interval; GIFs include a small matching legend. Existing session records remain compatible. |
| 3.1.19 | Manual Stop now asks for confirmation. Cancel preserves the current session; the automatic three-hour Stop remains unattended. |
| 3.1.18 | Definitive Stop and separate-session Start; persisted broadcaster-absence tracking with 2m/5m slowdown and a three-hour Stop; frozen stopped charts, timer, and report state. |
| 3.1.17 | Immediate first scan for new, unpaused room sessions, followed by the normal completion-based countdown; compact scan-settings tooltip. |
| 3.1.16 | Remembered dark/bright mode, with a moon checkbox in the existing Controls row and theme-aware panel surfaces, text, and registered-total chart. |
| 3.1.15 | Timestamp-based charts and sampling gaps; hover and keyboard inspection; reduced dense-history drawing and Replay allocation; shared HTTP retry/access handling; remove session username lists and unique female/trans report totals; Chromium and Firefox regression coverage. |
| 3.1.14 | Two gentle live high-value pulses on expanded rows and collapsed markers, with reduced-motion support. |
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
