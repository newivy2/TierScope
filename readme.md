# TierScope

A Tampermonkey userscript for tracking and analyzing viewer tiers on Chaturbate broadcasts. TierScope provides real-time viewer categorization, session statistics, spike detection, and comprehensive reporting tools for broadcasters who want detailed analytics about their audience composition.

## Features

- **Real-time Tier Tracking**: Automatically categorizes viewers into color-coded tiers (Red, Green, Purple, Grey) based on token holding status
- **Female/Trans Overlay**: Session-persistent tracking of female and trans viewers with gender symbols (♀⚧) displayed in an additive overlay tier
- **Spike Detection**: Identifies sudden viewer count changes with configurable thresholds
- **Session Reports**: Download detailed tracking reports with high watermarks and viewer history
- **Persistent Statistics**: Tracks highs, lows, and averages across the entire broadcast session
- **Draggable UI**: Movable, resizable interface that persists position across page loads

---

## Installation

### Step 1: Install Tampermonkey
First, you need the Tampermonkey browser extension:

**Chrome/Edge/Brave:**
1. Go to [chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Click **"Add to Chrome"**
3. Click **"Add extension"** in the popup

**Firefox:**
1. Go to [addons.mozilla.org/en-US/firefox/addon/tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey)
2. Click **"+ Add to Firefox"**
3. Click **"Add"** in the permission dialog

**Safari:**
1. Install from the [Mac App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089) (Tampermonkey by Jan Biniok)
2. Enable the extension in Safari Preferences → Extensions

### Step 2: Install TierScope
1. Click on the `tierscope.user.js` file in this repository
2. Click the **"Raw"** button (top-right of the code view)
3. Tampermonkey will detect the userscript and show an installation page
4. Click **"Install"** (or "Reinstall" if updating)

### Step 3: Verify Installation
1. Navigate to any Chaturbate broadcast room
2. Look for the TierScope panel in the top-left corner of the page
3. If you see the colored tier bars and viewer counts, installation is complete

---

## Usage

### Basic Operation
- **Auto-scan**: The script automatically scans viewers every few seconds when enabled
- **Manual Refresh**: Click the **REFRESH** button to force an immediate scan
- **Send Report**: Click **SEND** to download a complete session report as a text file

### Understanding the Tiers

| Tier | Color | Description |
|------|-------|-------------|
| Red | 🔴 | High token holders (typically >1000 tokens) |
| Green | 🟢 | Medium token holders |
| Purple | 🟣 | Low token holders |
| Grey | ⚪ | Users with no tokens |
| ♀⚧ | Pink/Blue | Female & Trans viewers (overlay - additive to above tiers) |

### Keyboard Shortcuts
- **Ctrl+Shift+T**: Toggle TierScope visibility
- **Ctrl+Shift+R**: Force refresh scan

### Configuration
Click the **⚙️ Settings** button in the panel to adjust:
- **Scan Interval**: How often to check for new viewers (seconds)
- **Spike Threshold**: Minimum viewer change to trigger spike detection
- **Auto-download**: Automatically save reports at session end
- **UI Position**: Save current panel position as default

### Downloading Reports
Click **SEND** to generate a report containing:
- Session duration and timestamps
- Peak viewer counts per tier
- Complete female/trans viewer list (session-accumulated)
- Spike event log with timestamps
- Raw viewer data for external analysis

---

## Troubleshooting

**Panel not appearing:**
- Refresh the page after installation
- Check that Tampermonkey is enabled (icon in browser toolbar)
- Ensure you're on a broadcast room URL (`chaturbate.com/*/`)

**Incorrect viewer counts:**
- Click REFRESH to force a rescan
- Check that the chat/userlist is loaded (script scans visible DOM elements)
- Some users may not appear until they interact with chat

**Female/Trans overlay not updating:**
- The overlay accumulates across the entire session intentionally
- Users are counted in both their original tier AND the overlay (additive)
- The broadcaster (model) is automatically excluded from tracking

**Report download not working:**
- Check browser download permissions
- Disable popup blockers for chaturbate.com
- Try manual copy/paste from the panel display

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 2.9.8.0 | Current | Fixed broadcaster detection, consolidated tracking keys, CSS fixes |
| 2.9.7.8 | Legacy | Added female/trans overlay tier with gender symbols |
| 2.9.7.6 | Legacy | Gender report tuning |
| 2.9.7.5 | Legacy | Working baseline before overlay features |
| 2.9.7.3 | Legacy | Base reference version |
| 2.9.6.14 | Legacy | Female ticker edition (reference implementation) |

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Disclaimer**: This userscript is for educational and analytical purposes. Use in accordance with Chaturbate's Terms of Service. The authors are not responsible for any account actions resulting from use of this script.