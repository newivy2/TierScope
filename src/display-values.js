
// Presentation-only accessors; they never reach back into a session or storage.
export function displayHigh(frame, key) { return frame.displayHighs[key]; }
export function displayHighLabel(high, compact) { return compact ? high.shortLabel : high.label; }
export function displayHighDescription(high) { return high.description; }
