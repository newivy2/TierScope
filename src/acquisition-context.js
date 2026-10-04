import { acquisitionContextIsCurrent } from './acquisition-state.js';
export function isAcquisitionCurrent(context) {
    return acquisitionContextIsCurrent(context, location.href);
}

