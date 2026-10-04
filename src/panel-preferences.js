/** @typedef {import('./control-types').PanelPreferences} PanelPreferences */
/** @type {ReadonlyArray<keyof PanelPreferences>} */
export const PANEL_PREFERENCE_FIELDS = Object.freeze(['highMode', 'panelGeometry', 'isDarkMode', 'miniMetric',
    'collapsedRows', 'chartWindowMode', 'currentScale', 'panelBackgroundPercent', 'isMinimized', 'trendComparisonMode', 'autoTrendEscalation']);
/** @type {PanelPreferences} */
let panelPreferenceState;
/** @type {{rows: Set<string>, metrics: string[], windows: Set<string>, trends: Set<string>}} */
let preferenceChoices;
/** @param {PanelPreferences & {PANEL_ROWS: {key: string}[], MINI_METRICS: string[], CHART_WINDOWS: object, TREND_PRESETS: object}} target */
export function initializePanelPreferences(target) {
    panelPreferenceState = {.../** @type {PanelPreferences} */ (Object.fromEntries(PANEL_PREFERENCE_FIELDS.map(key => [key, target[key]]))), collapsedRows: new Set(target.collapsedRows),
        panelGeometry: target.panelGeometry ? {...target.panelGeometry} : null};
    preferenceChoices = {rows: new Set(target.PANEL_ROWS.map(row => row.key)), metrics: target.MINI_METRICS.slice(),
        windows: new Set(Object.keys(target.CHART_WINDOWS)), trends: new Set(Object.keys(target.TREND_PRESETS))};
    const rowsView = Object.freeze({has: key => panelPreferenceState.collapsedRows.has(key),
        get size() { return panelPreferenceState.collapsedRows.size; },
        [Symbol.iterator]: () => panelPreferenceState.collapsedRows[Symbol.iterator]()});
    for (const key of PANEL_PREFERENCE_FIELDS) Object.defineProperty(target, key, {enumerable: true, configurable: false,
        get: () => key === 'collapsedRows' ? rowsView : key === 'panelGeometry' && panelPreferenceState.panelGeometry ?
            Object.freeze({...panelPreferenceState.panelGeometry}) : panelPreferenceState[key]});
}
export function switchHighPreference() { panelPreferenceState.highMode = panelPreferenceState.highMode === 'sh' ? 'ath' : 'sh'; }
/** @param {boolean} dark */
export function selectPanelTheme(dark) { panelPreferenceState.isDarkMode = !!dark; }
export function cycleMiniMetric() {
    panelPreferenceState.miniMetric = preferenceChoices.metrics[(preferenceChoices.metrics.indexOf(panelPreferenceState.miniMetric) + 1) % preferenceChoices.metrics.length];
}
/** @param {string} key @param {boolean} collapsed */
export function selectCollapsedRow(key, collapsed) {
    if (!preferenceChoices.rows.has(key)) return;
    if (collapsed) panelPreferenceState.collapsedRows.add(key);
    else panelPreferenceState.collapsedRows.delete(key);
}
/** @param {string} mode */
export function selectChartWindow(mode) { if (preferenceChoices.windows.has(mode)) panelPreferenceState.chartWindowMode = mode; }
/** @param {number} scale */
export function selectPanelScale(scale) { if (Number.isFinite(scale) && scale > 0) panelPreferenceState.currentScale = scale; }
/** @param {{left: number, top: number, scale: number}} geometry */
export function rememberPanelGeometry(geometry) { panelPreferenceState.panelGeometry = {...geometry}; }
/** @param {number} percent */
export function selectPanelOpacity(percent) {
    if (Number.isFinite(percent)) panelPreferenceState.panelBackgroundPercent = Math.max(30, Math.min(100, percent));
}
/** @param {boolean} minimized */
export function selectPanelMinimized(minimized) { panelPreferenceState.isMinimized = !!minimized; }
/** @param {string} mode */
export function selectTrendMode(mode) { if (preferenceChoices.trends.has(mode)) panelPreferenceState.trendComparisonMode = mode; }
/** @param {boolean} automatic */
export function selectAutomaticTrends(automatic) { panelPreferenceState.autoTrendEscalation = !!automatic; }
/** @param {string} mode @param {boolean} automatic */
export function restoreTrendPreferences(mode, automatic) { selectTrendMode(mode); selectAutomaticTrends(automatic); }
export function resetTrendPreferences() { restoreTrendPreferences('last', true); }
