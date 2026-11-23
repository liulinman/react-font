import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'docs/prd');
const target = resolve(root, '../nestjs/src/interface/product-requirements/catalog.generated.ts');
const index = JSON.parse(await readFile(resolve(source, 'index.json'), 'utf8'));
const documents = [];
async function walk(dir) {
  for (const item of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    if (item.isSymbolicLink()) throw new Error('PRD source must not contain symbolic links');
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await walk(path);
    else if (item.name.endsWith('.md')) {
      const content = await readFile(path, 'utf8');
      const id = relative(source, path).split('\\').join('/');
      const front = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
      documents.push({path:id, title: content.match(/^#\s+(.+)$/m)?.[1] || item.name,
        moduleId: index.modules.find(m => id.startsWith(m.id + '/'))?.id || 'overview',
        status: front.match(/^status:\s*(.+)$/m)?.[1]?.trim() || '',
        sha256:createHash('sha256').update(content).digest('hex'), content});
    }
  }
}
await walk(source);
for (const entry of [...index.modules.map(m=>m.entry), ...index.features.map(f=>f.prd)]) {
  if (!documents.some(d=>d.path === entry)) throw new Error('Missing indexed PRD: '+entry);
}
const output = '// Generated from react-font/docs/prd by scripts/sync-prd-catalog.mjs. Do not edit.\nexport const prdCatalog = ' + JSON.stringify({schemaVersion:1, modules:index.modules.map(({id,name,entry,baselineStatus})=>({id,name,entry,baselineStatus})), documents},null,2) + ';\n';
if (process.argv.includes('--check')) {
  if (await readFile(target,'utf8') !== output) throw new Error('PRD snapshot is stale; run node scripts/sync-prd-catalog.mjs');
} else { await mkdir(dirname(target),{recursive:true}); await writeFile(target,output); }
console.log(`PRD catalog: ${documents.length} documents; ${process.argv.includes('--check')?'verified':'synchronized'} (backend only)`);
