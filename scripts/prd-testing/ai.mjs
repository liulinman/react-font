import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, symlink, readdir, lstat, appendFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { askDeepSeek } from './deepseek.mjs';
export function validateChanges(files) {
 if (!Array.isArray(files)) throw Error('AI files 必须为数组');
 const seen = new Set();
 for (const f of files) {
  if (!f || typeof f.content !== 'string' || typeof f.path !== 'string' || f.path.split('/').some(p=>!p || p==='..' || p==='.') || seen.has(f.path) || !/^(docs\/testing\/cases\/[a-z0-9-]+\/[a-z0-9-]+\.json|docs\/testing\/suites\.json|apps\/english-world\/cypress\/integration\/ai-[a-z0-9-]+\.cy\.ts)$/.test(f.path)) throw Error(`禁止的 AI 文件：${f?.path}`);
  seen.add(f.path);
  if(f.path.endsWith('.json')) JSON.parse(f.content);
 }
 return files;
}
export async function snapshot(root, dest) {
 await mkdir(dest,{recursive:true});
 const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 for(const path of new Set(paths)) {
  if (/(^|\/)(\.env[^/]*|node_modules|test-results|\.git)(\/|$)/.test(path)) continue;
  const src=resolve(root,path); let stat; try{stat=await lstat(src);}catch{continue;}
  if(!stat.isFile()) continue;
  await mkdir(dirname(resolve(dest,path)),{recursive:true}); await copyFile(src,resolve(dest,path));
 }
 for(const parent of ['', 'apps','packages']) {
  const dirs=parent ? (await readdir(resolve(root,parent),{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>`${parent}/${x.name}`) : [''];
  for(const dir of dirs) try {await lstat(resolve(root,dir,'node_modules')); await mkdir(resolve(dest,dir),{recursive:true}); await symlink(resolve(root,dir,'node_modules'),resolve(dest,dir,'node_modules'));}catch(e){if(e.code!=='ENOENT')throw e;}
 }
}
// Dedicated local file only; process environment takes precedence.
export async function loadAIEnv(root, env = process.env) {
 try {
  const text = await readFile(resolve(root, '.env.prd-ai.local'), 'utf8');
  for (const line of text.split('\n')) {
   const m = line.match(/^(PRD_AI_PROVIDER|PRD_AI_MODEL|PRD_AI_BASE_URL|OPENAI_API_KEY|DEEPSEEK_API_KEY)=(.*)$/);
   if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
 } catch (e) { if(e.code !== 'ENOENT') throw e; }
}
export function apiProviderConfig(env = process.env) {
 const provider = env.PRD_AI_PROVIDER || (env.DEEPSEEK_API_KEY ? 'deepseek' : 'openai');
 if (!['openai','deepseek'].includes(provider)) throw Error('PRD_AI_PROVIDER 仅支持 openai 或 deepseek');
 const key = provider === 'deepseek' ? env.DEEPSEEK_API_KEY : env.OPENAI_API_KEY;
 if (!key) throw Error(`缺少 ${provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY'}，请通过运行服务的环境变量配置`);
 const baseURL = env.PRD_AI_BASE_URL || (provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1');
 const url = new URL(baseURL);
 if(url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('API URL 必须为无凭据的 HTTPS 地址');
 const model = env.PRD_AI_MODEL || (provider === 'deepseek' ? 'deepseek-flash' : 'gpt-6.1-sol');
 const settings = {
  model_provider: 'prd_api',
  'model_providers.prd_api.name': `PRD ${provider} API`,
  'model_providers.prd_api.base_url': baseURL.replace(/\/$/, ''),
  'model_providers.prd_api.env_key': 'PRD_AI_PROVIDER_KEY',
  'model_providers.prd_api.wire_api': 'responses',
  'model_providers.prd_api.requires_openai_auth': false,
  'model_providers.prd_api.supports_websockets': false,
 };
 return {provider, model, baseURL, key, args: ['--model',model,...Object.entries(settings).flatMap(([k,v])=>['-c',`${k}=${JSON.stringify(v)}`])]};
}
export async function askAI(cwd, dir, phase, prompt, schema) {
 const config = apiProviderConfig();
 if(config.provider==='deepseek')return askDeepSeek(cwd,dir,phase,prompt,schema,config);
 const safe = text => [config.key,process.env.CYPRESS_RECORD_KEY].filter(Boolean).reduce((value,key)=>value.split(key).join('[REDACTED]'),String(text));
 const schemaPath=resolve(dir,`${phase}-schema.json`), output=resolve(dir,`${phase}-output.json`);
 await writeFile(schemaPath,JSON.stringify(schema));
 await writeFile(resolve(dir,`${phase}-prompt.txt`),prompt);
 // Allow credentials for Codex itself; never pass Cloud/application secrets into the model process.
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=> !/CYPRESS|PASSWORD|SECRET|TOKEN|DATABASE|DEEPSEEK|E2E_|API_KEY/i.test(k)));
 const args=['exec','--ignore-user-config','--ephemeral','--sandbox','read-only','--skip-git-repo-check','-C',cwd,'--json','--output-schema',schemaPath,'-o',output,'-'];
 args.splice(1,0,...config.args);
 env.PRD_AI_PROVIDER_KEY=config.key;
 await new Promise((ok,no)=>{
  const p=spawn(process.env.CODEX_BIN || 'codex',args,{env,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
  const stop=()=>{try{process.platform==='win32'?p.kill('SIGTERM'):process.kill(-p.pid,'SIGTERM');}catch{}};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
  let pending=Promise.resolve(),tail=''; const logPath=resolve(dir,`${phase}.jsonl`); const capture=b=>{tail+=b.toString();const lines=tail.split('\n');tail=lines.pop();if(lines.length)pending=pending.then(()=>appendFile(logPath,safe(lines.join('\n')+'\n')));}; p.stdout.on('data',capture); p.stderr.on('data',capture);
  const timer=setTimeout(stop,30*60*1000);
  p.on('error',no); p.on('close',async code=>{clearTimeout(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);try{await pending;if(tail)await appendFile(logPath,safe(tail));let reason='';if(code!==0){const log=await readFile(logPath,'utf8');for(const line of log.split('\n'))try{const e=JSON.parse(line);if(e.type==='turn.failed')reason=e.error?.message||'';}catch{}}code===0?ok():no(Error(safe(`Codex ${phase} 退出 ${code}：${reason.slice(0,1500)||'见任务日志'}`)));}catch(e){no(e);}});
  p.stdin.end(prompt);
 });
 const raw=safe(await readFile(output,'utf8'));
 await writeFile(output,raw);
 return JSON.parse(raw);
}
export const generationSchema={type:'object',properties:{summary:{type:'string'},files:{type:'array',items:{type:'object',properties:{path:{type:'string',pattern:'^(docs/testing/cases/[a-z0-9-]+/[a-z0-9-]+[.]json|docs/testing/suites[.]json|apps/english-world/cypress/integration/ai-[a-z0-9-]+[.]cy[.]ts)$'},content:{type:'string'}},required:['path','content'],additionalProperties:false}}},required:['summary','files'],additionalProperties:false};
export const analysisSchema={type:'object',properties:{runId:{type:'string'},markdown:{type:'string'},findings:{type:'array',items:{type:'object',properties:{category:{type:'string',enum:['product','test','environment','unknown']},conclusion:{type:'string'},nextStep:{type:'string'},evidence:{type:'array',items:{type:'string'}}},required:['category','conclusion','nextStep','evidence'],additionalProperties:false}}},required:['runId','markdown','findings'],additionalProperties:false};

export async function preserveExisting(root, files) {
 for (const f of files.filter(f=>f.path.endsWith('.json'))) {
  let before;try{before=JSON.parse(await readFile(resolve(root,f.path),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  const after=JSON.parse(f.content);const key=f.path.endsWith('/suites.json')?'suites':'cases';
  if(!Array.isArray(after[key]))throw Error(`缺少 ${key}：${f.path}`);
  const ids=new Set(after[key].map(x=>x.id));
  if((before[key]||[]).some(x=>!ids.has(x.id)))throw Error(`AI 不得删除已有 ${key}：${f.path}`);
  if(key==='suites')for(const old of before.suites){if(JSON.stringify(after.suites.find(x=>x.id===old.id))!==JSON.stringify(old))throw Error('AI 不得改写已有 suite 证据等级或配置');}
 }
}
