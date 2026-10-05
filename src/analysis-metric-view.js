import { toolNode as node, toolButton as button } from './tools-view-helpers.js';

// The coordinator supplies labels/colors and owns the selected metric. This
// view keeps a single radio choice and requests changes without reading state.
export function renderMetricStrip(parent, choices, selected, changed, id = 'tools-metric') {
    const group = node(parent, 'div', undefined, 'tools-metric-strip'); group.id = id;
    group.setAttribute('role', 'radiogroup'); group.setAttribute('aria-label', 'Chart metric');
    const caption = node(parent, 'p', undefined, 'tools-metric-caption'); caption.id = id + '-caption';
    group.setAttribute('aria-describedby', caption.id);
    const radios = [];
    function select(index, focus = false) {
        radios.forEach((radio, i) => {
            radio.setAttribute('aria-checked', String(i === index)); radio.tabIndex = i === index ? 0 : -1;
        });
        caption.textContent = choices[index].label;
        if (focus) radios[index].focus();
    }
    choices.forEach((choice, index) => {
        const radio = button(group, '', () => {
            if (radio.getAttribute('aria-checked') === 'true') return;
            select(index); changed(choice.key);
        }, id + '-' + choice.key);
        radios.push(radio); radio.dataset.metric = choice.key;
        radio.setAttribute('role', 'radio'); radio.setAttribute('aria-label', choice.label); radio.title = choice.label;
        const icon = node(radio, 'span', choice.icon || '', choice.icon ? 'tools-metric-icon' : 'tools-metric-circle');
        icon.setAttribute('aria-hidden', 'true'); icon.style.setProperty('--metric-color', choice.color);
        radio.onkeydown = event => {
            let next = index;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % choices.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + choices.length - 1) % choices.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = choices.length - 1;
            else return;
            event.preventDefault(); select(next, true); changed(choices[next].key);
        };
    });
    select(Math.max(0, choices.findIndex(choice => choice.key === selected)));
    return group;
}
