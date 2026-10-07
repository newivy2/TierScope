
export function libraryShell() {
    // Scope stays in front of Library in both attached and narrow-window layouts.
    return `<style>
#tracker-container[data-library-open=docked]{border-top-left-radius:0!important;border-bottom-left-radius:0!important}
#tierscope-session-tools{position:fixed;inset:auto;margin:0;padding:0;box-sizing:border-box;max-width:none;max-height:none;min-width:0;border:1px solid #ff69b4;border-radius:7px 0 0 7px;background:var(--panel-solid);color:var(--panel-text);font:11px/1.45 Arial,sans-serif;z-index:999998;box-shadow:-8px 5px 24px #0004;overflow:hidden;display:flex;flex-direction:column;container:tierscope-library / inline-size}
#tierscope-session-tools[data-layout=sheet]{border-radius:7px;box-shadow:0 8px 32px #0007}
#tierscope-session-tools[data-layout=docked]::after{content:'';position:absolute;pointer-events:none;inset:0 0 0 auto;width:9px;background:linear-gradient(90deg,transparent,#0002);border-right:1px solid #ff69b450}
#tierscope-session-tools *{box-sizing:border-box}
#tierscope-session-tools button,#tierscope-session-tools select,#tierscope-session-tools input,#tierscope-session-tools textarea,#tierscope-session-tools summary{font:inherit;color:var(--panel-text);background:var(--panel-button);border:1px solid var(--panel-divider);border-radius:3px;padding:4px 7px;max-width:100%;min-width:0}
#tierscope-session-tools button,#tierscope-session-tools summary{cursor:pointer}
#tierscope-session-tools button:hover,#tierscope-session-tools summary:hover{border-color:var(--panel-accent)}
#tierscope-session-tools button:disabled{opacity:.45;cursor:default}
#tierscope-session-tools :is(button,select,input,textarea,summary):focus-visible{outline:2px solid #ff69b4;outline-offset:2px}
#tierscope-session-tools .tools-primary{background:#ff69b420;border-color:#ff69b4;color:var(--panel-accent);font-weight:bold}
#tierscope-session-tools .tools-quiet,#tierscope-session-tools .tools-quiet:hover{border-color:transparent;background:transparent}
#tierscope-session-tools .tools-follow{padding:5px 0;border-bottom:1px solid var(--panel-divider)}
#tierscope-session-tools .tools-follow>label{color:var(--panel-accent);font-weight:bold}
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
#tierscope-session-tools .tools-folder{margin:5px 0;display:flex;gap:5px;align-items:stretch}
#tierscope-session-tools .tools-folder .tools-folder-open{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;text-align:left;padding:9px;border-left:3px solid #ff69b480;background:rgba(var(--panel-row-rgb),.04)}
#tierscope-session-tools .tools-folder-actions{display:flex;flex-direction:column;justify-content:center;gap:4px;flex-shrink:0}
#tierscope-session-tools .tools-folder-name{font-weight:bold;color:var(--panel-text);overflow-wrap:anywhere}
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
#tools-room-shortcuts button{overflow-wrap:anywhere;text-align:left}
#tools-history-table button{max-width:155px;text-align:left;overflow-wrap:anywhere}
#tools-history-table button[aria-pressed=true]{color:var(--panel-accent);border-color:var(--panel-accent)}
#tools-history-chart{cursor:crosshair}
#tierscope-session-tools label{display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap;min-width:0;max-width:100%}
#tierscope-session-tools select{width:auto;max-width:100%}
#tools-source-a,#tools-source-b{width:100%}
#tierscope-session-tools .tools-filters{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;padding:9px 0;border-block:1px solid var(--panel-divider);margin-top:8px}
#tierscope-session-tools .tools-model-filters{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:6px 10px;align-items:end}
#tierscope-session-tools .tools-model-filter,#tierscope-session-tools .tools-sort-filter{display:grid;gap:3px;color:var(--panel-muted)}
#tierscope-session-tools .tools-favorites-filter{grid-column:1/-1;font-size:.95em}
#tierscope-session-tools .tools-date-filters{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#tierscope-session-tools .tools-date-filters label{display:flex;flex-wrap:nowrap;gap:4px;font-size:.9em}
#tierscope-session-tools .tools-date-filters input[type=date]{width:100%;min-width:0;flex:1;padding:4px 2px}
#tierscope-session-tools .tools-current[hidden],#tierscope-session-tools #tools-threshold-controls[hidden]{display:none}
#tierscope-session-tools [data-card-enable][hidden],#tierscope-session-tools [data-card-retry][hidden]{display:none}
#tierscope-session-tools .tools-model-name{display:flex;align-items:center;gap:5px;margin-bottom:4px}
#tierscope-session-tools .tools-model-name strong{min-width:0}
#tierscope-session-tools [data-card-star]{font-size:1.5em;padding:0 3px;border:0;background:transparent;line-height:1.2}
#tierscope-session-tools .tools-exports{gap:4px;margin:5px 0 8px}
#tierscope-session-tools .tools-exports button{padding:2px 5px;font-size:.9em}
#tierscope-session-tools .tools-history-shortcut button,#tierscope-session-tools .tools-history-keep{color:var(--panel-accent)}
#tierscope-session-tools .tools-history-shortcut[hidden]{display:none}
#tierscope-session-tools #session-save-info{font-size:.85em;margin-top:4px}
#tierscope-session-tools .tools-library-bulk{gap:4px;font-size:.9em}
#tierscope-session-tools .tools-library-bulk button{padding:3px 5px}
#tierscope-session-tools #tools-library-storage{margin:7px 0;font-size:.95em}
#tierscope-session-tools #tools-library-storage>p{margin:4px 0}
#tierscope-session-tools #tools-storage-settings>summary{display:inline-block;padding:1px 0;color:var(--panel-accent);background:transparent;border:0;font-size:.95em}
#tierscope-session-tools #tools-storage-settings[open]{border:1px solid var(--panel-divider);border-radius:4px;padding:7px;margin-top:5px}
#tierscope-session-tools .tools-capacity-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#tierscope-session-tools .tools-capacity-fields label{display:grid;gap:3px}
#tierscope-session-tools .tools-capacity-fields input{width:100%}
#tierscope-session-tools .tools-capacity-warning{color:var(--panel-warning);font-size:.95em}
#tools-library-selected{flex-basis:100%}
#tools-library-selection{margin-top:8px}
#tierscope-session-tools #tools-sessions-book{margin-top:10px}
#tierscope-session-tools #tools-sessions-book>summary{padding:7px 9px;color:var(--panel-accent);font-weight:bold;background:#ff69b412;border-color:#ff69b470}
#tools-library-search-menu{margin-top:8px}
#tierscope-session-tools #tools-library-search-menu>summary{background:transparent;color:var(--panel-muted)}
#tierscope-session-tools #tools-library-search-menu .tools-filters{margin-top:0;border-top:0}
#tierscope-session-tools .tools-auto-keep{display:inline-flex;align-items:center;gap:5px;margin:0 0 0 5px;font-size:.92em}
#tierscope-session-tools .tools-auto-keep[data-locked=true]{color:var(--panel-accent)}
#tierscope-session-tools .tools-auto-keep input:disabled{opacity:1}
#tierscope-session-tools .tools-library-management{border-top:1px solid var(--panel-divider);padding-top:9px;margin-top:12px}
#tools-library-selection>summary{font-size:.9em;background:transparent;color:var(--panel-muted)}

#tierscope-session-tools .tools-filters select{width:100%}
#tierscope-session-tools .tools-filters .tools-search{margin:0}
#tierscope-session-tools .tools-search input{flex:1;width:100%}
#tierscope-session-tools textarea{display:block;width:100%;resize:vertical}
#tierscope-session-tools .tools-recording-note{white-space:pre-wrap;overflow-wrap:anywhere;max-height:85px;overflow:auto;color:var(--panel-muted)}
#tierscope-session-tools .tools-chart-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
#tierscope-session-tools .tools-chart-legend label{flex-wrap:nowrap;min-width:0}
#tierscope-session-tools .tools-chart-legend span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tierscope-session-tools .tools-chart-legend .tools-series-swatch{width:13px;flex-shrink:0;border-top:2px solid currentColor}
#tierscope-session-tools .tools-metric-strip{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:3px;margin:9px 0 3px}
#tierscope-session-tools .tools-metric-strip button{display:flex;align-items:center;justify-content:center;padding:2px 0;height:2.5em;background:transparent;border-color:transparent}
#tierscope-session-tools .tools-metric-strip button:hover{border-color:var(--panel-muted);background:rgba(var(--panel-row-rgb),.06)}
#tierscope-session-tools .tools-metric-strip button[aria-checked=true]{border-color:var(--panel-accent);background:#ff69b420;box-shadow:inset 0 -2px var(--panel-accent)}
#tierscope-session-tools .tools-metric-strip button:focus-visible{outline:2px solid var(--panel-accent);outline-offset:1px}
#tierscope-session-tools .tools-metric-icon{font-size:1.3em;line-height:1;color:var(--metric-color);white-space:nowrap}
#tierscope-session-tools .tools-metric-circle{width:1.1em;height:1.1em;border-radius:50%;background:var(--metric-color);box-shadow:0 0 0 1px var(--panel-muted)}
@container tierscope-library (max-width:30em){#tierscope-session-tools .tools-metric-strip{grid-template-columns:repeat(6,minmax(0,1fr))}}
#tierscope-session-tools .tools-metric-caption{color:var(--panel-secondary);font-weight:bold;margin:0 0 7px}
#tierscope-session-tools .tools-comparison-range{margin:8px 0}
#tools-analysis-chart{touch-action:pan-y;cursor:crosshair}
#tools-analysis-chart:focus-visible{outline:2px solid var(--panel-accent);outline-offset:2px}
#tools-review-notes{margin:6px 12px 0;text-align:left;color:var(--panel-accent)!important;flex-shrink:0}
#tools-review-notes[hidden]{display:none}
#gif-export-controls{padding:8px 12px;gap:6px;align-items:center;flex-shrink:0;border-bottom:1px solid var(--panel-divider)}
</style>
<div class="tools-head"><div><h2 id="tools-title">Library</h2><div class="tools-subtitle">Session Storage and Analysis</div></div><button id="tools-close" type="button" aria-label="Close library" title="Close library (Escape)">×</button></div>
<nav aria-label="Session tools"><button data-tools-tab="library">Sessions</button><button data-tools-tab="summary">Summary</button><button data-tools-tab="compare">Compare</button><button data-tools-tab="backup">Backup</button></nav>
<button id="tools-review-notes" type="button" hidden></button>
<div id="tools-message" role="status" aria-live="polite"></div>
<div id="gif-export-controls" style="display:none"><span id="gif-export-status" role="status"></span><button id="btn-cancel-gif" hidden type="button">Cancel</button></div>
<div id="tools-content"></div>`;
}
