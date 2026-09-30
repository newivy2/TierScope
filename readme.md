# TierScope

A Tampermonkey userscript that tracks viewer tiers on a Chaturbate broadcast and shows how each tier is moving.
---

## Features


* **Tier tracking**: Counts the color order Chaturbate shows: red, green, dark purple, light purple, dark blue, light blue, grey, plus anonymous.
* **Trend display**: After the second scan, each tier gets a color. Green is up, red is down, yellow is unchanged. The number inside each tier is the change since the selected point. Comparison can be Last, 5m, 15m, 30m, 1h, or Start. Auto-escalation moves that window as the session grows, and it stops at 1h.
* **Sparklines and highs**: Every tier, the colored-user total, the registered total, and anonymous viewers keep a sparkline and a session high.
* **Session-high highlight**: A row turns light green while its count is above zero and equal to the session high. A dip clears it. Returning to that same high turns it green again.
* **Female / trans overlay**: ♀⚧ is counted on top of the color tiers. It is not its own color.
* **Replay**: Plays the history already saved for this room. Counts, highs, and sparklines follow the replay cursor. Live scanning keeps running and is not written into the replay you started.
* **Session report**: Downloads a text file with highs and when they were hit, the current breakdown, and the last acquisition source.
* **Reload proof**: Tracking is saved per model for 3 hours. A refresh, a move to another page, or a closed tab does not erase it. Reset starts a new session.
* **Panel**: Draggable, resizable, and collapsible to a small view.

---

## Installation

### Step 1: Install Tampermonkey

**Chrome / Edge / Brave:**

1. Go to [Tampermonkey on the Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Click **Add to Chrome**
3. Click **Add extension**

**Firefox:**

1. Go to [Tampermonkey on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey)
2. Click **Add to Firefox**
3. Click **Add**

**Safari:**

1. Install [Tampermonkey from the Mac App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)
2. Enable it in Safari Settings, then Extensions

### Step 2: Allow user scripts (Chrome / Edge / Brave only)

Required on Chrome 138+ and current Edge / Brave. Firefox and Safari can skip this.

1. Open `chrome://extensions`
2. Open **Details** on Tampermonkey
3. Turn **Allow user scripts** on
4. Refresh any open Chaturbate tab

If that toggle is missing, turn **Developer mode** on at the top of the extensions page instead.

### Step 3: Install TierScope

1. Open [tierscope.user.js](https://github.com/newivy2/TierScope/blob/main/tierscope.user.js)
2. Click **Raw**
3. Tampermonkey opens an install page
4. Click **Install**

### Step 4: Check it

Open a broadcast room. The panel sits at the top right. A room total in the header means it is running.

---

## Usage

The default scan is **60 seconds**. Chaturbate does not always refresh the user list faster than that.

* **Pause / play**: The button in the mini view and the one in Controls do the same thing. Pausing stops the timer and the scans. The session stays saved.
* **Timer**: The mini view has − / + and presets (30s, 60s, 2m, 5m).
* **Expand**: The full panel shows one row per tier, then the colored total (💎), registered total (📊), and anonymous count (👻).
* **Session high**: A light green row means that count is at its high for this session, and the count is above zero. 
* **Trend**: Displays the change since the selected comparison point (Last, 5m, 15m, 30m, 1h, Start). Clicking a preset turns auto-escalation off. AUTO turns it back on.
* **Replay**: In Controls, **Replay** plays the history saved for this room. The header switches to `PLAYBACK`. Pause, the scrubber, and 0.5× / 1× / 2× control only the replay. Recorded time runs at 60×, and a long session is capped at 30 seconds. One saved scan has no span to play, so Play stays off and that point is shown. Samples that arrive while you are watching are kept for the live session, not added to this replay. **Return to Live** paints the current session again. Minimize is locked until you return.
* **Report**: Downloads the session as a text file. Highs, the current breakdown, and the ♀⚧ totals are included.
* **Reset**: Clears history, trends, the timer, and the female / trans totals, then starts a new scan. Replay stops if it was running.

The line at the bottom of the panel shows the last accepted sample: `API` or `DOM`, and how many seconds ago it was accepted.

---

## Architecture

Normal acquisition uses the same-origin `/api/getchatuserlist/` API.

1. **Primary**: The response is the anonymous count, then one record per named user (`username|class|gender|flag`). Anonymous plus named records is the room total.
2. **Validation**: A bad record rejects the whole sample. Rejected samples do not add a history point, and the last good counts stay on screen.
3. **Fallback**: If the API fails, times out (10 seconds), or returns nothing usable, the script falls back to reading the Users tab. Each room waits at least 60 seconds after a fallback before another one is attempted. API retries keep their own cadence.
4. **Storage**: Session data is saved under `tierscope:v1:<room>` with schema version 1. Legacy 3.0 sessions load when they pass validation and gain the current metadata on the next successful save. Corrupt or newer-schema records are kept and are not overwritten until you Reset.
5. **Replay**: Replay copies the history at the moment you click it. That copy is presentation only. It does not replace the live users, the saved session, or the scan timer.

The broadcaster is not one of the seven color tiers. Registered can be higher than the sum of those colors for that reason.

---

## Tiers

These follow the classes Chaturbate shows in the Users tab:

| Shown as | Meaning |
| --- | --- |
| Red | Moderator |
| Green | Fan club |
| Dark purple | Tipped 1000+ tokens in the past 2 weeks |
| Light purple | Tipped 250+ |
| Dark blue | Tipped 50+ |
| Light blue | Has bought tokens |
| Grey | Registered, none of the above |
| 👻 Anonymous | In the room total, not in the named list |
| 💎 | Everyone in a color tier. Grey is not included |
| 📊 | Named users in the list, including the broadcaster |
| ♀⚧ | Female and trans viewers, counted again on top of whatever color they already have |

---

## Troubleshooting

**No panel**

* Refresh after installing
* Confirm Tampermonkey is enabled and TierScope is turned on
* You have to be in a broadcast room, not the homepage
* On Chrome / Edge / Brave, confirm **Allow user scripts** is on

**"Tampermonkey requires developer mode"**

* Open `chrome://extensions`
* Turn **Developer mode** on
* Refresh the room

**The status line stays on DOM, or scans say the fallback was skipped**

* The API call failed or was invalid, and the room is still inside the 60-second fallback wait.
* You need to be on `chaturbate.com`. The request is same-origin.
* Counts stay on the last accepted sample until a new one is accepted.

**Counts look frozen, or every arrow is a yellow dot**

* The list had not changed yet. Keep the timer at 60 seconds or slower.
* The first scan has nothing to compare with. Arrows start on the second accepted sample.
* Changing the trend preset before enough time has passed compares against the earliest sample the session actually has.

**Replay does nothing, or Play is disabled**

* Replay needs at least one saved sample for this room.
* Play needs two samples with time between them. A single point is shown, not played.
* Return to Live if the header still says `PLAYBACK` and you expected the live numbers.

**Report did not download**

* Allow downloads for `chaturbate.com`
* Turn off the popup blocker for that site

---

## Version history

| Version | Status | Notes |
| --- | --- | --- |
| **3.1.1.3** | **Current** | Trend Display visual update - Arrows are gone. Each tier lights up green, red or yellow |
| 3.1.1.2 | Legacy| Session-high highlights now also show in the replay mode |
| 3.1.1.1 | Legacy | Session-high highlight. A row is light green while its count is above zero and at the session high, including a return to that high after a dip |
| 3.1.1.0 | Legacy | Replay added. Replay copies the saved history and does not stop live scanning. Unique-viewer count removed from the header and the report |
| 3.1.0 | Legacy | API-first acquisition with DOM fallback. Storage schema v1. Acquisition status line. |
| 3.0.7 | Legacy | Trend preset auto-escalation. |
| 3.0.4 | Legacy | Trend presets: Last, 5m, 15m, 30m, 1h, Start. |
| 3.0.0 | Legacy | Spike detector removed. Trend arrows compare each scan with the one before it. |
| 2.9.9.3 | Legacy | Visual improvements. |
| 2.9.9.2 | Legacy | Window resize bug fixed. |
| 2.9.9.1 | Legacy | Persistent storage, control panel, reset, unique viewers. |
| 2.9.8.2 | Legacy | Minor fix. |
| 2.9.8.1 | Legacy | Anonymous canvas adjustment. |
| 2.9.8.0 | Legacy | Broadcaster detection, tracking keys, CSS. |
| 2.9.7.3 | Legacy | Base reference. |

---

## Thanks to

- **Andrew Weed** — for the API acquisition and Replay mode.
- **checksnmale** - testing and feedback

---

## License

MIT. See [LICENSE](https://github.com/newivy2/TierScope/blob/main/LICENSE).

**Disclaimer**: For personal use while you broadcast or watch a room. Not affiliated with Chaturbate.
