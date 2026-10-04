import { runtime } from './runtime.js';

export function themeColor(token) { return runtime.PANEL_THEME_COLORS[token][runtime.isDarkMode ? 0 : 1]; }

export function setThemeVariables(element) {
    if (!element) return;
    Object.keys(runtime.PANEL_THEME_COLORS).forEach(function(token) {
        element.style.setProperty('--panel-' + token, themeColor(token));
    });
    element.style.colorScheme = runtime.isDarkMode ? 'dark' : 'light';
}
