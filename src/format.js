
export function compactNumber(value) {
    return value >= 1000000 ? (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'm' :
        value >= 10000 ? (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(value);
}
