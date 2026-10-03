const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const eslintScope = require('eslint-scope');
const {hash} = require('./helpers/structure.cjs');
const root = path.join(__dirname, '..');
const baseline = require('./fixtures/3.4.0-structure.json');
const modules = fs.readdirSync(path.join(root, 'src')).filter(file => file.endsWith('.js')).map(file => {
  const source = fs.readFileSync(path.join(root, 'src', file), 'utf8');
  return {file, ast: acorn.parse(source, {ecmaVersion: 2022, sourceType: 'module', ranges: true})};
});

test('all 196 extracted functions preserve the 3.4.0 logic, markup, styles and strings', () => {
  const actual = {};
  for (const {ast} of modules) {
    for (const node of ast.body) {
      const fn = node.type === 'ExportNamedDeclaration' && node.declaration;
      if (!fn || fn.type !== 'FunctionDeclaration' || fn.id.name === 'initializeRuntime') continue;
      assert(!(fn.id.name in actual), 'duplicate function: ' + fn.id.name);
      actual[fn.id.name] = hash(fn);
    }
  }
  assert.deepEqual(actual, baseline.functions);
});

test('runtime initialization preserves preference loading, startup order and public API', () => {
  const runtime = modules.find(m => m.file === 'runtime.js');
  const fn = runtime.ast.body.find(n => n.declaration?.id?.name === 'initializeRuntime').declaration;
  assert.equal(hash(fn.body.body, baseline.stateNames), baseline.initialization);
  const main = modules.find(m => m.file === 'main.js');
  assert.equal(hash(main.ast.body.at(-1)), baseline.windowExport);
});

test('module dependencies are explicit and the built script preserves userscript permissions', () => {
  const allowed = new Set([...baseline.browserGlobals, '__TIERSCOPE_VERSION__']);
  for (const {file,ast} of modules) {
    const scope = eslintScope.analyze(ast, {ecmaVersion: 2022, sourceType: 'module'});
    const unresolved = [...new Set(scope.globalScope.through.map(ref => ref.identifier.name))].filter(name => !allowed.has(name));
    assert.deepEqual(unresolved, [], 'missing imports in ' + file);
  }
  const script = fs.readFileSync(path.join(root, 'tierscope.user.js'), 'utf8');
  const header = script.slice(0, script.indexOf('// ==/UserScript==') + '// ==/UserScript=='.length);
  assert.equal(header.replace(/^\/\/ @version\s+.*$/m, '// @version      <version>'), baseline.header);
  assert(!/\b(?:import|export)\s+(?:\{|\*|default|function|const|let|var)/.test(script), 'installed script needs no module loader');
  assert(!script.includes('__test:') && !script.includes('__ath:'), 'test hooks do not ship');
});
