import { buildAcquisitionStatusModel, buildFreshnessModel } from './status-model.js';
import { renderStatus } from './status-view.js';

export function updateMiniFreshness() {
    var element = document.getElementById('mini-freshness');
    if (element) renderStatus(element, buildFreshnessModel());
}

export function updateAcquisitionStatus() {
    updateMiniFreshness();
    var element = document.getElementById('acquisition-status');
    if (element) renderStatus(element, buildAcquisitionStatusModel());
}
