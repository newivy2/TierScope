const acorn = require('acorn');
const eslintScope = require('eslint-scope');

// A source guard for common direct/aliased writes, not a general effect system.
// Copies (slice/map/spread) remain writable. New helpers receiving shared objects
// still need review; runtime getters do not deeply freeze their returned values.
function sessionWrites(source, fields, ownedParameters = new Set()) {
  const ast = acorn.parse(source, {ecmaVersion: 2022, sourceType: 'module', ranges: true});
  const nodes = [], variables = new Map(), aliases = new Map();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type) nodes.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value?.type) visit(value);
    }
  }
  visit(ast);
  for (const scope of eslintScope.analyze(ast, {ecmaVersion: 2022, sourceType: 'module'}).scopes) {
    for (const variable of scope.variables) {
      for (const id of variable.identifiers) variables.set(id, variable);
      for (const ref of variable.references) variables.set(ref.identifier, variable);
    }
  }
  const key = node => node.computed ? node.property.value : node.property.name;
  function property(base, name) { return base === 'runtime' ? (!name || fields.has(name) ? 'session' : null) : base; }
  function origin(node) {
    if (!node) return null;
    if (node.type === 'Identifier') {
      if (node.name === 'runtime') return 'runtime';
      if (ownedParameters.has(node.name)) return 'session';
      const alias = aliases.get(variables.get(node));
      return alias && node.start >= alias.start ? alias.value : null;
    }
    if (node.type === 'MemberExpression') return property(origin(node.object), key(node));
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && ['get', 'at'].includes(key(node.callee))) return origin(node.callee.object);
    return null;
  }
  function bind(pattern, value, start) {
    if (!value) return;
    if (pattern.type === 'Identifier' && variables.has(pattern) && (!aliases.has(variables.get(pattern)) || aliases.get(variables.get(pattern)).start > start)) aliases.set(variables.get(pattern), {value, start});
    if (pattern.type === 'ObjectPattern') for (const item of pattern.properties) {
      if (item.type === 'Property') bind(item.value, property(value, item.key.name || item.key.value), start);
    }
  }
  let count;
  do {
    count = aliases.size;
    for (const node of nodes) {
      if (node.type === 'VariableDeclarator') bind(node.id, origin(node.init), node.end);
      if (node.type === 'AssignmentExpression' && node.operator === '=') bind(node.left, origin(node.right), node.end);
    }
  } while (aliases.size !== count);
  const mutators = new Set(['set', 'delete', 'clear', 'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);
  const violations = [];
  for (const node of nodes) {
    const target = node.type === 'AssignmentExpression' ? node.left :
      node.type === 'UpdateExpression' || (node.type === 'UnaryExpression' && node.operator === 'delete') ? node.argument : null;
    let bad = target?.type === 'MemberExpression' && origin(target) === 'session';
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const method = key(node.callee), receiver = origin(node.callee.object);
      if (receiver === 'session' && mutators.has(method)) bad = true;
      if (['Object', 'Reflect'].includes(node.callee.object.name) &&
          ['assign', 'defineProperty', 'defineProperties', 'set', 'deleteProperty'].includes(method)) {
        const destination = origin(node.arguments[0]);
        if (destination === 'session' || destination === 'runtime') bad = true;
      }
    }
    if (bad) violations.push(source.slice(node.start, node.end));
  }
  return violations;
}
module.exports = {sessionWrites};
