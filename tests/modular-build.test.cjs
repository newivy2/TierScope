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

// Deliberate fixes and features have behavioral coverage; keep the original baseline
// untouched so every other function still proves the extraction preserved it.
const reviewedChanges = new Set([
  // Data-only presentation models and views: presentation-boundaries.test.cjs + browser suites.
  'createPlaybackSnapshot', 'renderDisplayFrame', 'updateCompactDashboard',
  'updateCollapsedRowStatus', 'updateTrendDisplay',
  // Playback owner operations: playback-ownership.test.cjs and existing replay/files/ATH browser suites.
  'openSessionReplay',
  'readSessionFile',
  'toggleHighMode',
  'addFileToAllTimeHighs',
  'clearAllTimeHighs',
  'getPlaybackFrame',
  'setPlaybackSamplePosition',
  'stopPlaybackClock',
  'startPlaybackClock',
  'paintPlayback',
  'enterPlayback',
  'leavePlayback',
  'tickPlayback',
  'togglePlayback',
  'scrubPlayback',
  'stepPlayback',
  'setPlaybackSpeed',
  'performScanThenReturn', // durable commit boundary: review-regressions.test.cjs
  'log', // throwing console: review-regressions.test.cjs
  'acquireDOMSnapshot', // tab restoration: browser.cjs
  'generateGifFromHistory', // bundled encoder: gif.test.cjs
  'updateHighControls', // SH/ATH retention explanation: review-regressions.test.cjs
  'saveSession', // save failure feedback: session-tools.test.cjs
  'updateAcquisitionStatus', // save failure feedback: session-tools.test.cjs
  'updateMiniFreshness', // save failure feedback: session-tools-browser.cjs
  'bindPanelOptions', // session tools entry and cleanup: session-tools-browser.cjs
  'updatePanelOptions', // save status in options: session-tools-browser.cjs
  'createPanel', // direct replay Keep in library control: session-files-browser.cjs
  'acquireRoomSnapshot', // non-throwing warnings: maintenance-regressions.test.cjs
  'validateDOMHealth', // non-throwing diagnostics: maintenance-regressions.test.cjs
  'getModelNameFromUrl', // complete room routes: maintenance-regressions.test.cjs
  'isBroadcastRoom', // shared room parser: maintenance-regressions.test.cjs
  'resetAllTracking', // valid room required before confirmation: maintenance-regressions.test.cjs
  'resetTrackingData', // valid room required before mutation: maintenance-regressions.test.cjs
  'updateStopControls', // disabled directory Reset: all-time-highs-browser.cjs
  // Live-session ownership: state-ownership.test.cjs, session.test.cjs,
  // stop-absence.test.cjs, startup.test.cjs and review-regressions.test.cjs.
  'getAnonymousCount', 'getSessionHigh', 'syncHighTimes', 'saveToHistory',
  'nextBroadcasterAbsence', 'checkAbsenceStop', 'stopTracking', 'startNewSession',
  'startTrackingTimer', 'pauseTrackingTimer', 'stopTrackingTimer',
  'pauseAutoRefresh', 'toggleAutoRefresh', 'updateDisplay', 'checkBroadcasterReturn',
  'acceptRoomSnapshot', 'init', 'checkUrlChange', 'restoreSessionState', 'loadSession',
]);
const featureModules = new Set(['display-model.js', 'display-values.js', 'immutable-data.js', 'presentation-data.js', 'status-model.js', 'status-view.js', 'trend-view.js', 'playback-state.js', 'live-session.js', 'diagnostics.js', 'room-context.js', 'backup.js', 'data-io.js', 'session-analysis.js', 'session-health.js', 'session-library.js', 'session-tools.js']);
const addedFunctions = new Set(['getSessionSamplePolicy', 'initializePresentation', 'paintPanelFrame', 'getSessionWriteStatus', 'writeSessionRecord']); // shared history-gap policy; session/ownership tests

test('unchanged extracted functions preserve 3.4.0; reviewed changes have behavior coverage', () => {
  const actual = {};
  for (const {file, ast} of modules) {
    if (featureModules.has(file)) continue;
    for (const node of ast.body) {
      const fn = node.type === 'ExportNamedDeclaration' && node.declaration;
      if (!fn || fn.type !== 'FunctionDeclaration' || fn.id.name === 'initializeRuntime' || addedFunctions.has(fn.id.name)) continue;
      assert(!(fn.id.name in actual), 'duplicate function: ' + fn.id.name);
      actual[fn.id.name] = hash(fn);
    }
  }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(baseline.functions).sort());
  for (const [name, fingerprint] of Object.entries(actual)) {
    if (reviewedChanges.has(name)) assert.notEqual(fingerprint, baseline.functions[name], name + ' no longer needs an exception');
    else assert.equal(fingerprint, baseline.functions[name], name);
  }
});

test('runtime initialization preserves preference loading and startup order', () => {
  const runtime = modules.find(m => m.file === 'bootstrap.js');
  const fn = runtime.ast.body.find(n => n.declaration?.id?.name === 'initializeRuntime').declaration;
  const body = fn.body.body;
  const bindings = body.filter(n => n.expression?.callee?.name === 'initializeLiveSession');
  assert.equal(bindings.length, 1, 'bind the owner once after its defaults');
  assert.deepEqual(bindings[0].expression.arguments.map(n => n.name), ['runtime']);
  const index = body.indexOf(bindings[0]);
  assert.equal(body[index - 1].expression.left.property.name, 'lastUrl');
  const playbackBinding = body[index + 1];
  assert.equal(playbackBinding.expression.callee.name, 'initializePlaybackState');
  assert.equal(playbackBinding.expression.arguments[0].name, 'runtime');
  const presentationBinding = body[index + 2];
  assert.equal(presentationBinding.expression.callee.name, 'initializePresentation');
  assert.deepEqual(presentationBinding.expression.arguments[0].properties.map(p => [p.key.name, p.value.name]),
    [['refreshOptions', 'updatePanelOptions'], ['refreshReplayAvailability', 'updateReplayAvailability']]);
  assert.equal(body[index + 3].expression.left.property.name, 'urlCheckInterval');
  // Preserve every original default, preference read and effect in order.
  assert.equal(hash(body.filter(n => n !== bindings[0] && n !== playbackBinding && n !== presentationBinding), baseline.stateNames), baseline.initialization);
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
  const expectedHeader = baseline.header.replace(/^\/\/ @grant\s+unsafeWindow\n/m, '')
    .replace(/^\/\/ @require\s+.*\n/m, '');
  assert.equal(header.replace(/^\/\/ @version\s+.*$/m, '// @version      <version>'), expectedHeader);
  assert(script.includes(fs.readFileSync(path.join(root, 'THIRD_PARTY_LICENSES.txt'), 'utf8').trimEnd()), 'encoder license ships in the script');
  assert(!/unsafeWindow|window\.ViewerTracker/.test(script), 'no page control API');
  assert(!/\b(?:import|export)\s+(?:\{|\*|default|function|const|let|var)/.test(script), 'installed script needs no module loader');
  assert(!script.includes('__test:') && !script.includes('__ath:'), 'test hooks do not ship');
});

test('application diagnostics only access the console through the non-throwing adapter', () => {
  for (const {file, ast} of modules) {
    if (file === 'diagnostics.js') continue;
    const scope = eslintScope.analyze(ast, {ecmaVersion: 2022, sourceType: 'module'});
    assert(!scope.globalScope.through.some(ref => ref.identifier.name === 'console'), file + ' bypasses safe diagnostics');
  }
});
