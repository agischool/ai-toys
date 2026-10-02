// Run each chapter group's dependency-free test entry point.
import fs from 'node:fs';
const names=fs.readdirSync(new URL('.',import.meta.url)).filter(n=>/^t\d.*\.mjs$/.test(n)).sort();
if(!names.length)throw new Error('No chapter engine test files found');
for(const name of names)await import(new URL(name,import.meta.url));
console.log(`PASS: ${names.length} chapter test modules completed`);
