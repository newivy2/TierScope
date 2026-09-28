# TierScope

A Tampermonkey userscript that tracks viewer tiers on a Chaturbate broadcast and shows trends for each tier.

---

![Tracking example 2](Tracking%20example%202.jpg)

---

## Features

- **API-first acquisition**: Uses Chaturbate's `/api/getchatuserlist/` endpoint as the primary data source for accurate, instant counts.
- **Tier tracking**: Counts the color order Chaturbate shows: red, green, purple, pink, dark blue, light blue, gray and anonymous.
- **Trend display**: After the first scan, each tier gets an arrow. Green is up, red is down, a yellow dot is unchanged. The number next to the arrow is the change since the previous scan. Trend comparison can be set to Last, 5m, 15m, 30m, 1h, or Start, with standard auto-escalation as the session grows.
- **Sparklines and highs**: Every tier, the colored-user total, the registered total, and anonymous viewers keep a sparkline and an all-time high for the session.
- **Unique viewers**: The header `U:` count is every distinct registered username seen during the session, not the size of the current list.
- **Female / trans overlay**: ♀⚧ is counted on top of the color tiers. It is not its own color.
- **Session report**: Downloads a text file with highs and when they were hit, the current breakdown, and diagnostic info including the last acquisition source.
- **Reload proof**: Tracking is saved per model for 3 hours using a versioned storage schema. A refresh, navigation away, or closed tab doesn't erase it. Reset starts a new session.
- **Panel**: Draggable, resizable, and collapsible to a small view.

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

- **Pause / play**: The button in the mini view and the one in Controls do the same thing. Pausing stops the timer and the scans. The session stays saved.
- **Timer**: The mini view has − / + and presets (30s, 60s, 2m, 5m).
- **Expand**: The full panel shows one row per tier, then the colored total (💎), registered total (📊), and anonymous count (👻).
- **Trend**: Displays the change since the selected comparison point (Last, 5m, 15m, 30m, 1h, Start). Auto-escalation gradually moves the comparison window as the session ages.
- **Report**: Downloads the session as a text file, including the last accepted acquisition source and API diagnostics when available.
- **Reset**: Clears history, trends, the timer, unique users, and the female / trans list, then starts a new scan. Use this when you want a fresh session.

---

## Architecture

**v3.1.0** introduces an API-first acquisition model:

1. **Primary**: Fetches from `/api/getchatuserlist/` same-origin endpoint. This returns anonymous count, registered users, class/tier data, and gender info without UI manipulation.
2. **Validation**: Samples are validated for consistency (anonymous + registered = total) and sanity-checked against previous samples to prevent reverse-trending artifacts.
3. **Fallback**: If the API fails, times out (10s), or returns invalid data, the script falls back to DOM scanning by briefly opening the USERS tab. Each room waits at least 60 seconds after a fallback before attempting another.
4. **Storage**: Session data is saved with schema version 1 and producer version 3.1.0. Legacy 3.0.x sessions are validated and migrated automatically. Corrupt or newer-schema data is protected from automatic overwrite.

The acquisition status indicator at the bottom of the panel shows the last accepted sample source (API or DOM) and its age in seconds.

---

## Tiers

These are the same classes Chaturbate uses:

| Shown as | Meaning |
|----------|---------|
| Red | Moderator |
| Green | Fan club |
| Purple | Tipped 1000+ tokens in the past 2 weeks |
| Pink | Tipped 250+ |
| Dark blue | Tipped 50+ |
| Light blue | Has bought tokens |
| Gray | Registered, none of the above |
| 👻 Anonymous | In the room total, not in the user list |
| 💎 | Everyone except gray |
| 📊 | Registered users in the list |
| ♀⚧ | Female and trans viewers. Counted again on top of whatever color they already have |

---

## Troubleshooting

**No panel**

- Refresh after installing
- Confirm Tampermonkey is enabled and TierScope is turned on
- You have to be in a broadcast room, not the homepage
- On Chrome / Edge / Brave, confirm **Allow user scripts** is on

**"Tampermonkey requires developer mode"**

- Open `chrome://extensions`
- Turn **Developer mode** on
- Refresh the room

**"DOM fallback" shown frequently**

- The API may be blocked or timing out. Check that you're on `chaturbate.com` (the API is same-origin).
- If the USERS tab itself is unreliable, counts will be delayed until the tab can be scanned.

**Counts look frozen, or every arrow is a yellow dot**

- The user list had not refreshed yet. Set the timer to 60 seconds or slower.
- Confirm the USERS tab can actually open in that room.

**Report did not download**

- Allow downloads for chaturbate.com
- Turn off the popup blocker for that site

---

## Version history

| Version | Status | Notes |
|---------|--------|-------|
| **3.1.0** | **Current** | API-first acquisition with DOM fallback. Storage schema v1 with producer versioning. Reverse-trending bug fixes. Acquisition status indicator. |
| 3.0.7 | Legacy | Trend preset auto-escalation added |
| 3.0.4 | Legacy | Trend presets added |
| 3.0.0 | Legacy | Spike detector removed. Trend arrows compare each scan with the one before it. |
| 2.9.9.3 | Legacy | Visual improvements |
| 2.9.9.2 | Legacy | Window resize bug fixed |
| 2.9.9.1 | Legacy | Persistent storage, control panel, reset, unique viewers |
| 2.9.8.2 | Legacy | Minor fix |
| 2.9.8.1 | Legacy | Anonymous canvas adjustment |
| 2.9.8.0 | Legacy | Broadcaster detection, tracking keys, CSS |
| 2.9.7.8 | Legacy | Female / trans overlay |
| 2.9.7.6 | Legacy | Gender report tuning |
| 2.9.7.5 | Legacy | Baseline before the overlay |
| 2.9.7.3 | Legacy | Base reference |

---

## License

MIT. See [LICENSE](https://github.com/newivy2/TierScope/blob/main/LICENSE).

**Disclaimer**: For educational and analytical use. Follow Chaturbate's Terms of Service. The authors are not responsible for any account action that results from using this script.
