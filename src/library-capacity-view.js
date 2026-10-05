import { DEFAULT_LIBRARY_LIMITS, LIBRARY_LIMIT_RANGES, LIBRARY_MEGABYTE, libraryCapacityNotice } from './library-capacity-data.js';
import { toolButton, toolNode } from './tools-view-helpers.js';

export function renderLibraryCapacity(parent, usage, limits, error, save) {
    const section = toolNode(parent, 'section'); section.id = 'tools-library-storage';
    const counter = toolNode(section, 'p', '', 'tools-muted');
    counter.id = 'tools-library-usage';
    const notice = toolNode(section, 'p', '', 'tools-capacity-warning');
    notice.id = 'tools-library-capacity-warning'; notice.setAttribute('role', 'status');
    function refresh(nextUsage, nextLimits, nextError) {
        counter.textContent = nextUsage.count.toLocaleString() + ' / ' + (nextLimits ? nextLimits.maxSessions.toLocaleString() : '?') +
            ' sessions · ' + (nextUsage.bytes / LIBRARY_MEGABYTE).toFixed(2) + ' / ' + (nextLimits ? nextLimits.maxMegabytes : '?') + ' MB';
        notice.textContent = nextError || (nextLimits ? libraryCapacityNotice(nextUsage, nextLimits) : '');
        notice.hidden = !notice.textContent;
    }
    refresh(usage, limits, error);
    const settings = toolNode(section, 'details'); settings.id = 'tools-storage-settings';
    toolNode(settings, 'summary', 'Storage limits');
    const form = toolNode(settings, 'form'); form.id = 'tools-storage-form';
    toolNode(form, 'p', 'For all models in this browser. Sessions are kept until you delete them.', 'tools-muted');
    const fields = toolNode(form, 'div', undefined, 'tools-capacity-fields');
    const inputs = {};
    for (const [key, label, id] of [['maxSessions', 'Sessions', 'tools-storage-sessions'], ['maxMegabytes', 'Storage (MB)', 'tools-storage-megabytes']]) {
        const wrapper = toolNode(fields, 'label', label), input = toolNode(wrapper, 'input');
        input.type = 'number'; input.id = id; input.min = '1'; input.max = String(LIBRARY_LIMIT_RANGES[key]); input.step = '1'; input.required = true;
        input.value = String((limits || DEFAULT_LIBRARY_LIMITS)[key]); inputs[key] = input;
    }
    toolNode(form, 'p', 'Defaults: 1,000 sessions / 50 MB. Choose up to 10,000 sessions / 250 MB. Larger libraries can take longer to open and back up.', 'tools-muted');
    toolNode(form, 'p', 'Lowering limits never deletes sessions. Saves wait if usage exceeds a limit. Updates need spare space; browser storage can fill before these limits.', 'tools-muted');
    const actions = toolNode(form, 'div', undefined, 'tools-actions');
    const submit = toolButton(actions, 'Save limits', null, 'tools-storage-save'); submit.type = 'submit'; submit.className = 'tools-primary';
    toolButton(actions, 'Use defaults', () => {
        for (const [key, input] of Object.entries(inputs)) input.value = String(DEFAULT_LIBRARY_LIMITS[key]);
        inputs.maxSessions.focus();
    }, 'tools-storage-defaults');
    const feedback = toolNode(form, 'p', '', 'tools-capacity-warning'); feedback.id = 'tools-storage-error'; feedback.setAttribute('role', 'alert'); feedback.hidden = true;
    form.onsubmit = event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try { save({maxSessions: inputs.maxSessions.valueAsNumber, maxMegabytes: inputs.maxMegabytes.valueAsNumber}); }
        catch (failure) { feedback.textContent = 'Storage limit save failed. ' + failure.message; feedback.hidden = false; }
    };
    return refresh;
}
