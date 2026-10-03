import { hideChartTooltip } from './charts.js';
import { redrawPanelCharts } from './layout.js';
import { updateDisplay } from './panel.js';
import { runtime } from './runtime.js';

export function themeColor(token) { return runtime.PANEL_THEME_COLORS[token][runtime.isDarkMode ? 0 : 1]; }

export function setThemeVariables(element) {
    if (!element) return;
    Object.keys(runtime.PANEL_THEME_COLORS).forEach(function(token) {
        element.style.setProperty('--panel-' + token, themeColor(token));
    });
    element.style.colorScheme = runtime.isDarkMode ? 'dark' : 'light';
}

export function applyPanelTheme(redraw) {
    var container = document.getElementById('tracker-container');
    if (!container) return;
    setThemeVariables(container);
    container.setAttribute('data-theme', runtime.isDarkMode ? 'dark' : 'bright');
    setThemeVariables(document.getElementById('tierscope-chart-tooltip'));
    var toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = runtime.isDarkMode;
    var control = document.getElementById('dark-mode-control');
    if (control) control.title = runtime.isDarkMode ? 'Dark mode on — switch to bright mode' : 'Bright mode on — switch to dark mode';
    updateContainerOpacity(runtime.panelBackgroundPercent);
    if (redraw) {
        hideChartTooltip();
        updateDisplay();
        redrawPanelCharts();
    }
}

export function updateContainerOpacity(value) {
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    runtime.panelBackgroundPercent = Math.max(30, Math.min(100, numeric));
    var container = document.getElementById('tracker-container');
    if (!container) return;
    container.style.backgroundColor = 'rgba(' + themeColor('rgb') + ',' + runtime.panelBackgroundPercent / 100 + ')';
    // Only standard tier fills use this variable. Green highlights retain their
    // original fixed alpha, as do summary rows, controls, text and borders.
    container.style.setProperty('--tier-background-scale', String(runtime.panelBackgroundPercent / 95));
    var slider = document.getElementById('opacity-slider');
    if (slider) {
        slider.value = String(runtime.panelBackgroundPercent);
        slider.setAttribute('aria-valuetext', runtime.panelBackgroundPercent + '% background opacity');
    }
    var label = document.getElementById('opacity-value');
    if (label) label.textContent = runtime.panelBackgroundPercent + '%';
}
