
// Presentation-only accessors; they never reach back into a session or storage.
export function displayHigh(frame, key) { return frame.displayHighs[key]; }
export function displayHighLabel(high, compact) { return compact ? high.shortLabel : high.label; }
export function displayHighDescription(high) { return high.description; }

// Use the displayed frame in live, restored and replay views alike.
export function anonymousRegisteredRatio(anonymous, registered) {
    if (!Number.isFinite(anonymous) || !Number.isFinite(registered) || anonymous < 0 || registered <= 0) return '—';
    const ratio = anonymous / registered;
    return ratio >= 0.95 && ratio <= 1.05 ? '1:1' : ratio.toFixed(1) + 'x';
}
