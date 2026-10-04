const roomSeries = new WeakMap();

export function roomTotalSeries(history) {
    if (roomSeries.has(history)) return roomSeries.get(history);
    const values = history.total.map((value, index) => value + history.anonymous[index]);
    if (Object.isFrozen(history) && Object.isFrozen(history.total) && Object.isFrozen(history.anonymous)) {
        Object.freeze(values); roomSeries.set(history, values);
    }
    return values;
}
