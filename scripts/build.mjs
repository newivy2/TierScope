import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build.mjs [--check]');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const template = await readFile(path.join(root, 'src/userscript-header.txt'), 'utf8');
const thirdPartyLicense = await readFile(path.join(root, 'THIRD_PARTY_LICENSES.txt'), 'utf8');
if (!template.startsWith('// ==UserScript==\n') || !template.includes('{{VERSION}}')) {
  throw new Error('The userscript metadata header or version placeholder is missing.');
}
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  outfile: 'tierscope.user.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  charset: 'utf8',
  minify: false,
  treeShaking: false,
  sourcemap: false,
  legalComments: 'inline',
  define: { __TIERSCOPE_VERSION__: JSON.stringify(version) },
  banner: { js: template.replaceAll('{{VERSION}}', version).trimEnd() +
    '\n\n// Generated from src/main.js. Edit src/ and run npm run build.\n"use strict";\n\n/*!\n' + thirdPartyLicense.trimEnd() + '\n*/' },
  write: false,
  metafile: true,
});
if (result.outputFiles.length !== 1 || Object.values(result.metafile.outputs).some(output => output.imports.length)) {
  throw new Error('The build must produce one script with no external module imports.');
}
const output = result.outputFiles[0].text;
const destination = path.join(root, 'tierscope.user.js');
if (args.includes('--check')) {
  if (await readFile(destination, 'utf8') !== output) {
    throw new Error('tierscope.user.js is out of date. Run npm run build and commit the generated script.');
  }
  console.log('Generated userscript matches src/ and package.json.');
} else {
  await writeFile(destination, output);
  console.log(`Built tierscope.user.js (${version}, ${Buffer.byteLength(output)} bytes).`);
}
