const test = require('node:test');
const assert = require('node:assert/strict');
const display = import('../src/display-values.js');

test('Anons / registered uses one decimal with an inclusive 5% equality band', async () => {
 const {anonymousRegisteredRatio: ratio} = await display;
 for (const [anonymous, registered, expected] of [[80,100,'0.8x'],[94,100,'0.9x'],[95,100,'1:1'],[100,100,'1:1'],[105,100,'1:1'],[106,100,'1.1x'],[120,100,'1.2x'],[0,100,'0.0x'],[1,3,'0.3x'],[30,2,'15.0x']]) {
  assert.equal(ratio(anonymous,registered),expected);
 }
 for (const pair of [[0,0],[100,0],[NaN,100],[100,Infinity],[-1,100],[100,-1]]) assert.equal(ratio(...pair),'—');
});
