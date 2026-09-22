# TierScope

A Tampermonkey userscript for tracking and analyzing viewer tiers on Chaturbate broadcasts.

---

## Features

- **Real-time Tier Tracking**: Automatically categorizes viewers into color-coded tiers (Red, Green, Purple, Pink, Dark Blue, Light Blue, Gray and anons) based on token holding/registered account status 
- **Spike Detection**: Identifies sudden viewer count changes
- **Session Reports**: Download detailed tracking reports with high watermarks and peak details
- **Persistent Statistics**: Tracks highs across the entire broadcast session
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

### Step 2: Enable User Scripts (IMPORTANT)
After installing Tampermonkey, you must enable the "Allow User Scripts" setting:

1. Click the **Tampermonkey icon** in your browser toolbar
2. Select **"Dashboard"** from the dropdown menu
3. Click the **Settings tab** (gear icon)
4. Scroll down to **"Security & Privacy"** section
5. Set **"Allow User Scripts"** to **"Allow"** (or check the box)
6. Click **"Save"** at the bottom

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
- **Adjustments**: Minimize and adjust the timer (might prevent the detector from detecting)
- **REPORTS**: Click download icon to download a complete session report as a text file

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
| 2.9.8.2 | Current | minor fix |
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