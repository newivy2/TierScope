# TierScope

TierScope is a free, open-source userscript that charts how a Chaturbate room’s audience changes over time. 

---
**Beta under review: 3.10.0-beta.1** · [Install beta](https://raw.githubusercontent.com/newivy2/TierScope/beta/state-and-performance/tierscope.user.js)

This beta tightens scan and display-setting ownership, removes circular module imports, speeds up long-recording charts, and keeps the Replay/Library buttons stationary when scan status changes. Features and saved-data formats remain compatible.

**Current stable release: 3.9.0** · [Release notes](https://github.com/newivy2/TierScope/releases/tag/v3.9.0)
---

Open **Library** beside Replay to unfold a matching left-hand page next to the chart. Save or export the current/replayed session, open a saved file, and browse recordings in model folders. Summary, Compare and Backup tabs bring the session tools into the same panel. On small windows, the library becomes a scrollable sheet. A visible warning reports failed session saves. [Build and source guide](BUILDING.md).

The **SH / ATH** switch sits to the left of the chart-window menu. Session highs and all-time highs are tracked separately for each room. All-time records survive session Reset and expiry; hover a high to see the exact value and its recorded time. Opening a saved file does not change these records: use **Add to all-time highs** in Library for the selected recording or in the chart-window menu during FILE REPLAY to add that file's highs to its own room.

![Library unfolding to the left of the TierScope panel](docs/previews/library-book-dark.png)

[Bright-theme preview](docs/previews/library-book-bright.png)

![TierScope in expanded, totals-focused, collapsed, and compact views](tierscope-hero.png)

Charts use periodic room-data samples. Session history is stored locally through your userscript manager, so you can return to a saved session after a refresh. Replay lets you revisit that history while live tracking continues, or reopen a session file you kept for later.

## Who it’s for

- **Broadcasters:** follow audience changes during a broadcast and review the session afterward.
- **Viewers:** follow a favorite room’s audience and learn what the tier colors represent.
- **Moderators and studios:** use the charts and session summaries alongside your own observations when supporting broadcasters.

## Main features

- **Live audience tracking** — Follow viewer tiers, registered and anonymous viewers, viewers with tokens, and the room’s total audience.

- **Session and all-time highs** — Switch between **SH** and **ATH** to compare the current session with previous records for that room. Green highlights and gentle pulses mark counts reaching or breaking the selected high.

- **Interactive charts** — View the full recorded history or focus on a recent time window. Inspect individual samples and see where recording gaps occurred.

- **Smooth replay** — Replay recorded samples at an even pace, including across recording pauses. Play, pause, change speed, scrub through the timeline, or step through individual samples.

- **Saved session files** — Save sessions and reopen them later. Use **Add to all-time highs** to include a saved file’s peaks in that room’s records.

- **Session library** — Choose **Library → Keep in library** from live Controls or Replay. Recordings are organized into model folders. Keeping a fuller version of the same session updates its entry and preserves your custom name. Search, rename, replay, download or delete recordings; the library holds up to 500 recordings / 25 MB.

- **Summaries and comparison** — See audience averages and peaks together, token-holder proportions, coverage and gaps. Choose several thresholds to see time at or above each count and its percentage of covered time. Statistics use real timestamps and exclude recording gaps. Compare two recordings from their first retained samples, optionally matching their shared duration.

- **Backups** — Export ATH for every room and saved preferences, optionally including the library. Restore with a preview and category selection; ATH merges without lowering records.

- **Reports and exports** — Download a session file, CSV data, TXT summary, or animated GIF from Library. Each stored recording has these actions under **More…**, without loading it into replay.

- **Flexible layout** — Choose compact or expanded views, collapse individual rows, resize and reposition the panel, and adjust its theme and transparency.

- **Session controls** — Pause, resume, stop, or reset tracking. Automatic absence detection reduces scanning when the broadcaster is away.

Session history and all-time records are stored locally through your userscript manager. All-time highs remain separate for each room and survive session resets.

## Installation

Install [Tampermonkey](https://www.tampermonkey.net/), follow Tampermonkey’s [userscript permission instructions](https://www.tampermonkey.net/faq.php?q=Q209) for your browser so installed scripts can run, open [the official userscript](https://raw.githubusercontent.com/newivy2/TierScope/main/tierscope.user.js), and accept the installation. Refresh a Chaturbate room to start tracking.

If you used the beta, install from the official link above to follow main releases. Keep only one enabled copy of TierScope.

[Usage and development notes](DEVELOPMENT_NOTES.md) · [Report an issue](https://github.com/newivy2/TierScope/issues)

## Thanks

- **baba_oriley** — API acquisition and Replay mode.
- **checksnmale** — testing and feedback.
- **Dean McNamee** — the omggif encoder.

## License

MIT. See [LICENSE](https://github.com/newivy2/TierScope/blob/main/LICENSE).

For personal use. Not affiliated with Chaturbate.
