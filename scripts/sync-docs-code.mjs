import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const backend=resolve(root,'../nestjs');
const dest=resolve(root,'apps/docs/snippets');
await mkdir(dest,{recursive:true});
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:backend,encoding:'utf8'}).trim();
const inputs=[['mcp.controller.ts','mcp-query-definition.ts',/^  query_words: \{[\s\S]*?^  \},/m],['mcp.service.ts','mcp-query-handler.ts',/^  private async queryWords\([\s\S]*?^  \}/m]];
const manifest=[];
for(const [file,target,pattern] of inputs){
 const source='src/interface/mcp-access/'+file;
 const raw=await readFile(resolve(backend,source),'utf8');
 const snippet=raw.match(pattern)?.[0];
 if(!snippet)throw new Error('Source boundary changed: '+source);
 const digest=createHash('sha256').update(snippet).digest('hex');
 await writeFile(resolve(dest,target),`// Source: nestjs/${source}\n// Revision: ${revision}\n// Selected teaching excerpt; surrounding authentication remains required.\n${snippet}\n`);
 manifest.push({source:'nestjs/'+source,revision,sha256:digest,target});
}
await writeFile(resolve(dest,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Updated 2 curated source excerpts; review snapshots before publishing.');
