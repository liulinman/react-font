import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../apps/english-world/package.json',import.meta.url));
const cypress=require('cypress');
const result=await cypress.run({project:process.cwd(),configFile:'apps/docs/tests/cypress.config.cjs'});
writeFileSync('../docs/technical-docs-20261026/browser-result.json',JSON.stringify(result,null,2));
if(result.status==='failed'||result.totalFailed)process.exitCode=1;
