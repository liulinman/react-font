import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { buildPlan, cloudOptions, redact, inside } from './prd-testing/model.mjs';
import { loadCloudEnv } from './prd-testing/cloud-env.mjs';
import { execute } from './prd-testing/execute.mjs';
import { renderReport, writeAnalysisPack } from './prd-testing/report.mjs';
import { snapshot, askAI, validateChanges, generationSchema, analysisSchema, preserveExisting, loadAIEnv, apiProviderConfig } from './prd-testing/ai.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const {values}=parseArgs({options:{module:{type:'string'},all:{type:'boolean'},'local-only':{type:'boolean'},'generated-from':{type:'string'}}});
const id=`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}`;
const dir=resolve(root,'test-results/ai',id), workspace=resolve(dir,'workspace');
await mkdir(dir,{recursive:true});
let state={id,status:'preparing',createdAt:new Date().toISOString(),module:values.module,all:!!values.all};
async function update(status,extra={}){state={...state,...extra,status,updatedAt:new Date().toISOString()};await writeFile(resolve(dir,'job.json'),JSON.stringify(state,null,2));console.log(`${status}: ${dir}`);}
try{
 await loadAIEnv(root);
 const provider=apiProviderConfig();
 await loadCloudEnv(root); cloudOptions(!values['local-only']);
 const initial=await buildPlan(root,values.module,values.all);
 await snapshot(root,workspace);
 await writeFile(resolve(dir,'initial-plan.json'),JSON.stringify(initial,null,2));
 await update('generating',{provider:provider.provider,model:provider.model});
 let generated;
 if(values['generated-from']){
  const previous=inside(resolve(root,'test-results/ai'),values['generated-from']);
  const old=JSON.parse(await readFile(resolve(previous,'initial-plan.json'),'utf8'));
  if(JSON.stringify(old.sources)!==JSON.stringify(initial.sources))throw Error('PRD 已变更，不能复用旧生成内容');
  generated=JSON.parse(await readFile(resolve(previous,'generate-repaired.json'),'utf8'));
  await writeFile(resolve(dir,'generate-output.json'),JSON.stringify(generated,null,2));
 }else generated=await askAI(workspace,dir,'generate',`你是 English World 的后台测试工程师。本次范围 ${initial.modules.map(m=>m.id).join(',')}。读取 docs/prd/index.json、对应完整 PRD、决策/交互补充、docs/testing/cases、suites.json，以及产品实现与现有 Cypress spec。机械提取的需求只是索引，必须理解完整原文。不要运行测试，不要调用其他 agent，不要改业务或 PRD。当前目录只读，返回 JSON files 完整内容，由父执行器应用到本次隔离副本。允许路径仅 docs/testing/cases/<module>/<feature>.json、docs/testing/suites.json、apps/english-world/cypress/integration/ai-<name>.cy.ts。现有文件不得删除已有 Case/套件；新增测试使用稳定标题，不添加 .skip/.only，不放宽断言，不伪造数据持久化。覆盖当前范围所有可自动化要求，Case 须有具体数据、步骤、预期、清理；无法实现的明确保留 draft。ready 必须绑定实际 suite ID 和精确完整标题（用 > 连接），且 sourceHash 使用既有 model.mjs 的 sourceBundleHash/featureSources 规则（可只读运行 Node 计算）。suite spec 相对 apps/english-world，真实业务 API 证据 real，mock 必须标记 mock。复用隔离 seed/login 和 prd-notes.cy.ts 模式。PRD 缺失不能反推为已确认。输出 summary 说明范围与缺口、files 为修改后完整文件内容，不能包含凭据。`,generationSchema);
 const allowedCases=new Set(initial.features.map(f=>`docs/testing/cases/${f.primaryModule}/${f.id}.json`));
 for(const f of validateChanges(generated.files))if(f.path.startsWith('docs/testing/cases/')&&!allowedCases.has(f.path))throw Error(`AI 修改了本次范围外 Case：${f.path}`);
 await preserveExisting(workspace,generated.files);
 for(const f of generated.files){const target=resolve(workspace,f.path);await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,f.content);}
 const plan={...await buildPlan(workspace,values.module,values.all),id,all:!!values.all,cloud:!values['local-only']};
 const run={id,createdAt:state.createdAt,mode:'background-ai',cloudStatus:plan.cloud?'要求记录，尚未确认上传':'本地执行',sourceWorkspace:root,isolatedWorkspace:workspace};
 await writeFile(resolve(dir,'plan.json'),JSON.stringify(plan,null,2));
 await writeFile(resolve(dir,'run.json'),JSON.stringify(run,null,2));
 await update('executing',{generationSummary:generated.summary});
 // The deterministic executor alone receives Cloud credentials and owns disposable services.
 process.env.E2E_BACKEND_DIR ||= resolve(root,'../nestjs');
 let execution={results:[],errors:[]};
 try {if(!plan.suites.length)throw Error('没有可执行测试');execution=await execute(workspace,dir,plan,()=>{});}catch(e){execution.errors.push(redact(e.message));}
 run.finishedAt=new Date().toISOString();
 run.cloudStatus=plan.cloud ? execution.results.length&&execution.results.every(r=>r.runUrl)?'已返回云端运行链接':'未完成 Cloud 上传':'本地执行';
 await writeFile(resolve(dir,'run.json'),JSON.stringify(run,null,2));
 await writeFile(resolve(dir,'execution.json'),redact(JSON.stringify(execution,null,2)));
 await writeAnalysisPack(dir,run,plan,execution.results,execution.errors);
 await renderReport(dir,run,plan,execution.results,execution.errors);
 await update('analyzing');
 const analysis=await askAI(dir,dir,'analyze',`你是本次测试失败分析员。只读本目录 plan.json 原始 PRD、execution.json、analysis-input.json、execution/、日志和 workspace 中相关代码。不执行测试、不调用其他 agent、不修改任何文件。仅分析这次运行 ${id} 的真实证据；逐项解释失败或启动错误，分类 product/test/environment/unknown，证据不足明确假设。正常通过也要说明需求覆盖缺口和基线限制；不得把 draft、mock、未运行视为通过。返回 runId、中文 markdown 报告和 findings，每项 evidence 是本目录中存在的相对文件路径，不得包含凭据。不凭关键词宣布根因。`,analysisSchema);
 await writeFile(resolve(dir,'analysis.json'),redact(JSON.stringify(analysis,null,2)));
 await writeFile(resolve(dir,'analysis.md'),redact(analysis.markdown));
 const result=await renderReport(dir,run,plan,execution.results,execution.errors);
 if(result.analysisStatus!=='completed')throw Error(`AI 分析校验失败：${result.analysisError||'缺少分析'}`);
 await update('completed',{result:result.status,report:'report.html',coverage:result.counts});
 process.exitCode=result.status==='passed'?0:result.status==='failed'?1:2;
 }catch(error){
 const message=redact(error.message);
 try{
  await access(resolve(dir,'report.html'));
 }catch{
  try{
   const plan={...JSON.parse(await readFile(resolve(dir,'initial-plan.json'),'utf8')),id};
   const run={id,createdAt:state.createdAt,mode:'background-ai',cloudStatus:'未执行浏览器测试，未上传 Cloud'};
   const execution={results:[],errors:[message]};
   await writeFile(resolve(dir,'plan.json'),JSON.stringify(plan,null,2));
   await writeFile(resolve(dir,'run.json'),JSON.stringify(run,null,2));
   await writeFile(resolve(dir,'execution.json'),JSON.stringify(execution,null,2));
   await writeAnalysisPack(dir,run,plan,[],execution.errors);
   await renderReport(dir,run,plan,[],execution.errors);
  }catch{ /* Invalid selections may fail before a plan exists. */ }
 }
 let report;try{await access(resolve(dir,'report.html'));report='report.html';}catch{}
 await update('failed',{error:message,report});console.error(message);process.exitCode=1;
}
