# Live models comparison — 3.29.0 beta

Compare the audience charts from rooms being tracked in different TierScope tabs. The comparison uses their existing samples and makes no additional Chaturbate API requests. It works within the same browser profile and TierScope userscript installation.

## Try the beta

1. Install the complete [beta userscript](https://github.com/newivy2/TierScope/blob/beta/live-models-comparison/tierscope.user.js) in place of your existing TierScope script. The installed version and panel footer should both say **3.29.0-beta.1**. Tampermonkey may ask to accept the new storage-change notification permissions.
2. Refresh every room tab that should participate. Older versions do not publish live sources. Keep only one enabled TierScope copy.
3. Open **Library → Compare → Live models** in any TierScope tab, including a directory page. Rooms appear after their tabs initialize. Sources without an accepted sample show **Waiting for first sample**.

Live viewing does not require favorites or automatic keeping. Sessions enter the Library only through the existing manual or confirmed automatic-keeping actions.

## Select models

Up to **12 models** can appear together. Available models with samples are selected initially. Expand **Models being tracked** to review statuses or check models that appear later. The chooser starts folded to give the chart priority. The metric strip switches between Room audience, Registered viewers, Viewers with tokens and the existing tiers.

When one model is open in several tabs, TierScope uses the available session with the **most samples**, without adding or merging their histories. An equal sample count keeps the current source. If the selected tab closes or becomes stale, an available sibling can supply the line. Source colors stay distinct as models are added or removed.

A deliberate Reset or new session in the same tab has a separate identity. Its previous selected snapshot remains marked unavailable; use the source selector in that model's card to choose the replacement session. An old tab from before a room Reset cannot publish its history as current.

## Read the chart

- All models share an axis of actual dates and clock times, including midnight crossings. The comparison does not fold different days onto a 24-hour chart.
- Choose the last **15 minutes**, **hour**, **4 hours**, or **Full sessions**. The initial range is the last hour.
- Each model has a solid, opaque line. Hide individual lines in the legend, inspect samples with the shared cursor, or zoom and pan using the existing chart controls.
- Every line ends at its last accepted sample. Recording gaps stay gaps; a previous count is never extended to the current time to suggest a fresh scan.
- The table reports each displayed snapshot's latest accepted count, timestamp and sample count. It does not total audiences across rooms.

**Freeze comparison** holds the displayed snapshots and inspection state. Source status and sample age continue to update. Change the metric or chart range while frozen, or choose **Resume comparison** to catch up with the latest published samples. Source selection is disabled while frozen.

## Status and recovery

Model cards distinguish Tracking, Paused, Stopped, Waiting for first sample, No connection, Waiting to retry, Reset, Unavailable and Stale/suspended. The age of the last accepted sample is separate from tab presence: a paused tab can be open with an old sample.

Publisher heartbeats run approximately every 30 seconds. After three minutes without a heartbeat a source is marked stale; this can mean a suspended tab, a browser delay or an unclean close. A normal close removes its announcement. **Refresh sources** also discovers tabs when change notifications are unavailable. Directory pages publish no source heartbeat.

If sharing or storage reads fail, the comparison retains previously displayed snapshots and reports the problem. It does not change acquisition, remove recordings, clear retries or initiate scans. Closing Library or leaving the live comparison releases its listeners, polling and chart resources. Browser background-tab throttling and each room's selected scan interval still determine when new samples arrive.

## Implementation

Small per-tab announcements reference the exact existing saved session record, epoch and session identity. Heartbeats update this metadata without serializing the full history. Selected archives are validated, copied, frozen and cached by revision. Discovery reconciles periodically and via optional GM change notifications; it never restores another tab's history into live state.

The feature uses `GM_addValueChangeListener` and `GM_removeValueChangeListener` for change notifications, with polling as a fallback. Only aggregate session data is shared between TierScope tabs. Browser profiles and separate script installations have independent storage.
