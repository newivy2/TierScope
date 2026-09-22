# TierScope - Chaturbate Viewers Visualizer

A Tampermonkey userscript for advanced Chaturbate room analytics with real-time tier tracking, spike detection, and demographic overlays.

![Version](https://img.shields.io/badge/version-2.9.8.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 📊 Tier Tracking
- **7 Color-Coded Tiers**: Red (Mod), Green (Fan Club), Purple (1000+), Pink (250+), Dark Blue (50+), Light Blue (Tokens), Gray (Guest)
- **Real-time Counts** with sparklines showing 10K data points of history
- **All-time highs** with timestamps per tier

### ⚡ Spike Detection
- **Automatic Detection**: Triggers on 2x + 100 anonymous user increases
- **Stabilization Tracking**: Waits for 3 consecutive stable readings before finalizing
- **Detailed Reports**: Per-spike breakdowns with tier composition at start/peak/final

### ♀⚧ Gender Overlay
- **Session-persistent tracking** of female and trans viewers
- **Additive counting** — viewers appear in BOTH their tier AND the overlay
- **Privacy-respecting**: Only tracks logged-in users (not anonymous)

### 📈 Analytics & Reports
- **Downloadable TXT reports** with full session breakdowns
- **Per-spike individual reports** for detailed analysis
- **Tracking timer** showing session duration

### 🎨 Interface
- **Draggable & resizable** panel
- **Minimized/Full view** toggle
- **Auto-refresh** with configurable intervals (30s - 5min)
- **Dark theme** matching Chaturbate's aesthetic

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Firefox/Edge)
2. Click the userscript file → Raw → Tampermonkey will auto-detect
3. Or manually: Dashboard → Utilities → Import from file

## Usage

### Basic Operation
- Navigate to any Chaturbate broadcast room (`/b/username` or `username`)
- Panel auto-appears top-right (minimized on non-room pages)
- Click **Expand** for full tier breakdown
- Click **⏸** to pause auto-refresh

### Downloading Reports
- Click **💾** (download icon) in panel header for full session report
- In spike list, click **💾** on individual spikes for spike-specific reports

### Spike Detection Toggle
- Click **ON/OFF** in spike section to enable/disable detection
- **TRACKING** status shows when a spike is currently being monitored

### Adjusting Refresh Rate
- Use **− / +** buttons or click preset buttons (30s/60s/2m/5m)

## Technical Details

### Data Collection
- **DOM-based scanning** of user list tab (no API calls)
- **Generation-based cleanup** prevents memory leaks during SPA navigation
- **Validation gates** reject unreliable scans (DOM mismatches, sudden drops)

### Privacy
- All data stored in-memory only (no external servers)
- Session data clears on page navigation
- Reports generated locally as downloadable files

### Browser Compatibility
- Chrome/Edge/Firefox with Tampermonkey
- Requires ES6 support (async/arrow functions)

## Changelog

### v2.9.8.0
- Fixed resize handle visibility bug
- Unified female-trans tracking key (removed duplicate)
- Improved broadcaster detection (model name comparison)
- Added gender symbol overlay (♀⚧)

### v2.9.7.x
- Added session-persistent female/trans tracking
- Implemented additive overlay counting
- Spike detection with stabilization logic

## License

MIT License - feel free to fork and modify.