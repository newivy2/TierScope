import { selectScanInterval } from './acquisition-state.js';
import { hideChartTooltip } from './chart-view.js';
import { bindPanelOptions } from './files.js';
import { changeModelFavorite } from './favorite-controls.js';
import { paintFavoriteButton } from './favorite-view.js';
import { readModelFavorite } from './library-models.js';
import { cancelGifExport } from './gif.js';
import { bindRowControls, cleanupDragListeners, restoreStandardSize, setupDraggable, setupResizable, setupResizeHandler, toggleView } from './layout.js';
import { adjustTimer, resetAllTracking, resetCountdown, startCountdown, stopCountdown, stopTracking, toggleAutoRefresh, updateCountdownDisplay, updateStopControls } from './lifecycle.js';
import { cycleMiniMetric, selectAutomaticTrends, selectPanelTheme } from './panel-preferences.js';
import { updateDisplay } from './presentation.js';
import { bindPlaybackControls, leavePlayback, updateReplayAvailability } from './replay.js';
import { collapseMarkerHtml, collapsedTrayHtml } from './row-layout.js';
import { runtime } from './runtime.js';
import { updateSessionToolsStatus } from './session-tools.js';
import { applyPanelTheme, updateContainerOpacity } from './theme.js';
import { setTrendComparisonMode, toggleAutoTrendEscalation, updateAutoTrendButton, updateTrendPresetButtons } from './trends.js';
import { log } from './utils.js';

export function createPanel() {
    if (runtime.panelOptionsCleanup) { runtime.panelOptionsCleanup(); runtime.panelOptionsCleanup = null; }
    hideChartTooltip();
    cancelGifExport();
    leavePlayback(false);
    cleanupDragListeners();
    if (runtime.miniSettingsKeyHandler) {
        document.removeEventListener('keydown', runtime.miniSettingsKeyHandler, true);
        runtime.miniSettingsKeyHandler = null;
    }
    if (runtime.windowResizeHandler) {
        window.removeEventListener('resize', runtime.windowResizeHandler);
        runtime.windowResizeHandler = null;
    }
    if (window._trackerResizeCleanup) {
        window._trackerResizeCleanup();
        window._trackerResizeCleanup = null;
    }
    var existing = document.getElementById('cb-tier-tracker');
    if (existing) existing.remove();

    var div = document.createElement('div');
    div.id = 'cb-tier-tracker';

    var html =
        '<div id="tracker-container" style="' +
            'position:fixed;top:80px;right:20px;background:rgba(20,20,30,0.95);color:var(--panel-text);padding:5px;' +
            'border-radius:6px;font-family:Arial,sans-serif;font-size:9px;z-index:999999;width:' + runtime.BASE_WIDTH_MINI + 'px;' +
            'border:1px solid #ff69b4;transition:width 0.3s ease;cursor:default;user-select:none;' +
        '">' +
            '<div id="drag-handle" style="' +
                'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;' +
                'border-bottom:1px solid #ff69b4;padding-bottom:3px;cursor:move;' +
            '">' +
                '<div id="header-model" style="display:flex;flex:1;min-width:0;align-items:center;gap:3px;margin-left:14px;margin-right:4px;">' +
                    '<span id="header-text" style="flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;color:var(--panel-accent);font-size:13px;line-height:18px;">TierScope</span>' +
                    '<button type="button" id="btn-model-favorite" aria-label="Favorite model" style="flex:0 0 18px;padding:0;border:0;background:transparent;color:var(--panel-muted);font-size:14px;line-height:18px;cursor:pointer;">☆</button>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">' +
                    '<button type="button" id="btn-high-mode" aria-pressed="false" aria-label="Session highs. Switch to all-time highs" style="display:none;min-width:29px;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">SH</button>' +
                    '<button type="button" id="btn-panel-options" aria-label="Chart window and highs" aria-expanded="false" aria-controls="panel-options" style="display:none;background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;white-space:nowrap;">Full ▾</button>' +
                    '<button type="button" id="btn-standard-size" title="Restore standard panel size (100%)" aria-label="Restore standard panel size" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:8px;padding:1px 3px;">100%</button>' +
                    '<button id="btn-toggle" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-text);border-radius:3px;cursor:pointer;font-size:9px;padding:1px 4px;flex-shrink:0;">+</button>' +
                '</div>' +
            '</div>' +

            '<div id="panel-options" role="group" aria-label="Chart and high options" style="display:none;position:absolute;right:5px;top:29px;width:190px;max-width:calc(100% - 10px);box-sizing:border-box;z-index:5;padding:8px;background:var(--panel-solid);color:var(--panel-text);border:1px solid #ff69b4;border-radius:4px;font-size:11px;box-shadow:0 3px 12px #0008;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;"><strong>Charts &amp; highs</strong><button type="button" id="panel-options-close" aria-label="Close chart and high options" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;">×</button></div>' +
                '<label for="chart-window-select">Chart window</label>' +
                '<select id="chart-window-select" style="display:block;width:100%;margin:4px 0 6px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);font-size:11px;"><option value="full">Full history</option><option value="fourHours">Last 4 hours</option><option value="twoHours">Last 2 hours</option><option value="hour">Last hour</option><option value="halfHour">Last 30 minutes</option><option value="quarter">Last 15 minutes</option></select>' +
                '<div style="font-size:10px;color:var(--panel-muted);line-height:1.4;margin-bottom:8px;">Charts only. Downloads keep the full retained history.</div>' +
                '<input type="file" id="session-file-input" accept=".json,application/json" style="display:none;">' +
                '<div id="session-file-info" style="display:none;margin-top:7px;font-size:10px;line-height:1.4;white-space:pre-line;overflow-wrap:anywhere;color:var(--panel-secondary);"></div>' +
                '<div style="border-top:1px solid var(--panel-divider);margin-top:8px;padding-top:6px;"><strong>All-time highs</strong>' +
                    '<div id="all-time-info" style="font-size:10px;line-height:1.4;margin:4px 0;color:var(--panel-secondary);"></div>' +
                    '<button type="button" id="btn-add-all-time" style="display:none;width:100%;margin:4px 0;padding:4px;background:#4169E1;color:#fff;border:0;border-radius:3px;cursor:pointer;">Add to all-time highs</button>' +
                    '<button type="button" id="btn-clear-all-time" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;">Clear Room ATH…</button>' +
                    '<button type="button" id="btn-clear-inactive-ath" style="display:block;width:100%;margin:4px 0;padding:4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;" title="Preview and clear ATH for rooms not visited in over 90 days">Clear inactive ATH (90 days)…</button>' +
                    '<div id="all-time-action-status" role="status" style="font-size:10px;line-height:1.4;overflow-wrap:anywhere;color:var(--panel-secondary);"></div>' +
                '</div>' +
            '</div>' +
            '<div id="minimized-view" style="display:block;position:relative;">' +
                '<div style="display:flex;gap:4px;align-items:center;margin-bottom:3px;"><strong id="mini-room-count" style="color:var(--panel-accent);font-size:13px;">0</strong><span style="color:var(--panel-muted);font-size:8px;">in room</span><span id="mini-room-change" style="margin-left:auto;font-size:8px;"></span></div>' +
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:3px;">' +
                    '<button type="button" id="mini-metric" style="background:transparent;border:0;color:var(--panel-secondary);font:inherit;cursor:pointer;padding:2px 0;" aria-label="Cycle chart metric">Room total ▾</button>' +
                    '<button type="button" id="mini-high" style="background:transparent;border:0;padding:0;color:var(--panel-subtle);font-size:8px;cursor:pointer;"></button>' +
                '</div>' +
                '<canvas id="mini-chart" width="140" height="36" style="display:block;width:100%;height:36px;" role="img" aria-label="Recent audience history"></canvas>' +
                '<div style="display:flex;justify-content:space-between;gap:4px;margin:3px 0;">' +
                    '<span title="With Tokens">💎 <span id="mini-withtokens" style="color:var(--panel-warning);">0</span> <span id="mini-withtokens-change"></span></span>' +
                    '<span title="Registered">📊 <span id="mini-total">0</span> <span id="mini-total-change"></span></span>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:3px;">' +
                    '<span id="mini-freshness" style="flex:1;min-width:0;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">No sample</span>' +
                    '<button type="button" id="btn-auto" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" title="Pause or resume scans">⏸</button>' +
                    '<button type="button" id="mini-settings-toggle" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;cursor:pointer;" aria-label="Scan interval settings" title="Scan interval settings — adjust how often TierScope scans" aria-expanded="false" aria-controls="mini-settings">◷</button>' +
                    '<button type="button" id="btn-expand" style="background:var(--panel-button);border:0;color:var(--panel-text);border-radius:3px;font-size:9px;cursor:pointer;" title="Expand panel" aria-label="Expand panel">↗</button>' +
                '</div>' +
                '<div id="mini-settings" style="display:none;position:absolute;left:0;right:0;top:17px;background:var(--panel-settings);border:1px solid #ff69b4;border-radius:4px;padding:5px;z-index:2;" role="group" aria-label="Scan interval">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--panel-secondary);">Scan interval <button type="button" id="mini-settings-close" aria-label="Close scan interval settings" title="Close (Escape)" style="background:var(--panel-button);color:var(--panel-text);border:0;border-radius:3px;cursor:pointer;padding:1px 5px;font-size:13px;">×</button></div>' +
                '<div style="display:flex;align-items:center;justify-content:center;gap:3px;margin:3px 0;padding:2px;background:rgba(var(--panel-row-rgb),0.05);border-radius:3px;">' +
                    '<button id="btn-timer-down" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">−</button>' +
                    '<span id="timer-display" style="font-size:11px;color:var(--panel-warning);font-weight:bold;min-width:28px;">60s</span>' +
                    '<button id="btn-timer-up" style="background:var(--panel-button-strong);border:none;color:var(--panel-text);border-radius:2px;cursor:pointer;font-size:9px;padding:1px 4px;font-weight:bold;">+</button>' +
                '</div>' +

                '<div style="display:flex;gap:2px;justify-content:center;margin-top:3px;">' +
                    '<button class="timer-preset" data-time="30" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">30s</button>' +
                    '<button class="timer-preset" data-time="60" style="background:#ff69b4;border:1px solid #ff69b4;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">60s</button>' +
                    '<button class="timer-preset" data-time="120" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">2m</button>' +
                    '<button class="timer-preset" data-time="300" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 3px;">5m</button>' +
                '</div>' +

                    '<div id="auto-status" style="margin-top:3px;font-size:8px;color:var(--panel-muted);">Starting...</div>' +
                '</div>' +
            '</div>' +

            '<div id="full-view" style="display:none;">' +
            '<div id="tier-chart-region" style="display:flow-root;">' + collapsedTrayHtml();

    Object.keys(runtime.TIERS).forEach(function(key) {
        var t = runtime.TIERS[key];
        html +=
            '<div id="tier-row-' + key + '" data-tier="' + key + '" style="display:flex;align-items:center;padding:1px 3px;margin:1px 0;background:rgba(var(--panel-row-rgb),calc(0.05 * var(--tier-background-scale, 1)));border-radius:3px;border-left:3px solid ' + t.color + ';">' +
                '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                    collapseMarkerHtml(key) +
                '</div>' +
                '<canvas id="spark-' + key + '" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                    '<span id="count-' + key + '" style="font-weight:bold;color:' + t.color + ';font-size:14px;">0</span>' +
                    '<div id="high-' + key + '" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div>' +
                '</div>' +
            '</div>';
    });

    html +=
            '<div id="summary-tier-rows" style="border-top:1px solid var(--panel-divider);margin-top:4px;padding-top:4px;">' +
                '<div id="tier-row-withtokens" data-tier="withtokens" style="display:flex;align-items:center;padding:2px 3px;background:rgba(255,212,59,0.15);border-radius:3px;border:1px solid var(--panel-warning);margin-bottom:3px;">' +
                    '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                        collapseMarkerHtml('withtokens') +
                    '</div>' +
                    '<canvas id="spark-withtokens" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                    '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                        '<span id="count-withtokens" style="font-weight:bold;color:var(--panel-warning);font-size:14px;">0</span>' +
                        '<span id="pct-withtokens" style="font-size:8px;color:var(--panel-warning);margin-left:2px;">0%</span>' +
                        '<div id="high-withtokens" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div>' +
                    '</div>' +
                '</div>' +
                '<div id="tier-row-total" data-tier="total" style="display:flex;align-items:center;padding:2px 3px;background:rgba(var(--panel-row-rgb),0.1);border-radius:3px;">' +
                    '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                        collapseMarkerHtml('total') +
                    '</div>' +
                    '<canvas id="spark-total" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                    '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                        '<span id="count-total" style="font-weight:bold;color:var(--panel-text);font-size:14px;">0</span>' +
                        '<div id="high-total" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div id="tier-row-anon" data-tier="anonymous" style="margin-top:5px;padding:5px;background:rgba(136,136,136,0.15);border-radius:3px;border:1px solid #888;">' +
                '<div style="display:flex;align-items:center;">' +
                    '<div style="width:30px;flex-shrink:0;text-align:center;">' +
                        collapseMarkerHtml('anon') +
                    '</div>' +
                    '<canvas id="spark-anon" width="105" height="50" style="flex:1;margin:0 4px;"></canvas>' +
                    '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                        '<span id="anon-ratio-full" style="font-size:13px;font-weight:bold;color:#ff69b4;">--</span>' +
                        '<div id="anon-registered-ratio" role="img" aria-label="Anons / registered viewers: unavailable" style="font-size:9px;line-height:12px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">—</div>' +
                        '<div id="high-anon" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div id="tier-row-roomTotal" data-tier="roomTotal" style="display:flex;align-items:center;padding:2px 3px;margin-top:3px;border:1px solid var(--panel-accent);border-radius:3px;background:rgba(255,105,180,.08);">' +
                '<div style="width:30px;flex-shrink:0;text-align:center;">' + collapseMarkerHtml('roomTotal') + '</div>' +
                '<canvas id="spark-roomTotal" width="105" height="28" style="flex:1;margin:0 4px;"></canvas>' +
                '<div style="text-align:right;width:48px;flex-shrink:0;">' +
                    '<span id="count-roomTotal" style="font-weight:bold;color:var(--panel-accent);font-size:14px;">0</span>' +
                    '<div id="high-roomTotal" style="font-size:8px;color:var(--panel-positive);margin-top:1px;white-space:nowrap;">SH:0</div>' +
                '</div>' +
            '</div>' +

            '</div>' +
            '<div id="trend-section" style="position:relative;border-top:1px solid #4169E1;margin-top:5px;padding-top:5px;">' +
                '<div id="live-trend">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;flex-wrap:wrap;gap:2px;">' +
                    '<span id="trend-header-label" style="font-size:9px;font-weight:bold;color:#4169E1;">📈 TREND</span>' +
                    '<div style="display:flex;gap:2px;flex-wrap:wrap;">' +
                        '<button class="trend-preset-btn" data-mode="last" style="background:#4169E1;border:1px solid #4169E1;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Last</button>' +
                        '<button class="trend-preset-btn" data-mode="5min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">5m</button>' +
                        '<button class="trend-preset-btn" data-mode="15min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">15m</button>' +
                        '<button class="trend-preset-btn" data-mode="30min" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">30m</button>' +
                        '<button class="trend-preset-btn" data-mode="1hour" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">1h</button>' +
                        '<button class="trend-preset-btn" data-mode="start" style="background:var(--panel-button);border:1px solid var(--panel-divider);color:var(--panel-muted);border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;">Start</button>' +
                        '<button id="btn-trend-auto" style="background:#32CD32;border:1px solid #32CD32;color:#fff;border-radius:2px;cursor:pointer;font-size:7px;padding:1px 4px;" title="Auto-escalation ON - Click to disable">AUTO</button>' +
                    '</div>' +
                '</div>' +
                '<div id="trend-container" style="min-height:30px;">' +
                    '<div style="font-size:8px;color:var(--panel-faint);text-align:center;padding:8px;">Waiting for scan...</div>' +
                '</div>' +
                '</div>' +
                '<div id="playback-controls" style="display:none;position:absolute;top:5px;left:0;right:0;bottom:0;padding:0 2px;box-sizing:border-box;grid-template-rows:minmax(14px,1fr) 14px 12px;gap:2px;" aria-label="Playback controls">' +
                    '<div style="display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:0;">' +
                        '<div id="playback-file-controls" style="display:none;align-items:center;gap:4px;min-width:0;">' +
                            '<div id="playback-room" style="display:none;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:12px;font-weight:bold;color:var(--panel-text);"></div>' +
                        '</div>' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;gap:3px;">' +
                        '<strong id="playback-label" style="font-size:9px;color:var(--panel-warning);">PLAYBACK</strong>' +
                        '<button id="playback-play" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:#4169E1;color:white;border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Pause</button>' +
                        '<select id="playback-speed" aria-label="Playback speed" style="font-size:8px;height:15px;margin:0;padding:0;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>' +
                        '<button type="button" id="btn-playback-library" aria-label="Open session library" aria-expanded="false" aria-controls="tierscope-session-tools" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-accent);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Library</button>' +
                        '<button id="playback-return" style="font-size:8px;line-height:12px;margin:0;padding:0 4px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">Return to Live</button>' +
                    '</div>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:4px;min-width:0;">' +
                    '<button type="button" id="playback-previous" title="Previous recorded sample (pauses Replay)" aria-label="Previous recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">|&#9664;</button>' +
                    '<input id="playback-scrubber" type="range" min="0" max="0" value="0" step="any" aria-label="Playback timeline" style="flex:1;min-width:0;width:100%;height:12px;margin:0;accent-color:var(--panel-warning);cursor:pointer;">' +
                    '<button type="button" id="playback-next" title="Next recorded sample (pauses Replay)" aria-label="Next recorded sample" style="flex:0 0 20px;height:14px;padding:0;font-size:9px;line-height:10px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:2px;cursor:pointer;">&#9654;|</button></div>' +
                    '<div id="playback-file-actions" style="display:flex;justify-content:center;min-width:0;">' +
                        '<div id="playback-position" style="font-size:9px;line-height:12px;text-align:center;white-space:nowrap;color:var(--panel-secondary);font-family:monospace;">00:00:00 / 00:00:00</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div id="control-field" role="group" aria-label="Tracking controls" style="position:relative;margin-top:5px;padding:4px;background:rgba(65,105,225,0.15);border-radius:3px;border:1px solid #4169E1;">' +
                '<div id="control-session-row" style="display:grid;grid-template-columns:minmax(78px,1fr) max-content minmax(0,1fr);align-items:center;gap:3px;margin-bottom:4px;white-space:nowrap;">' +
                    '<span aria-hidden="true" style="width:78px;"></span>' +
                    '<span style="font-size:12px;color:var(--panel-warning);font-family:monospace;font-weight:bold;width:9ch;text-align:center;font-variant-numeric:tabular-nums;" id="control-tracking-timer">00:00:00</span>' +
                    '<span style="min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums;font-size:11px;color:var(--panel-positive);font-weight:bold;" id="control-next-scan">Next: 60s</span>' +
                '</div>' +
                '<div id="control-action-row" style="display:grid;grid-template-columns:minmax(max-content,1fr) auto minmax(0,1fr);align-items:center;gap:3px;">' +
                    '<div style="width:78px;height:14px;"><div id="control-session-buttons" style="position:absolute;top:4px;bottom:4px;left:4px;width:78px;display:grid;grid-template-columns:38px 38px;gap:2px;">' +
                    '<button type="button" id="btn-control-library" aria-expanded="false" aria-controls="tierscope-session-tools" aria-label="Open session library" title="Open model folders, session summaries, comparisons and backups" style="font-size:9px;font-weight:bold;line-height:12px;min-width:0;box-sizing:border-box;margin:0;padding:2px;background:rgba(255,105,180,0.2);color:var(--panel-accent);border:1px solid var(--panel-accent);border-radius:3px;cursor:pointer;">Library</button>' +
                    '<button id="btn-replay" style="font-size:8px;line-height:10px;min-width:0;box-sizing:border-box;margin:0;padding:2px;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:3px;cursor:pointer;" title="Replay recorded history">Replay</button>' +
                    '</div></div>' +
                    '<div id="control-action-buttons" style="display:flex;gap:2px;align-items:center;">' +
                        '<button id="btn-control-auto" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#32CD32;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 4px;min-width:24px;" title="Auto-Refresh ON">⏸</button>' +
                        '<button type="button" id="btn-control-stop" aria-label="Stop this session" title="Stop this session and freeze its history and elapsed time" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;white-space:nowrap;">■ Stop</button>' +
                        '<button id="btn-main-reset" style="height:14px;box-sizing:border-box;line-height:10px;margin:0;background:#ff4444;border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:8px;padding:2px 3px;display:flex;align-items:center;gap:2px;" title="Reset all tracking data">' +
                            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                                '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>' +
                                '<path d="M3 3v9h9"/>' +
                            '</svg>' +
                            'Reset' +
                        '</button>' +
                    '</div>' +
                    '<style>' +
                        '#dark-mode-control #dark-mode-track{position:relative;display:block;flex:0 0 22px;width:22px;height:12px;box-sizing:border-box;border:1px solid #9b701d;border-radius:7px;background:#e8b444;transition:background-color .16s ease;}' +
                        '#dark-mode-control #dark-mode-thumb{position:absolute;left:1px;top:1px;width:8px;height:8px;border-radius:50%;background:#4c3300;transform:translateX(10px);transition:transform .16s ease,background-color .16s ease;}' +
                        '#dark-mode-control #dark-mode-moon{color:var(--panel-muted);opacity:.55;}' +
                        '#dark-mode-control #dark-mode-sun{color:#825d00;}' +
                        '#dark-mode-control #dark-mode-toggle:checked~#dark-mode-track{background:#4169e1;border-color:#8ca8ff;}' +
                        '#dark-mode-control #dark-mode-toggle:checked~#dark-mode-track #dark-mode-thumb{transform:translateX(0);background:#fff;}' +
                        '#dark-mode-control #dark-mode-toggle:checked~#dark-mode-moon{color:#b4c5ff;opacity:1;}' +
                        '#dark-mode-control #dark-mode-toggle:checked~#dark-mode-sun{color:var(--panel-muted);opacity:.55;}' +
                        '#dark-mode-control #dark-mode-toggle:focus-visible~#dark-mode-track{outline:2px solid var(--panel-accent);outline-offset:2px;}' +
                        '@media(prefers-reduced-motion:reduce){#dark-mode-control #dark-mode-track,#dark-mode-control #dark-mode-thumb{transition:none;}}' +
                    '</style>' +
                    '<label id="dark-mode-control" style="position:relative;justify-self:end;display:inline-flex;align-items:center;gap:2px;height:14px;cursor:pointer;line-height:1;">' +
                        '<input type="checkbox" role="switch" id="dark-mode-toggle" checked aria-label="Dark mode" style="position:absolute;inset:0;z-index:1;width:100%;height:100%;box-sizing:border-box;margin:0;padding:0;border:0;opacity:0;cursor:pointer;">' +
                        '<svg id="dark-mode-moon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex:none;"><path d="M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z"/></svg>' +
                        '<span id="dark-mode-track" aria-hidden="true"><span id="dark-mode-thumb"></span></span>' +
                        '<svg id="dark-mode-sun" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style="flex:none;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>' +
                    '</label>' +
                '</div>' +
            '</div>' +

            '<div id="tracker-footer" style="display:grid;grid-template-columns:80px minmax(0,1fr) 60px;align-items:center;gap:4px;margin-top:5px;min-height:18px;">' +
                '<div id="acquisition-status" style="width:100%;min-width:0;max-width:80px;font-variant-numeric:tabular-nums;font-size:7px;color:var(--panel-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="No accepted sample yet">No sample</div>' +
                '<div id="background-slider-controls" style="display:flex;align-items:center;gap:3px;min-width:0;">' +
                    '<svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--panel-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0;"><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/></svg>' +
                    '<input type="range" id="opacity-slider" min="30" max="100" value="95" aria-label="Background opacity" style="flex:1;min-width:0;width:100%;height:12px;margin:0;cursor:pointer;accent-color:#ff69b4;" title="Panel, Library and standard tier background opacity">' +
                    '<span id="opacity-value" style="font-size:8px;color:var(--panel-secondary);width:23px;flex:0 0 23px;text-align:right;font-variant-numeric:tabular-nums;">95%</span>' +
                '</div>' +
                '<div id="tierscope-logo" style="justify-self:end;display:flex;flex-direction:column;align-items:center;gap:0;white-space:nowrap;" onmouseenter="this.firstElementChild.style.opacity=1" onmouseleave="this.firstElementChild.style.opacity=0.6">' +
                '<div style="display:flex;align-items:center;gap:3px;height:8px;opacity:0.6;transition:opacity 0.2s;">' +
                '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" style="flex-shrink:0;">' +
                    '<circle cx="12" cy="12" r="10"/>' +
                    '<line x1="12" y1="2" x2="12" y2="22"/>' +
                    '<line x1="2" y1="12" x2="22" y2="12"/>' +
                '</svg>' +
                '<span title="TierScope ' + runtime.TIERSCOPE_VERSION + '" style="font-size:7px;line-height:8px;font-family:\'Courier New\',monospace;font-weight:bold;color:var(--panel-accent);letter-spacing:1px;">TIERSCOPE</span></div>' +
                '<span id="tierscope-version" style="font:bold 8px/10px Arial,sans-serif;letter-spacing:.15px;color:var(--panel-secondary);">' + runtime.TIERSCOPE_VERSION + '</span>' +
                '</div>' +
            '</div>' +
        '</div>';

    div.innerHTML = html;
    document.body.appendChild(div);
    applyPanelTheme(false);
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        selectPanelTheme(this.checked);
        try { GM_setValue(runtime.PANEL_THEME_KEY, runtime.isDarkMode ? 'dark' : 'bright'); }
        catch (error) { log('Could not save theme preference'); }
        applyPanelTheme(true);
    });

    var standardSize = document.getElementById('btn-standard-size');
    if (standardSize) {
        standardSize.onmousedown = function(event) { event.stopPropagation(); };
        standardSize.onclick = function(event) { event.stopPropagation(); restoreStandardSize(); };
    }
    var btnMainReset = document.getElementById('btn-main-reset');
    var btnControlAuto = document.getElementById('btn-control-auto');
    var opacitySlider = document.getElementById('opacity-slider');

    if (btnMainReset) btnMainReset.addEventListener('click', resetAllTracking);
    if (btnControlAuto) btnControlAuto.addEventListener('click', toggleAutoRefresh);
    document.getElementById('btn-control-stop').onclick = function() {
        if (runtime.isStopped) return;
        if (!confirm('Stop this session?\n\nHistory will remain available for Replay and downloads, but this session cannot be resumed. Starting again begins a new session.')) return;
        stopTracking('manual');
    };
    updateContainerOpacity(runtime.panelBackgroundPercent);
    if (opacitySlider) {
        opacitySlider.addEventListener('input', function() {
            updateContainerOpacity(this.value);
        });
    }

    const modelFavorite = document.getElementById('btn-model-favorite');
    modelFavorite.onmousedown = event => event.stopPropagation();
    modelFavorite.onclick = event => {
        event.stopPropagation();
        const room = modelFavorite.dataset.favoriteRoom;
        try {
            if (room && room !== 'unknown' && changeModelFavorite(room)) {
                // Also refresh any current-session star already visible in Library.
                document.querySelectorAll('[data-favorite-room]').forEach(button => {
                    if (button.dataset.favoriteRoom === room) paintFavoriteButton(button, room, readModelFavorite(room));
                });
                updateSessionToolsStatus(true);
            }
        } catch (error) { alert('Favorite could not be changed: ' + error.message); }
    };
    bindPanelOptions();
    bindPlaybackControls();
    bindRowControls();
    updateReplayAvailability();
    setupDraggable();
    setupResizable();
    setupResizeHandler();

    var btnToggle = document.getElementById('btn-toggle');
    var btnExpand = document.getElementById('btn-expand');
    var btnAuto = document.getElementById('btn-auto');
    var btnTimerDown = document.getElementById('btn-timer-down');
    var btnTimerUp = document.getElementById('btn-timer-up');

    var miniMetricButton = document.getElementById('mini-metric');
    if (miniMetricButton) miniMetricButton.onclick = function() {
        cycleMiniMetric();
        try { GM_setValue(runtime.MINI_METRIC_KEY, runtime.miniMetric); } catch (error) { log('Could not save compact chart preference'); }
        updateDisplay();
    };
    var miniSettingsButton = document.getElementById('mini-settings-toggle');
    var miniSettings = document.getElementById('mini-settings');
    if (miniSettingsButton && miniSettings) {
        var miniSettingsClose = document.getElementById('mini-settings-close');
        function closeMiniSettings() {
            miniSettings.style.display = 'none';
            miniSettingsButton.setAttribute('aria-expanded', 'false');
            miniSettingsButton.focus();
        }
        if (miniSettingsClose) miniSettingsClose.onclick = closeMiniSettings;
        miniSettingsButton.onclick = function() {
            if (miniSettings.style.display !== 'none') { closeMiniSettings(); return; }
            miniSettings.style.display = 'block';
            miniSettingsButton.setAttribute('aria-expanded', 'true');
            if (miniSettingsClose) miniSettingsClose.focus();
        };
        // Capture Escape even after focus moves to the page. The listener is
        // replaced on rebuild, independently of transient drag listeners.
        runtime.miniSettingsKeyHandler = function(event) {
            if (event.key === 'Escape' && miniSettings.style.display !== 'none') {
                event.preventDefault();
                event.stopPropagation();
                closeMiniSettings();
            }
        };
        document.addEventListener('keydown', runtime.miniSettingsKeyHandler, true);
    }
    if (btnToggle) btnToggle.onclick = toggleView;
    if (btnExpand) btnExpand.onclick = toggleView;
    if (btnAuto) btnAuto.onclick = toggleAutoRefresh;
    if (btnTimerDown) btnTimerDown.onclick = function() { adjustTimer(-10); };
    if (btnTimerUp) btnTimerUp.onclick = function() { adjustTimer(10); };

    var presetBtns = document.querySelectorAll('.timer-preset');
    for (var i = 0; i < presetBtns.length; i++) {
        presetBtns[i].onclick = function() {
            var time = parseInt(this.dataset.time);
            selectScanInterval(time);
            if (runtime.isAutoRefreshOn) {
                stopCountdown();
                resetCountdown();
                startCountdown();
            } else {
                resetCountdown();
            }
            updateCountdownDisplay();
            var allPresets = document.querySelectorAll('.timer-preset');
            for (var j = 0; j < allPresets.length; j++) {
                allPresets[j].style.background = 'var(--panel-button)';
                allPresets[j].style.color = 'var(--panel-muted)';
                allPresets[j].style.borderColor = 'var(--panel-divider)';
            }
            this.style.background = '#ff69b4';
            this.style.color = '#fff';
            this.style.borderColor = '#ff69b4';
        };
    }
    
    var trendPresetBtns = document.querySelectorAll('.trend-preset-btn');
    for (var k = 0; k < trendPresetBtns.length; k++) {
        trendPresetBtns[k].onclick = function() {
            selectAutomaticTrends(false);
            updateAutoTrendButton();
            var mode = this.dataset.mode;
            setTrendComparisonMode(mode);
        };
    }
    
    var btnTrendAuto = document.getElementById('btn-trend-auto');
    if (btnTrendAuto) {
        btnTrendAuto.onclick = toggleAutoTrendEscalation;
    }
    
    updateTrendPresetButtons();
    updateAutoTrendButton();
    updateStopControls();
}
