import {readFile,readdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const site=resolve(root,'apps/docs');
const groups=JSON.parse(await readFile(join(site,'site-map.json'),'utf8'));
const pages=groups.flatMap(g=>g.items);
const errors=[];
if(pages.length!==25)errors.push('Expected 25 approved articles');
for(const page of pages){
 try{
  const text=await readFile(join(site,'content',page.link+'.md'),'utf8');
  if(text.length<400)errors.push(page.link+': article too short or placeholder');
  if(!/^# /m.test(text)||!/^## /m.test(text))errors.push(page.link+': missing readable structure');
 }catch{errors.push(page.link+': missing article');}
}
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()){await scan(p);continue;}if(/(^\.env|\.pem$|\.key$|\.log$)/i.test(e.name))errors.push('Private file in publish source: '+p);if(!/\.(md|ts|json|svg)$/.test(e.name))continue;const t=await readFile(p,'utf8');if(/ew_mcp_[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/.test(t)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(t))errors.push('Credential pattern in '+p);if(t.includes('/Users/liulin/'))errors.push('Private local path in '+p);}}
await scan(join(site,'content'));await scan(join(site,'public'));await scan(join(site,'snippets')); 
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('25 curated articles and publish-source checks passed');
