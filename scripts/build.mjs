import { readdir, mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output);
const excluded = new Set(['dist', 'content', 'data', 'functions', 'scripts', 'tests', 'node_modules', 'upload']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name.startsWith('.') || excluded.has(entry.name) || entry.name.endsWith('.md')) continue;
  await cp(path.join(root, entry.name), path.join(output, entry.name), { recursive: true });
}
await mkdir(path.join(output, 'data'));
const works = JSON.parse(await readFile(path.join(root, 'data/works.json'), 'utf8'));
await writeFile(path.join(output, 'data/works.json'), JSON.stringify(works.filter(work => work.published === true), null, 2));
await writeFile(path.join(output, '_routes.json'), JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
console.log('Static site prepared in dist; guestbook files and unpublished works excluded.');
