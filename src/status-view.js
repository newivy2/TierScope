
export function renderStatus(element, model) {
    if (!element) return;
    if (model.saveWarning) element.dataset.sessionSaveWarning = 'true';
    else if (element.dataset.sessionSaveWarning) { element.style.color = ''; delete element.dataset.sessionSaveWarning; }
    element.textContent = model.text;
    element.title = model.title;
    if (model.color !== null) element.style.color = model.color;
}
