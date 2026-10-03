const {createHash} = require('node:crypto');

// Compare the migration's syntax trees, allowing only shared bindings to move
// behind runtime.*, initializer declarations to become assignments, and the
// release version to come from the build. HTML/CSS strings remain exact.
function normalize(node, stateNames = null) {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(n => normalize(n, stateNames));
  if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.object.name === 'runtime') {
    return {type: 'Identifier', name: node.property.name};
  }
  if (stateNames && node.type === 'VariableDeclaration' && node.declarations.every(d => stateNames.includes(d.id.name))) {
    const assignments = node.declarations.map(d => ({type: 'AssignmentExpression', operator: '=', left: d.id,
      right: d.init || {type: 'Identifier', name: 'undefined'}}));
    return normalize({type: 'ExpressionStatement', expression: assignments.length === 1 ? assignments[0] :
      {type: 'SequenceExpression', expressions: assignments}}, stateNames);
  }
  const result = {};
  for (const key of Object.keys(node).sort()) {
    if (['start', 'end', 'loc', 'range', 'raw', 'shorthand'].includes(key)) continue;
    result[key] = normalize(node[key], stateNames);
  }
  if (result.type === 'AssignmentExpression' && result.left.type === 'Identifier' && result.left.name === 'TIERSCOPE_VERSION') {
    result.right = {type: 'Literal', value: '<release-version>'};
  }
  return result;
}

function hash(node, stateNames = null) {
  // A stable stringify also sorts synthetic Identifier nodes created above.
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  return createHash('sha256').update(JSON.stringify(stable(normalize(node, stateNames)))).digest('hex');
}

module.exports = { normalize, hash };
