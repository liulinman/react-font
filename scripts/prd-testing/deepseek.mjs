import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// One bounded inference request: no autonomous shell loop or context-compaction restart.
export async function askDeepSeek(cwd, dir, phase, prompt, schema, config) {
 const safe=t=>[config.key,process.env.CYPRESS_RECORD_KEY].filter(Boolean).reduce((value,key)=>value.split(key).join('[REDACTED]'),String(t));
 const sections=[];let budget=450000;
 const add=async(path)=>{try{const text=await readFile(resolve(cwd,path),'utf8');const part=text.slice(0,Math.min(budget,80000));sections.push(`FILE ${path}\n${part}`);budget-=part.length;}catch{}};
 if(phase==='generate'){
  await add('docs/prd/index.json');
  const plan=JSON.parse(await readFile(resolve(dir,'initial-plan.json'),'utf8'));
  sections.push(JSON.stringify({modules:plan.modules,features:plan.features,requirements:plan.requirements}));
  for(const source of plan.sources) {sections.push(`FILE ${source.path}\n${source.content}`);}
  await add('docs/testing/suites.json');
  for(const f of plan.features)await add(`docs/testing/cases/${f.primaryModule}/${f.id}.json`);
  for(const s of plan.suites)if(budget>0)await add(`apps/english-world/${s.spec}`);
  for(const folder of ['apps/english-world/src/page/englishWorld/knowledgeNotes']){
   for(const name of await readdir(resolve(cwd,folder)).catch(()=>[]))if(budget>0&&/\.tsx?$/.test(name))await add(`${folder}/${name}`);
  }
 }else{
  for(const path of ['analysis-input.json','execution.json','plan.json','backend.log','cypress-batch.log'])if(budget>0)await add(path);
  const plan=JSON.parse(await readFile(resolve(cwd,'plan.json'),'utf8'));
  for(const suite of plan.suites||[])if(budget>0)await add(`workspace/apps/english-world/${suite.spec}`);
  for(const name of ['KnowledgeNotesPage.tsx','KnowledgeNoteEditor.tsx','api.ts'])if(budget>0)await add(`workspace/apps/english-world/src/page/englishWorld/knowledgeNotes/${name}`);
 }
 const input=prompt+'\n这是一次限时生成，不提供工具。下面是已读取的真实上下文。不要重复请求读取文件。新增 spec 文件名必须为 ai- 开头，不得输出已有 prd-notes.cy.ts 路径；新增 catalog suite 必须同时提供该 spec 源码，不能登记占位套件。优先完成能可靠实现的具体用例，其余保留 draft 并说明缺口；不要为了全覆盖伪造断言。仅返回符合 schema 的 JSON。现有 Case 的 sourceHash 使用上下文 requirements 中相应 feature 的 sourceHash。\nJSON schema: '+JSON.stringify(schema)+'\n'+sections.join('\n\n');
 await writeFile(resolve(dir,`${phase}-prompt.txt`),safe(input));
 const started=Date.now();
 const request=config.fetch || fetch;
 const response=await request(config.baseURL.replace(/\/$/,'')+'/responses',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,input,instructions:'You are a test engineer. Return valid JSON only. Complete the task within this single response.',reasoning:{effort:'none'},max_output_tokens:phase==='generate'?32768:8192,text:{format:{type:'json_schema',name:'test_result',schema}}}),signal:AbortSignal.timeout(240000)});
 const data=await response.json();
 await writeFile(resolve(dir,`${phase}-request.json`),safe(JSON.stringify({status:response.status,elapsedMs:Date.now()-started,usage:data.usage,responseStatus:data.status,error:data.error},null,2)));
 if(!response.ok||data.status==='failed'||data.status==='incomplete')throw Error(safe(`DeepSeek ${phase} 请求失败 ${response.status}: ${JSON.stringify(data.error||data.incomplete_details||data.status)}`));
 const raw=(data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
 await writeFile(resolve(dir,`${phase}-output.json`),safe(raw));
 if(!raw)throw Error('DeepSeek 返回空内容');
 return JSON.parse(safe(raw));
}
