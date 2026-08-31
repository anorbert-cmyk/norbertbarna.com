import { readFileSync, writeFileSync } from 'node:fs';
await import('./finalize-fixes.mjs');
const source = readFileSync('server.js', 'utf8');
const before = String.raw`js\/animations\.`;
const after = String.raw`js\/(?:animations|media)\.`;
if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) throw new Error('Unexpected immutable-asset classifier');
writeFileSync('server.js', source.replace(before, after));
console.log('Server media cache classifier included in the committed implementation.');
