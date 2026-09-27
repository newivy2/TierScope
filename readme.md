# TierScope

A Tampermonkey userscript that tracks viewer tiers on a Chaturbate broadcast and shows whether each tier went up, down, or stayed the same since the last scan.

---

## Features

- **Tier tracking**: Opens the USERS tab on a timer and counts the same color order Chaturbate shows: red, green, purple, pink, dark blue, light blue, gray. Anonymous viewers are the room total minus the names in that list.
- **Trend display**: After the first scan, each tier gets an arrow. Green is up, red is down, a yellow dot is unchanged. The number next to the arrow is the change since the previous scan.
- **Sparklines and highs**: Every tier, the colored-user total, the registered total, and anonymous viewers keep a sparkline and an all-time high for the session.
- **Unique viewers**: The header `U:` count is every distinct registered username seen during the session, not the size of the current list.
- **Female / trans overlay**: ♀⚧ is counted on top of the color tiers. It is not its own color.
- **Session report**: Downloads a text file with highs and when they were hit, the current breakdown, and the female / trans usernames seen this session.
- **Reload proof**: Tracking is saved per model for 3 hours. A refresh, a navigation away, or a closed tab doesn't erase it. Reset starts a new session.
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
- **Trend**: Displays the change since the previous scan.
- **Report**: Downloads the session as a text file.
- **Reset**: Clears history, trends, the timer, unique users, and the female / trans list, then starts a new scan. Use this when you want a fresh session.


---

## Tiers

These are the same classes Chaturbate puts on the user list.

| Shown as | Meaning |
| --- | --- |
| 🔴 Red | Moderator |
| 🟢 Green | Fan club |
| 🟣 Purple | Tipped 1000+ tokens in the past 2 weeks |
| 💗 Pink | Tipped 250+ |
| 🔵 Dark blue | Tipped 50+ |
| 💙 Light blue | Has bought tokens |
| ⚪ Gray | Registered, none of the above |
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

**Counts look frozen, or every arrow is a yellow dot**

- The user list had not refreshed yet. Set the timer to 60 seconds or slower.
- Confirm the USERS tab can actually open in that room.

**Report did not download**

- Allow downloads for chaturbate.com
- Turn off the popup blocker for that site

---

## Version history

| Version | Notes |
| --- | --- |
| 3.0.0 | Current. Spike detector removed. Trend arrows compare each scan with the one before it. |
| 2.9.9.3 | Visual improvements |
| 2.9.9.2 | Window resize bug fixed |
| 2.9.9.1 | Persistent storage, control panel, reset, unique viewers |
| 2.9.8.2 | Minor fix |
| 2.9.8.1 | Anonymous canvas adjustment |
| 2.9.8.0 | Broadcaster detection, tracking keys, CSS |
| 2.9.7.8 | Female / trans overlay |
| 2.9.7.6 | Gender report tuning |
| 2.9.7.5 | Baseline before the overlay |
| 2.9.7.3 | Base reference |

---

## License

MIT. See [LICENSE](LICENSE).

**Disclaimer**: For educational and analytical use. Follow Chaturbate's Terms of Service. The authors are not responsible for any account action that results from using this script.
