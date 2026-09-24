# TierScope

A Tampermonkey userscript for tracking and analyzing viewer tiers on Chaturbate broadcasts.

---

## Features

- **Real-time Tier Tracking**: Scans the USERS tab at set intervals and automatically categorizes viewers into color-coded tiers (Red, Green, Purple, Pink, Dark Blue, Light Blue, Gray and anons) based on token spending habits and registered account status 
- **Spike Detection**: Identifies sudden viewer count changes
- **Session Reports**: Download detailed tracking reports with high watermarks and peak details and more
- **Persistent Statistics**: Tracks highs an unique users across the entire broadcast session
- **Draggable UI**: Movable, resizable interface

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

### Step 2: Enable "Allow User Scripts" (Chrome/Edge/Brave ONLY)

**This is required for Chrome 138+ and Edge/Brave (Chromium-based browsers).** Firefox and Safari users can skip this step.

**Chrome/Edge/Brave:**
1. Type `chrome://extensions` in your address bar and press Enter
   - (or click menu → Extensions → Manage extensions)
2. Find **Tampermonkey** in the list and click **"Details"**
3. Scroll down and toggle **"Allow user scripts"** to ON (blue/enabled)
4. You may need to refresh any open Chaturbate tabs

**Alternative method:**
- Right-click the Tampermonkey icon in your toolbar → Select **"Manage Extension"** → Toggle **"Allow user scripts"**

**Note:** If you don't see this toggle, your browser may be older than Chrome 138. In that case, enable **Developer Mode** at the top-right of the extensions page instead.

**Firefox:** No additional setting needed - skip to Step 3.

**Safari:** No additional setting needed - skip to Step 3.

**Chrome/Edge users:** You may also need to enable "Developer Mode" in `chrome://extensions` for userscripts to work properly on some sites.


### Step 3: Install TierScope
1. Click on the `tierscope.user.js` file in this repository
2. Click the **"Raw"** button (top-right of the code view)
3. Tampermonkey will detect the userscript and show an installation page
4. Click **"Install"** (or "Reinstall" if updating)

### Step 4: Verify Installation
1. Navigate to any Chaturbate broadcast room
2. Look for the TierScope panel in the top-right corner of the page
3. If you see the colored tier bars and viewer counts, installation is complete

---

## Usage

### Basic Operation
- **Auto-scan**: The script automatically scans viewers every 30 seconds when enabled
- **Adjustments**: Minimize and adjust the timer (spike detection works best at 30s or 60s max)
- **REPORTS**: Click download icon to download a complete session report as a text file
- **Play/Pause**: Click the Play/Pause icon to temporarily pause the scans.
- **Reset**: tracked data survives a reload or even closing and reopening the tab. Use the reset button, completely close the browser, or allow 3 hours of inactivity in order to clear and start a new tracking session.

### Understanding the Tiers

| Tier | Color | Description |
|------|-------|-------------|
| Red | 🔴 | mod |
| Green | 🟢 | fan club |
| Purple | 🟣 | has tipped 1000+ tokens in the past 2 weeks  |
| Pink | 💗 | 250+ |
| Dark Blue | 🔵 | 50+ |
| Light Blue | 💙 | has bought tokens |
| gray | ⚪ | guest |
| ♀⚧ | none | Female & Trans viewers (overlay - additive to above tiers) |

---

## Troubleshooting

**Panel not appearing:**
- Refresh the page after installation
- Check that Tampermonkey is enabled (icon in browser toolbar)
- Ensure you're on a broadcast room URL (`chaturbate.com/*/`)
- **Verify "Allow User Scripts" is enabled** in Tampermonkey Dashboard → Settings

**"Tampermonkey requires developer mode" error:**
- Go to `chrome://extensions` in your browser
- Toggle **"Developer mode"** ON (top-right corner)
- Refresh the Chaturbate page

**Script not running on Chaturbate:**
- Check Tampermonkey Dashboard to ensure TierScope is enabled
- Verify the script shows a green checkmark next to it
- Try reinstalling the script if it appears disabled

**Incorrect viewer counts:**
- Check that the chat/userlist is loaded (script scans visible DOM elements)

**Report download not working:**
- Check browser download permissions
- Disable popup blockers for chaturbate.com
- Try manual copy/paste from the panel display

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 2.9.9.1 | Current | persistent storage, control panel, reset button, Unique viewers tracking |
| 2.9.8.2 | Legacy | minor fix |
| 2.9.8.1 | Legacy | Anon canvas adjustment |
| 2.9.8.0 | Legacy | Fixed broadcaster detection, consolidated tracking keys, CSS fixes |
| 2.9.7.8 | Legacy | Added female/trans overlay tier with gender symbols |
| 2.9.7.6 | Legacy | Gender report tuning |
| 2.9.7.5 | Legacy | Working baseline before overlay features |
| 2.9.7.3 | Legacy | Base reference version |

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Disclaimer**: This userscript is for educational and analytical purposes. Use in accordance with Chaturbate's Terms of Service. The authors are not responsible for any account actions resulting from use of this script.
