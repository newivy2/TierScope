const keyPrefix = 'tierscope:ui:disclosure:v1:';
const choices = new Set(['trendSettings', 'liveSettings', 'librarySearch', 'libraryModels', 'summaryPicker', 'comparePicker']);
export function readDisclosure(name, fallback = false) {
    if (!choices.has(name)) return fallback;
    try { const saved = GM_getValue(keyPrefix + name, null); return typeof saved === 'boolean' ? saved : fallback; }
    catch (error) { return fallback; }
}
export function rememberDisclosure(name, open) {
    if (!choices.has(name)) return;
    try { GM_setValue(keyPrefix + name, !!open); } catch (error) { /* The choice still works in this view. */ }
}
export function bindRememberedDisclosure(element, name, fallback = false) {
    if (!element) return;
    element.open = readDisclosure(name, fallback);
    const summary = element.querySelector(':scope > summary');
    if (summary) summary.addEventListener('click', event => { if (!event.defaultPrevented) rememberDisclosure(name, !element.open); });
    element.ontoggle = () => { if (element.isConnected) rememberDisclosure(name, element.open); };
}
