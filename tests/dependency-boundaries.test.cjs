const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const root = path.join(__dirname, '../src');
const modules = Object.fromEntries(fs.readdirSync(root).filter(file => file.endsWith('.js')).map(file => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  return [file, {source, ast: acorn.parse(source, {ecmaVersion: 2022, sourceType: 'module'})}];
}));
const graph = Object.fromEntries(Object.entries(modules).map(([file, {ast}]) => [file,
  ast.body.filter(n => n.type === 'ImportDeclaration' && n.source.value.startsWith('.')).map(n => path.basename(n.source.value))]));
function dependencies(from, seen = new Set()) {
  if (seen.has(from)) return seen;
  seen.add(from);
  for (const to of graph[from]) dependencies(to, seen);
  return seen;
}
function walk(node, fn, parent = null) {
  if (!node || typeof node !== 'object' || !node.type) return;
  fn(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, fn, node));
    else walk(value, fn, node);
  }
}
// Do not let a low-level module evade field checks by passing/aliasing runtime.
function runtimeFields(ast) {
  const fields = new Set();
  walk(ast, (node, parent) => {
    if (node.type !== 'Identifier' || node.name !== 'runtime' || parent.type === 'ImportSpecifier') return;
    if (parent.type === 'VariableDeclarator' && parent.id === node && parent.init?.type === 'ObjectExpression' && !parent.init.properties.length) return;
    assert.equal(parent.type, 'MemberExpression', 'runtime must be read through an explicit field');
    assert.equal(parent.object, node);
    assert.equal(parent.computed, false, 'runtime fields must be statically named');
    fields.add(parent.property.name);
  });
  return fields;
}

test('all application imports form an acyclic dependency graph', () => {
  const actual = Object.entries(graph).flatMap(([from, imports]) =>
    imports.filter(to => dependencies(to).has(from)).map(to => from + ' -> ' + to));
  assert.deepEqual(actual, [], 'resolve cycles instead of adding controller exceptions');
});

test('panel views have no dependency on owners, live selectors, controllers or storage', () => {
  const views = ['library-capacity-view.js', 'favorite-view.js', 'panel-view.js', 'compact-view.js', 'trend-view.js', 'status-view.js', 'chart-view.js', 'library-dock.js', 'library-shell.js', 'model-history-view.js', 'library-browser-view.js', 'tools-view-helpers.js', 'analysis-chart-view.js', 'analysis-metric-view.js', 'recording-export-data.js'];
  const permitted = new Set([...views, 'library-capacity-data.js', 'library-query.js', 'analysis-chart-data.js', 'analysis-clock-data.js', 'display-values.js', 'format.js', 'history-data.js', 'theme-values.js', 'runtime.js']);
  for (const view of views) {
    assert.deepEqual([...dependencies(view)].filter(file => !permitted.has(file)), [], view);
  }
  // Chart/theme helpers may read visual preferences and maintain an axis cache;
  // no live/playback object can reach a renderer through the compatibility view.
  const allowedFields = new Set(['currentScale', 'CHART_WINDOWS', 'chartWindowMode', 'PANEL_THEME_COLORS',
    'isDarkMode', 'chartTimeCache', 'API_TIMEOUT_MS']);
  for (const file of permitted) {
    assert.deepEqual([...runtimeFields(modules[file].ast)].filter(field => !allowedFields.has(field)), [], file);
    assert(!/\bGM_\w+\b/.test(modules[file].source), file + ' accesses storage');
  }
});

test('record stores and validation cannot reach session/playback owners, panel code or coordinators', () => {
  const stores = ['ath-retention.js', 'library-capacity.js', 'library-models.js', 'library-transfer.js', 'storage.js', 'highs-store.js', 'session-library.js', 'backup.js', 'session-file-format.js'];
  const permitted = new Set([...stores, 'library-capacity-data.js', 'immutable-data.js', 'analysis-preference-data.js', 'session-analysis.js', 'record-validation.js', 'history-data.js', 'utils.js', 'diagnostics.js', 'room-context.js', 'runtime.js']);
  const metadata = new Set(['activeRoomEpoch', 'activeSessionStorageKey', 'sessionRecordWarnings', 'sessionStorageNotice',
    'sessionStorageStatus', 'tabRecords', 'allTimeCache', 'chartTimeCache',
    // Backup captures preferences as data; applying them belongs to session tools.
    'chartWindowMode', 'collapsedRows', 'highMode', 'isDarkMode', 'miniMetric', 'panelGeometry']);
  for (const store of stores) assert.deepEqual([...dependencies(store)].filter(file => !permitted.has(file)), [], store);
  for (const file of permitted) {
    assert.deepEqual([...runtimeFields(modules[file].ast)].filter(field => !/^[A-Z][A-Z0-9_]*$/.test(field) && !metadata.has(field)), [], file);
    assert(!/\b(?:document|alert|confirm|setInterval|clearInterval)\b/.test(modules[file].source), file + ' directs presentation or playback');
  }
});

test('owners and data/view layers remain outside every import cycle', () => {
  const protectedModules = ['acquisition-state.js', 'panel-preferences.js', 'live-session.js', 'playback-state.js', 'playback-data.js', 'display-model.js', 'presentation-data.js',
    'presentation.js', 'presentation-status.js', 'status-model.js', 'session-selectors.js', 'session-capture.js', 'high-selectors.js',
    'request-policy.js', 'storage.js', 'highs-store.js', 'backup.js', 'session-library.js', 'session-file-format.js',
    'panel-view.js', 'compact-view.js', 'trend-view.js', 'status-view.js', 'chart-view.js', 'library-dock.js', 'library-shell.js', 'model-history-view.js', 'library-browser-view.js', 'tools-view-helpers.js', 'analysis-chart-view.js', 'analysis-metric-view.js', 'recording-export-data.js'];
  for (const file of protectedModules) {
    assert(!graph[file].some(dependency => dependencies(dependency).has(file)), file);
  }
});

test('drawing health and analysis preferences cannot depend on session or presentation controllers', () => {
  const permitted = new Set(['presentation-health.js', 'analysis-preferences.js', 'analysis-preference-data.js', 'session-analysis.js', 'model-history.js', 'library-query.js', 'analysis-chart-data.js', 'analysis-clock-data.js', 'library-drafts.js', 'analysis-follow.js']);
  for (const file of permitted) {
    assert.deepEqual([...dependencies(file)].filter(dependency => !permitted.has(dependency)), [], file);
    assert.deepEqual([...runtimeFields(modules[file].ast)], [], file);
    assert(!/\b(?:document|location|alert|confirm|setInterval|clearInterval)\b/.test(modules[file].source), file + ' directs presentation');
    if (file !== 'analysis-preferences.js') assert(!/\bGM_\w+\b/.test(modules[file].source), file + ' accesses storage');
  }
});
