export function journeyPanelHtml() {
    return `<style>
#tracker-container{max-height:calc(100vh / var(--journey-scale,1) - 12px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#ff69b470 transparent}
#tracker-container #journey-nav{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:5px 0}
#tracker-container #journey-nav button{font: bold 10px/1.3 Arial,sans-serif;padding:5px 2px;min-width:0;background:var(--panel-button);color:var(--panel-text);border:1px solid var(--panel-divider);border-radius:4px;cursor:pointer}
#tracker-container #journey-nav button[aria-current=page]{border-color:var(--panel-accent);color:var(--panel-accent);background:#ff69b418}
#tracker-container #journey-status{font-size:10px;font-weight:bold;line-height:1.4;margin:6px 0 2px;overflow-wrap:anywhere;color:var(--panel-secondary)}
#tracker-container #journey-detail{font-size:9px;line-height:1.4;color:var(--panel-muted);margin:2px 0 5px;overflow-wrap:anywhere}
#tracker-container #journey-actions{display:flex;flex-wrap:wrap;gap:4px;margin:5px 0 7px}
#tracker-container #journey-actions button{font:9px/1.3 Arial,sans-serif;background:var(--panel-button);color:var(--panel-accent);border:1px solid var(--panel-accent);border-radius:3px;padding:4px 5px;cursor:pointer}
#tracker-container #journey-actions button:disabled{opacity:.45;cursor:default}
#tracker-container #journey-audience{border-top:1px solid var(--panel-divider);padding-top:6px;margin-bottom:5px}
#tracker-container #journey-compare,#tracker-container #journey-view{background:transparent!important;border-color:transparent!important;text-decoration:underline}
#tracker-container #journey-actions[hidden],#tracker-container #journey-view[hidden],#tracker-container #journey-detail[hidden]{display:none}
#tracker-container :is(#journey-nav,#journey-actions) button:focus-visible{outline:2px solid var(--panel-accent);outline-offset:2px}
</style>
<nav id="journey-nav" aria-label="TierScope destinations"><button id="btn-live" type="button" aria-current="page">Live</button><button id="btn-control-library" type="button" aria-expanded="false" aria-controls="tierscope-session-tools">Saved sessions</button></nav>
<div id="journey-status" role="status" aria-live="polite">Tracking live · Not saved to Library</div>
<div id="journey-detail"></div>
<div id="journey-actions"><button id="journey-keep" type="button" disabled>Keep in Library</button><button id="journey-view" type="button" hidden>View session</button><button id="journey-compare" type="button" title="Compare this live session with up to five earlier saved sessions">Compare with previous</button></div>`;
}
export function paintJourneyStatus(model, savedDestination) {
    const status = document.getElementById('journey-status');
    if (!status) return;
    if (status.textContent !== model.text) status.textContent = model.text;
    status.style.color = model.warning ? 'var(--panel-warning)' : 'var(--panel-secondary)';
    const detail = document.getElementById('journey-detail');
    detail.textContent = model.detail; detail.hidden = !model.detail;
    document.getElementById('journey-actions').hidden = !!model.replaying;
    const keep = document.getElementById('journey-keep'); keep.disabled = !model.canKeep; keep.textContent = model.keepLabel;
    document.getElementById('journey-compare').disabled = !model.canKeep;
    const view = document.getElementById('journey-view'); view.hidden = !model.canView;
    for (const [id, active] of [['btn-live', !savedDestination], ['btn-control-library', savedDestination]]) {
        const button = document.getElementById(id);
        if (button) { button.setAttribute('aria-current', active ? 'page' : 'false'); }
    }
}
