const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const eslintScope = require('eslint-scope');

// Existing fixtures describe the pre-refactor state names. Adapt only their
// unresolved references after injection, so the same assertions exercise the
// shipped bundle. No test hooks or compatibility aliases enter production.
const stateNames = new Set([...fs.readFileSync(path.join(__dirname, '../../src/runtime.js'), 'utf8')
  .matchAll(/\bruntime\.([A-Za-z_$][\w$]*)\s*=/g)].map(match => match[1]));
const cache = new Map();

// Bundlers may print shorthand properties and 2e3 instead of 2000. Restore
// just the fixtures' two injection anchors in memory, without changing logic.
function prepareSource(source) {
  const property = /\bdownloadTrackingReport: downloadTrackingReport,|\bdownloadTrackingReport,(?=\s*downloadTrackingCSV)/;
  if (!property.test(source)) throw new Error('Userscript test injection point is missing.');
  // The installed script has no page API. Expose its private tracker only in
  // this test copy, after initialization, for the existing regression hooks.
  return source.replace(/\b(?:var|const) ViewerTracker = initializeRuntime\(\);/,
      '$&\n  window.ViewerTracker = ViewerTracker;')
    .replace(property, 'downloadTrackingReport: downloadTrackingReport,')
    .replaceAll('scheduleInit(2e3);', 'scheduleInit(2000);');
}

function instrument(source) {
  if (cache.has(source)) return cache.get(source);
  const original = source;
  const ast = acorn.parse(source, {ecmaVersion: 2022, ranges: true});
  const parents = new Map();
  function visit(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.type === 'string') parents.set(node, parent);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'range') continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, node));
      else if (value && typeof value.type === 'string') visit(value, node);
    }
  }
  visit(ast, null);
  const scope = eslintScope.analyze(ast, {ecmaVersion: 2022});
  const edits = new Map();
  for (const ref of scope.globalScope.through) {
    const id = ref.identifier;
    if (!stateNames.has(id.name)) continue;
    const parent = parents.get(id);
    const shorthand = parent.type === 'Property' && parent.shorthand && parent.value === id;
    edits.set(id.start, {start: id.start, end: id.end, text: (shorthand ? id.name + ': ' : '') + 'runtime.' + id.name});
  }
  for (const edit of [...edits.values()].sort((a,b) => b.start - a.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  if (cache.size >= 16) cache.delete(cache.keys().next().value);
  cache.set(original, source);
  return source;
}

module.exports = { instrument, prepareSource };
