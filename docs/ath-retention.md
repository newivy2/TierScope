# ATH cleanup (review beta)

In **Charts & highs**, **Clear Room ATH…** clears the displayed room's records, including the file's room during file Replay. **Clear inactive ATH (90 days)…** previews rooms not visited in more than 90 days. Its confirmation states how many rooms qualify. If none qualify, it shows a message without opening a confirmation.

Cleanup is manual. ATH otherwise remain stored until cleared. It removes only qualifying all-time highs, preserving Library sessions, session highs, favorites and preferences. Clearing a favorite's ATH does not unfavorite that model.

The cutoff uses room visits, not the dates when highs were set. Opening an actual broadcast room counts as a visit, even while tracking is paused or stopped. TierScope updates activity once a minute while that room remains open. Home/directory pages and opening another room's saved file do not count as visits to that recorded room. Each tab has its own activity marker; closing or navigating away releases that tab's marker. An abandoned marker expires after five minutes, but its last activity time still contributes to the 90-day cutoff.

**Existing records receive a full 90-day grace period** when this version first finds them. This is saved once and is not restarted on refresh. Records without readable visit metadata are protected. Newly encountered imported/restored ATH receive a fresh grace period when their metadata is initialized; backups do not transfer room visit/activity metadata.

After confirmation, cleanup checks each room again. A fresh visit, a concurrent change or an unreadable record makes it skip that room. Cleanup verifies a safety copy before removing snapshots, so failed storage operations preserve records rather than treating a failed clear as success. Counts report cleared, changed/skipped and failed rooms. Storage across tabs is not a single atomic transaction; this uses generation markers, independent tab activity and repeated checks.

Small visit and generation markers remain after cleanup. They prevent outdated snapshots from restoring retired highs and avoid restarting an old room's grace period. This is a cleanup of ATH values, not a promise to remove every storage key for a room. Future accepted scans or an explicit **Add to ATH** can establish new records.
