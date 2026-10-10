// Browser connectivity is a hint: being online does not prove the API is reachable.
export function isBrowserOffline() {
    return typeof window !== 'undefined' && !!window.navigator && window.navigator.onLine === false;
}
