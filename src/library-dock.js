import { setThemeVariables } from './theme-values.js';

// This view adapter owns temporary docking only. It never persists geometry or
// touches recording state. Closing restores space borrowed from the live panel.
export function attachLibraryDock(panel, library, onTheme) {
    const original = {left: panel.style.left, top: panel.style.top, right: panel.style.right};
    let lastPosition = {...original}, movedByUser = false, borrowed = false, frame = 0, closed = false;
    let previousTheme = '';
    let previousBackground = '';
    const position = () => ({left: panel.style.left, top: panel.style.top, right: panel.style.right});
    function arrange() {
        frame = 0;
        if (closed || !panel.isConnected || !library.isConnected) return;
        const now = position();
        if (Object.keys(now).some(key => now[key] !== lastPosition[key])) movedByUser = true;
        let rect = panel.getBoundingClientRect();
        const scale = Math.max(0.9, Math.min(1.6, Number(panel.dataset.scale) || 1));
        const width = Math.round(370 * scale), margin = 8;
        const docked = window.innerWidth >= rect.width + width + margin * 2;
        if (docked) {
            const left = Math.max(width + margin - 1, Math.min(rect.left, window.innerWidth - rect.width - margin));
            if (Math.abs(left - rect.left) > 0.5) {
                panel.style.left = left + 'px'; panel.style.right = 'auto'; borrowed = true;
                rect = panel.getBoundingClientRect();
            }
        }
        lastPosition = position();
        const height = docked ? Math.min(Math.max(420, rect.height), window.innerHeight - rect.top) :
            Math.min(window.innerHeight - margin * 2, Math.max(420, rect.height));
        const top = docked ? rect.top : Math.max(margin, Math.min(rect.top, window.innerHeight - height - margin));
        const styles = {left: (docked ? rect.left - width + 1 : margin) + 'px', top: top + 'px',
            width: (docked ? width : Math.min(window.innerWidth - margin * 2, 520)) + 'px',
            height: height + 'px', fontSize: (11 * scale) + 'px'};
        for (const [key, value] of Object.entries(styles)) if (library.style[key] !== value) library.style[key] = value;
        const mode = docked ? 'docked' : 'sheet';
        if (panel.dataset.libraryOpen !== mode) panel.dataset.libraryOpen = mode;
        if (library.dataset.layout !== mode) library.dataset.layout = mode;
        // Copy the painted background, not element opacity: child controls and
        // charts retain their own contrast. Style observation also handles a
        // slider change while open; first arrange handles changes while closed.
        const background = window.getComputedStyle(panel).backgroundColor;
        if (background !== previousBackground) {
            previousBackground = background; library.style.backgroundColor = background;
        }
        const theme = panel.getAttribute('data-theme') || 'dark';
        if (theme !== previousTheme) {
            previousTheme = theme; library.dataset.theme = theme; setThemeVariables(library);
            if (onTheme) onTheme();
        }
    }
    function schedule() { if (!closed && !frame) frame = window.requestAnimationFrame(arrange); }
    const resize = window.ResizeObserver ? new window.ResizeObserver(schedule) : null;
    if (resize) resize.observe(panel);
    const mutation = new window.MutationObserver(schedule);
    mutation.observe(panel, {attributes: true, attributeFilter: ['style', 'data-scale', 'data-theme']});
    window.addEventListener('resize', schedule);
    arrange();
    return () => {
        closed = true;
        if (frame) window.cancelAnimationFrame(frame);
        if (resize) resize.disconnect(); mutation.disconnect();
        window.removeEventListener('resize', schedule);
        delete panel.dataset.libraryOpen;
        if (borrowed && !movedByUser) for (const [key, value] of Object.entries(original)) panel.style[key] = value;
    };
}
