# TierScope

TierScope is a free, open-source userscript that charts how a Chaturbate room’s audience changes over time. 

---
**Version 3.4.0** 
---

Version 3.4.0 adds an **SH / ATH** switch to the left of the chart-window menu. Session highs and all-time highs are tracked separately for each room. All-time records survive session Reset and expiry; hover a high to see the exact value and its recorded time. Opening a saved file does not change these records: use **Add to all-time highs** beside the room name in FILE REPLAY or in the chart-window menu to add that file's highs to its own room.

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

- **Reports and exports** — Download CSV data, TXT session summaries, and animated GIFs of your replay.

- **Flexible layout** — Choose compact or expanded views, collapse individual rows, resize and reposition the panel, and adjust its theme and transparency.

- **Session controls** — Pause, resume, stop, or reset tracking. Automatic absence detection reduces scanning when the broadcaster is away.

Session history and all-time records are stored locally through your userscript manager. All-time highs remain separate for each room and survive session resets.

## Installation

Install [Tampermonkey](https://www.tampermonkey.net/), follow Tampermonkey’s [userscript permission instructions](https://www.tampermonkey.net/faq.php?q=Q209) for your browser so installed scripts can run, open [tierscope.user.js](https://raw.githubusercontent.com/newivy2/TierScope/main/tierscope.user.js), and accept the installation. Refresh a Chaturbate room to start tracking.

[Usage and development notes](DEVELOPMENT_NOTES.md) · [Report an issue](https://github.com/newivy2/TierScope/issues)

## Thanks

- **baba_oriley** — API acquisition and Replay mode.
- **checksnmale** — testing and feedback.
- **Dean McNamee** — the omggif encoder.

## License

MIT. See [LICENSE](https://github.com/newivy2/TierScope/blob/main/LICENSE).

For personal use. Not affiliated with Chaturbate.
