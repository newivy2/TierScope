
export function libraryShell() {
    // Scope stays in front of Library in both attached and narrow-window layouts.
    return `<style>
#tracker-container[data-library-open=docked]{border-top-left-radius:0!important;border-bottom-left-radius:0!important}
#tierscope-session-tools{position:fixed;inset:auto;margin:0;padding:0;box-sizing:border-box;max-width:none;max-height:none;min-width:0;border:1px solid #ff69b4;border-radius:7px 0 0 7px;background:var(--panel-solid);color:var(--panel-text);font:11px/1.45 Arial,sans-serif;z-index:999998;box-shadow:-8px 5px 24px #0004;overflow:hidden;display:flex;flex-direction:column}
#tierscope-session-tools[data-layout=sheet]{border-radius:7px;box-shadow:0 8px 32px #0007}
#tierscope-session-tools[data-layout=docked]::after{content:'';position:absolute;pointer-events:none;inset:0 0 0 auto;width:9px;background:linear-gradient(90deg,transparent,#0002);border-right:1px solid #ff69b450}
#tierscope-session-tools *{box-sizing:border-box}
#tierscope-session-tools button,#tierscope-session-tools select,#tierscope-session-tools input,#tierscope-session-tools summary{font:inherit;color:var(--panel-text);background:var(--panel-button);border:1px solid var(--panel-divider);border-radius:3px;padding:4px 7px;max-width:100%;min-width:0}
#tierscope-session-tools button,#tierscope-session-tools summary{cursor:pointer}
#tierscope-session-tools button:hover,#tierscope-session-tools summary:hover{border-color:var(--panel-accent)}
#tierscope-session-tools button:disabled{opacity:.45;cursor:default}
#tierscope-session-tools :is(button,select,input,summary):focus-visible{outline:2px solid #ff69b4;outline-offset:2px}
#tierscope-session-tools .tools-primary{background:#ff69b420;border-color:#ff69b4;color:var(--panel-accent);font-weight:bold}
#tierscope-session-tools .tools-danger{color:var(--panel-negative)}
#tierscope-session-tools .tools-head{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid #ff69b4;background:rgba(255,105,180,.06);flex-shrink:0}
#tierscope-session-tools h2{font-size:1.15em;letter-spacing:.04em;margin:0;color:var(--panel-accent)}
#tierscope-session-tools .tools-subtitle{font-size:.9em;color:var(--panel-muted)}
#tierscope-session-tools nav{display:flex;gap:3px;padding:8px 10px 0;flex-shrink:0}
#tierscope-session-tools nav button{flex:1;padding:5px 2px;font-size:.95em;background:transparent;border-color:transparent;border-bottom:2px solid transparent;border-radius:3px 3px 0 0}
#tierscope-session-tools nav button[aria-pressed=true]{color:var(--panel-accent);background:#ff69b412;border-bottom-color:#ff69b4}
#tools-content{padding:10px 12px 14px;overflow:auto;min-height:0;flex:1;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#ff69b470 transparent}
#tools-message:not(:empty){padding:7px 12px;border-bottom:1px solid var(--panel-divider);font-size:.95em;white-space:pre-line;overflow-wrap:anywhere;flex-shrink:0}
#tierscope-session-tools .tools-actions{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:8px 0}
#tierscope-session-tools .tools-muted{color:var(--panel-muted);font-size:.92em;line-height:1.45}
#tierscope-session-tools p{margin:6px 0 9px}
#tierscope-session-tools h3{font-size:1em;margin:8px 0;color:var(--panel-secondary)}
#tierscope-session-tools .tools-current{border:1px solid #4169e170;background:rgba(65,105,225,.08);border-radius:4px;padding:9px;margin-bottom:10px}
#tierscope-session-tools .tools-current strong{display:block;font-size:1.1em;overflow-wrap:anywhere}
#tierscope-session-tools .tools-eyebrow{color:var(--panel-accent);text-transform:uppercase;font-size:.8em;letter-spacing:.08em;margin-bottom:3px}
#tierscope-session-tools .tools-row{border:1px solid var(--panel-divider);border-left:3px solid #ff69b480;background:rgba(var(--panel-row-rgb),.035);border-radius:4px;padding:8px;margin:6px 0;overflow-wrap:anywhere}
#tierscope-session-tools .tools-row strong{font-size:1.05em}
#tierscope-session-tools .tools-folder{margin:5px 0}
#tierscope-session-tools .tools-folder button{display:flex;flex-direction:column;gap:4px;width:100%;text-align:left;padding:9px;border-left:3px solid #ff69b480;background:rgba(var(--panel-row-rgb),.04)}
#tierscope-session-tools .tools-folder-name{font-weight:bold;color:var(--panel-text)}
#tierscope-session-tools .tools-folder-meta{font-size:.9em;color:var(--panel-muted)}
#tierscope-session-tools .tools-search{display:flex;width:100%;gap:6px;align-items:center;margin:8px 0}
#tools-library-search{flex:1;width:100%}
#tierscope-session-tools .tools-more{margin-left:auto}
#tierscope-session-tools .tools-more[open]{flex-basis:100%;margin:0}
#tierscope-session-tools .tools-more[open] summary{display:inline-block;margin-bottom:4px}
#tierscope-session-tools .tools-more-actions{display:flex;gap:4px;flex-wrap:wrap;border-top:1px solid var(--panel-divider);padding-top:6px}
#tierscope-session-tools table{width:100%;border-collapse:collapse;font-size:.93em}
#tierscope-session-tools th,#tierscope-session-tools td{text-align:left;padding:6px 4px;border-bottom:1px solid var(--panel-divider)}
#tierscope-session-tools caption{text-align:left;font-weight:bold;padding:7px 0;color:var(--panel-secondary)}
#tierscope-session-tools .tools-scroll{overflow-x:auto}
#tierscope-session-tools canvas{display:block;width:100%;height:200px}
#tierscope-session-tools .tools-history-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}
#tierscope-session-tools .tools-history-stats>div{padding:7px;border:1px solid var(--panel-divider);border-radius:4px;background:rgba(var(--panel-row-rgb),.035)}
#tierscope-session-tools .tools-history-stats dt{font-size:.9em;color:var(--panel-muted)}
#tierscope-session-tools .tools-history-stats dd{margin:3px 0 0;font-weight:bold;color:var(--panel-secondary);overflow-wrap:anywhere}
#tools-history-recording{width:100%}
#tools-history-table button{max-width:155px;text-align:left;overflow-wrap:anywhere}
#tools-history-table button[aria-pressed=true]{color:var(--panel-accent);border-color:var(--panel-accent)}
#tools-history-chart{cursor:crosshair}
#tierscope-session-tools label{display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}
#tierscope-session-tools select{width:auto;max-width:100%}
#tools-source-a,#tools-source-b{width:100%}
#gif-export-controls{padding:8px 12px;gap:6px;align-items:center;flex-shrink:0;border-bottom:1px solid var(--panel-divider)}
</style>
<div class="tools-head"><div><h2 id="tools-title">LIBRARY</h2><div class="tools-subtitle">Recordings &amp; session tools</div></div><button id="tools-close" type="button" aria-label="Close library" title="Close library (Escape)">×</button></div>
<nav aria-label="Session tools"><button data-tools-tab="library">Recordings</button><button data-tools-tab="summary">Summary</button><button data-tools-tab="compare">Compare</button><button data-tools-tab="backup">Backup</button></nav>
<div id="tools-message" role="status" aria-live="polite"></div>
<div id="gif-export-controls" style="display:none"><span id="gif-export-status" role="status"></span><button id="btn-cancel-gif" hidden type="button">Cancel</button></div>
<div id="tools-content"></div>`;
}
