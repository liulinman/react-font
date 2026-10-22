import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectModules } from './model.mjs';
import {loadAIEnv,apiProviderConfig} from './ai.mjs';
const root=fileURLToPath(new URL('../..',import.meta.url));
const dir=resolve(root,'test-results/ai-queue');await mkdir(dir,{recursive:true});
await loadAIEnv(root);
const registry=JSON.parse(await readFile(resolve(root,'docs/prd/index.json'),'utf8'));
const jobs=[];let active=null,child=null,closing=false;
for(const name of await readdir(dir)){if(!name.endsWith('.json'))continue;const j=JSON.parse(await readFile(resolve(dir,name),'utf8'));if(['running','queued'].includes(j.status)){j.status='interrupted';await writeFile(resolve(dir,name),JSON.stringify(j));}jobs.push(j);}
async function save(j){await writeFile(resolve(dir,`${j.id}.json`),JSON.stringify(j,null,2));}
async function drain(){if(active||closing)return;const j=jobs.find(x=>x.status==='queued');if(!j)return;active=j;j.status='running';await save(j);
 const args=[resolve(root,'scripts/test-prd-ai.mjs'),...(j.all?['--all']:['--module',j.module]),...(j.generatedFrom?['--generated-from',j.generatedFrom]:[])];
 const p=child=spawn(process.execPath,args,{cwd:root,stdio:['ignore','pipe','pipe']});let tail='';
 p.stdout.on('data',b=>{const text=b.toString();tail=(tail+text).slice(-10000);const found=text.match(/(?:preparing|generating): (.+)/);if(found){j.runDir=found[1].trim();save(j).catch(console.error);}});p.stderr.on('data',b=>{tail=(tail+b.toString()).slice(-10000);});
 let finished=false;const finish=async(code,error)=>{if(finished)return;finished=true;j.status=code===0||code===2?'completed':'failed';j.exitCode=code;j.error=error?.message;j.log=tail;j.finishedAt=new Date().toISOString();await save(j);active=null;drain();};
 p.once('error',e=>finish(null,e));p.once('exit',code=>finish(code));
}
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>English World AI 测试</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;background:#f5f7fa;color:#223}button,select{padding:10px;margin:8px}article{padding:16px;margin:12px;background:white;border-radius:10px}pre{white-space:pre-wrap}</style><h1>English World AI 测试</h1><p>AI 根据统一 PRD 生成 Case 和脚本 → 隔离执行并记录 Cloud → AI 分析 → 报告。任务串行执行；不完整覆盖不会记为通过。</p><p id="provider"></p><select id="module"><option value="all">全部模块</option>${registry.modules.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select><button id="start">开始 AI 测试</button><span id="message"></span><div id="jobs"></div><script>
const outcomes={passed:'测试通过',failed:'测试失败',incomplete:'覆盖未完成'};
const phases={queued:'排队中',running:'运行中',preparing:'准备中',generating:'AI 生成 Case 和脚本',executing:'执行测试',analyzing:'AI 分析',completed:'已完成',failed:'任务失败',interrupted:'已中断'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){const provider=await(await fetch('/api/provider')).json();document.querySelector('#provider').textContent=provider.ready?'AI：'+provider.provider+' / '+provider.model:provider.error;const data=await(await fetch('/api/jobs')).json();document.querySelector('#jobs').innerHTML=data.reverse().map(j=>'<article><b>'+esc(j.module||'全部模块')+'</b> · '+esc(phases[j.phase||j.status]||j.status)+' · '+esc(outcomes[j.result]||j.result||'')+(j.status==='running'?' · 已用 '+Math.floor((Date.now()-Date.parse(j.createdAt))/1000)+' 秒':'')+'<p>'+esc(j.id)+'</p>'+(j.report?'<a target="_blank" href="/reports/'+encodeURIComponent(j.id)+'/report.html">查看报告</a>':'')+(j.cloudUrl?' · <a target="_blank" href="'+esc(j.cloudUrl)+'">Cloud 记录</a>':'')+'<pre>'+esc(j.error||'')+'</pre></article>').join('');}
document.querySelector('#start').onclick=async()=>{const value=document.querySelector('#module').value;const r=await fetch('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value==='all'?{all:true}:{module:value})});document.querySelector('#message').textContent=r.ok?'已加入后台队列':await r.text();refresh();};refresh();setInterval(refresh,3000);</script></html>`;
const port=Number(process.env.PRD_AI_PORT||4319);
const server=createServer(async(req,res)=>{try{
 const host=`127.0.0.1:${port}`;if(req.headers.host!==host){res.writeHead(403);return res.end('Host rejected');}
 if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(html);}
 if(req.method==='GET'&&req.url==='/api/provider'){let state;try{const c=apiProviderConfig();state={ready:true,provider:c.provider,model:c.model};}catch(e){state={ready:false,error:e.message};}res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(state));}
 if(req.method==='GET'&&req.url==='/api/jobs'){const data=await Promise.all(jobs.map(async j=>{if(!j.runDir)return j;try{const state=JSON.parse(await readFile(resolve(j.runDir,'job.json'),'utf8'));let cloudUrl;try{const log=await readFile(resolve(j.runDir,'cypress-batch.log'),'utf8');cloudUrl=log.match(/https:\/\/cloud[.]cypress[.]io\/projects\/[a-zA-Z0-9-]+\/runs\/[0-9]+/)?.[0];}catch{}return {...j,cloudUrl,phase:state.status,result:state.result,report:state.report,updatedAt:state.updatedAt,error:state.error||j.error};}catch{return j;}}));res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(data));}
 if(req.method==='POST'&&req.url==='/api/jobs'){
  if(req.headers.origin!==`http://${host}`||req.headers['content-type']!=='application/json'){res.writeHead(403);return res.end('Origin rejected');}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Request too large');}
  apiProviderConfig();
  const input=JSON.parse(body);selectModules(registry.modules,input.module,input.all);
  const j={id:randomUUID(),module:input.module,all:!!input.all,generatedFrom:input.generatedFrom,status:'queued',createdAt:new Date().toISOString()};jobs.push(j);await save(j);drain();res.writeHead(202);return res.end(JSON.stringify({id:j.id}));
 }
 if(req.method==='GET'&&req.url.startsWith('/reports/')){
  const [, ,id,...parts]=decodeURIComponent(req.url.split('?')[0]).split('/');const j=jobs.find(x=>x.id===id);if(!j?.runDir)throw Error('Report unavailable');
  const path=parts.join('/');if(!path||parts.some(p=>!p||p==='..'||p==='.')||path.startsWith('workspace/')||/schema|prompt|output|jsonl/.test(path))throw Error('Invalid report file');
  const allowed=/\.(html|json|md|log|png|jpg|mp4)$/i.test(path);if(!allowed)throw Error('Unsupported artifact');
  res.setHeader('Content-Type',path.endsWith('.html')?'text/html;charset=utf-8':path.endsWith('.png')?'image/png':path.endsWith('.mp4')?'video/mp4':'text/plain;charset=utf-8');return res.end(await readFile(resolve(j.runDir,path)));
 }
 res.writeHead(404);res.end('Not found');
}catch(e){res.writeHead(400);res.end(e.message);}});
server.listen(port,'127.0.0.1',()=>console.log(`AI 测试控制台 http://127.0.0.1:${port}`));

for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{closing=true;server.close();if(child)child.kill('SIGTERM');});
