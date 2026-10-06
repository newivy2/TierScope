# Automatic keeping minimum — 3.23.1

TierScope keeps its original interface. Automatic keeping for favorites now requires five minutes of recorded coverage by default.

Open **Library → Sessions → Automatic keeping** below the storage counter. Set **Minimum recorded duration (minutes)** and press **Save automatic keeping**. The default is **5 minutes**, shared by favorite models in this browser. Choose a whole number from 0 to 1,440; 0 restores keeping from the first sample.

The minimum uses retained sample coverage, excluding pauses, marked recording gaps and backward clock changes. Waiting on a paused page does not count. When the minimum is reached, automatic keeping includes the earlier retained samples and then uses the existing checkpoint schedule. Pause, Stop, Reset and leaving or closing a room do not override the minimum.

Manual **Keep in Library** can still save a short session. Existing Library entries are never deleted by this setting. Raising the minimum makes automatic updates wait until coverage qualifies again. Favorite consent and Library storage limits still apply. This preference stays local to the browser and is not restored from a backup.

For your broadcast preparation workflow: enter your favorited page, pause shortly afterward, then Reset when ready. The short preparation session will not be automatically kept unless it already reached the chosen minimum. Reset preserves Pause, so press Resume to continue tracking your stream.

Review checks:
- Confirm a fresh preference shows 5 minutes.
- Create a short favorite session, pause, wait and Reset: no new Library entry.
- Reach five minutes of covered samples: one entry appears with the earlier retained samples.
- Keep a short session manually: it saves normally.
- Set 0 minutes: immediate keeping returns.
