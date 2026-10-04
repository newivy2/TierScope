const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const {sessionWrites} = require('./helpers/ownership.cjs');
const root = path.join(__dirname, '../src');
const owner = fs.readFileSync(path.join(root, 'live-session.js'), 'utf8');
const ast = acorn.parse(owner, {ecmaVersion: 2022, sourceType: 'module'});
const fields = new Set(ast.body.find(n => n.declaration?.declarations?.[0]?.id.name === 'LIVE_SESSION_FIELDS')
  .declaration.declarations[0].init.arguments[0].elements.map(n => n.value));

test('only the session owner and bootstrap write live-session fields', () => {
  for (const file of fs.readdirSync(root).filter(name => name.endsWith('.js'))) {
    if (['live-session.js', 'bootstrap.js'].includes(file)) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.deepEqual(sessionWrites(source, fields), [], file);
    assert(!/\bliveSessionState\b/.test(source), file + ' reaches private session state');
  }
});

test('ownership guard catches direct, nested, destructured and aliased mutations without banning copies', () => {
  for (const mutation of [
    'runtime.isPaused = true', 'runtime.history.red.push(2)', 'delete runtime.sessionHighs.red',
    'const r = runtime; r.roomTotal++', 'const history = runtime.history; history.red[0] = 3',
    'const {history: h} = runtime; const {red} = h; red.sort()',
    'const users = runtime.users; users.clear()', 'runtime.users.get("name").tier = "red"',
    'Object.assign(runtime.previousCounts, {red: 3})', 'Reflect.set(runtime, "isPaused", true)',
  ]) assert(sessionWrites(mutation, fields).length, mutation);
  assert.deepEqual(sessionWrites('const copy = runtime.history.red.slice(); copy.push(3); const s = {...runtime.sessionHighs}; s.red = null; runtime.playback = null;', fields), []);
});

test('the session owner has no effectful imports or browser/storage/timer dependencies', () => {
  assert(!ast.body.some(node => node.type === 'ImportDeclaration'));
  assert(!/\b(?:document|window|location|fetch|runtime|GM_\w+|setTimeout|setInterval|clearTimeout|clearInterval)\s*[.(]/.test(owner));
  assert(!/\bDate\.now\(/.test(owner), 'callers supply time explicitly');
  const exported = ast.body.filter(node => node.type === 'ExportNamedDeclaration').map(node => node.declaration.id?.name || node.declaration.declarations?.[0].id.name);
  assert(!exported.includes('liveSessionState'));
});

test('only the playback owner and bootstrap write playback state', () => {
  const protectedFields = new Set(['playback', 'presentationMode', 'sessionFileLoadGeneration']);
  for (const file of fs.readdirSync(root).filter(name => name.endsWith('.js'))) {
    if (['playback-state.js', 'bootstrap.js'].includes(file)) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.deepEqual(sessionWrites(source, protectedFields, file === 'replay.js' ? new Set(['state']) : new Set()), [], file);
    assert(!/\b(?:playbackState|playbackRecords)\b/.test(source), file + ' reaches private playback state');
  }
  assert(sessionWrites('function paint(state) {state.playing = false;}', protectedFields, new Set(['state'])).length);
});
