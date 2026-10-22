import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChanges } from './ai.mjs';
test('reject traversal, product edits, existing specs and malformed output', () => {
 for (const path of ['../secret','/tmp/a','docs/prd/index.json','apps/english-world/src/main.ts','apps/english-world/cypress/e2e/existing.cy.ts','docs/testing/cases/../suites.json']) assert.throws(()=>validateChanges([{path,content:'x'}]));
 assert.equal(validateChanges([{path:'apps/english-world/cypress/integration/ai-notes.cy.ts',content:'describe("notes",()=>{})'}]).length,1);
 assert.throws(()=>validateChanges([{path:'docs/testing/cases/notes/a.json',content:'bad json'}]));
 assert.throws(()=>validateChanges([{path:'docs/testing/suites.json',content:'{}'},{path:'docs/testing/suites.json',content:'{}'}]));
});
import { preserveExisting, snapshot } from './ai.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
test('AI cannot drop existing cases or relabel mocked suites real',async()=>{
 const root=await mkdtemp(join(tmpdir(),'prd-ai-'));
 try{
  await mkdir(join(root,'docs/testing/cases/notes'),{recursive:true});
  await writeFile(join(root,'docs/testing/suites.json'),JSON.stringify({suites:[{id:'old',evidence:'mock'}]}));
  await writeFile(join(root,'docs/testing/cases/notes/a.json'),JSON.stringify({cases:[{id:'old-case'}]}));
  await assert.rejects(preserveExisting(root,[{path:'docs/testing/suites.json',content:JSON.stringify({suites:[{id:'old',evidence:'real'}]})}]));
  await assert.rejects(preserveExisting(root,[{path:'docs/testing/cases/notes/a.json',content:'{"cases":[]}'}]));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('snapshot includes uncommitted source, excludes env and ignored artifacts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'prd-snapshot-')),dest=join(root,'copy');
 try{
  execFileSync('git',['init','-q'],{cwd:root});
  await mkdir(join(root,'apps'));await mkdir(join(root,'packages'));
  await writeFile(join(root,'.gitignore'),'test-results/\n');await writeFile(join(root,'.env.local'),'secret');await writeFile(join(root,'source.txt'),'dirty source');
  await snapshot(root,dest);assert.equal(await readFile(join(dest,'source.txt'),'utf8'),'dirty source');
  await assert.rejects(readFile(join(dest,'.env.local')));
 }finally{await rm(root,{recursive:true,force:true});}
});
import { askAI } from './ai.mjs';
import { chmod } from 'node:fs/promises';
test('noninteractive provider consumes schema/final output; failure is never a result',async()=>{
 const root=await mkdtemp(join(tmpdir(),'prd-provider-'));const previous=process.env.CODEX_BIN;const oldKey=process.env.OPENAI_API_KEY,oldProvider=process.env.PRD_AI_PROVIDER;process.env.OPENAI_API_KEY="fixture-api-key";process.env.PRD_AI_PROVIDER="openai";
 try{
  const bin=join(root,'fake-codex');
  await writeFile(bin,'#!/usr/bin/env node\nconst fs=require("fs");const args=process.argv;fs.writeFileSync(args[args.indexOf("-o")+1],JSON.stringify({summary:"fixture",files:[],code:"password: string"}));process.stdin.resume();\n');await chmod(bin,0o700);process.env.CODEX_BIN=bin;
  const result=await askAI(root,root,'fixture','fixture',{type:'object'});assert.equal(result.summary,'fixture');assert.equal(result.code,'password: string');
  await writeFile(bin,'#!/usr/bin/env node\nconsole.log(JSON.stringify({type:"turn.failed",error:{message:"provider unavailable"}}));process.exit(1);\n');
  await assert.rejects(askAI(root,root,'error','fixture',{type:'object'}),/provider unavailable/);
 }finally{if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;if(oldProvider===undefined)delete process.env.PRD_AI_PROVIDER;else process.env.PRD_AI_PROVIDER=oldProvider;if(previous===undefined)delete process.env.CODEX_BIN;else process.env.CODEX_BIN=previous;await rm(root,{recursive:true,force:true});}
});
import { apiProviderConfig } from './ai.mjs';
test('API provider requires env key, never embeds it in CLI arguments, bypasses ChatGPT auth',()=>{
 assert.throws(()=>apiProviderConfig({}),/OPENAI_API_KEY/);
 const key='fixture-api-key-do-not-log';
 const config=apiProviderConfig({OPENAI_API_KEY:key,PRD_AI_MODEL:'test-model'});
 assert.equal(config.key,key);assert.equal(config.model,'test-model');
 assert.ok(config.args.includes('model_provider="prd_api"'));
 assert.ok(config.args.includes('model_providers.prd_api.requires_openai_auth=false'));
 assert.ok(config.args.includes('model_providers.prd_api.env_key="PRD_AI_PROVIDER_KEY"'));
 assert.ok(!config.args.join(' ').includes(key));
 assert.throws(()=>apiProviderConfig({OPENAI_API_KEY:key,PRD_AI_BASE_URL:'https://user:secret@example.com/v1'}),/URL/);
 assert.throws(()=>apiProviderConfig({OPENAI_API_KEY:key,PRD_AI_BASE_URL:'http://example.com/v1'}),/URL/);
});
import { loadAIEnv } from './ai.mjs';
test('dedicated AI env is allowlisted and never overrides process credentials',async()=>{
 const root=await mkdtemp(join(tmpdir(),'prd-env-'));
 try{
  await writeFile(join(root,'.env.prd-ai.local'),'PRD_AI_PROVIDER=deepseek\nDEEPSEEK_API_KEY="file-fixture"\nADMIN_PASSWORD=must-not-load\n');
  const env={DEEPSEEK_API_KEY:'environment-fixture'};await loadAIEnv(root,env);
  assert.equal(env.DEEPSEEK_API_KEY,'environment-fixture');assert.equal(env.PRD_AI_PROVIDER,'deepseek');assert.equal(env.ADMIN_PASSWORD,undefined);
  const config=apiProviderConfig(env);assert.equal(config.model,'deepseek-flash');assert.equal(config.baseURL,'https://api.deepseek.com');
 }finally{await rm(root,{recursive:true,force:true});}
});
