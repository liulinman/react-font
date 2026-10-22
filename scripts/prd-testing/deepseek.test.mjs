import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {askDeepSeek} from './deepseek.mjs';
test('DeepSeek uses a single bounded request, preserves real context and rejects truncated results',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'deepseek-'));let calls=0;
 try{
  await writeFile(join(dir,'initial-plan.json'),JSON.stringify({modules:[],features:[],requirements:[],suites:[],sources:[{path:'prd.md',content:'真实需求'}]}));
  const config={key:'fixture-secret',model:'test-model',baseURL:'https://example.test',fetch:async(url,options)=>{
   calls++;const body=JSON.parse(options.body);assert.ok(body.input.includes('真实需求'));assert.equal(body.tools,undefined);assert.equal(body.max_output_tokens,32768);assert.ok(options.signal);assert.equal(options.headers.Authorization,'Bearer fixture-secret');
   return {ok:true,status:200,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({summary:'ok',files:[],code:'password: string',credential:'fixture-secret'})}]}]})};
  }};
  assert.equal((await askDeepSeek(dir,dir,'generate','generate JSON',{type:'object'},config)).summary,'ok');assert.equal(calls,1);const output=JSON.parse(await readFile(join(dir,'generate-output.json'),'utf8'));assert.equal(output.code,'password: string');assert.equal(output.credential,'[REDACTED]');
  assert.ok(!(await readFile(join(dir,'generate-request.json'),'utf8')).includes(config.key));
  config.fetch=async()=>({ok:true,status:200,json:async()=>({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}})});
  await assert.rejects(askDeepSeek(dir,dir,'generate','generate JSON',{},config),/incomplete|max_output_tokens/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
