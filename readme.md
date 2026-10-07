# TierScope

TierScope is a free, open-source userscript that charts how a Chaturbate room’s audience changes over time.

## Installation

Install [Tampermonkey](https://www.tampermonkey.net/), follow Tampermonkey’s [userscript permission instructions](https://www.tampermonkey.net/faq.php?q=Q209) for your browser so installed scripts can run, open [the official userscript](https://raw.githubusercontent.com/newivy2/TierScope/main/tierscope.user.js), and accept the installation. Refresh a Chaturbate room to start tracking.

If you used the beta, install from the official link above to follow main releases. Keep only one enabled copy of TierScope.

**Current release: 3.25.0** · [Release notes](https://github.com/newivy2/TierScope/releases/tag/v3.25.0)

## Main features

- **Live tracking and replay** — Follow viewer tiers and totals, inspect and zoom charts, and replay live or saved sessions.
- **Session library** — Organize sessions by model, choose favorites and automatically keep their sessions while tracking.
- **Summaries and comparisons** — Review statistics, compare up to twelve sessions by elapsed or clock time, and explore a model’s history.
- **Reports and exports** — Download CSV data, TXT reports, animated GIFs or session files you can reopen later.
- **Session and all-time highs** — Track each room’s audience records, with highlights when counts reach or break a high.
- **Backup and restore** — Back up your library, records and preferences, and choose your library’s storage limits.

Data is stored locally through your userscript manager. For controls and detailed behavior, see the [usage and development notes](DEVELOPMENT_NOTES.md).

## A flexible interface

Show all tiers, focus on totals or choose your own mix. Move and resize the panel, collapse rows, switch between dark and bright themes, and adjust background transparency. Open Library beside the panel to browse sessions and analyze charts.

![TierScope overview: all tiers, totals-focused and custom layouts, plus session comparisons](tierscope-hero.png)

*Illustrative overview based on screenshots; model names anonymized.*

## Who it’s for

- **Broadcasters:** follow audience changes during a broadcast and review the session afterward.
- **Viewers:** follow a favorite room’s audience and learn what the tier colors represent.
- **Moderators and studios:** review audience trends and session comparisons alongside your own observations.

## Thanks

- **baba_oriley** — API acquisition and Replay mode.
- **checksnmale** — testing and feedback.
- **Dean McNamee** — the omggif encoder.

## License

MIT. See [LICENSE](LICENSE).

For personal use. Not affiliated with Chaturbate.

[Report an issue](https://github.com/newivy2/TierScope/issues) · [Build and source guide](BUILDING.md)
