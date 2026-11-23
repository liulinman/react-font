import {loginTestAccount} from './login-test-account';
// Real application HTTP/MySQL. Local vendor double proves flow, not voice/content quality.
describe('IELTS listening closed loop',()=>{
 let f:{account:{username:string;password:string}};
 const post=(path:string,body:Cypress.RequestBody={})=>cy.request('POST',`/api${path}`,body);
 beforeEach(()=>{cy.task('resetDatabase').then(v=>{f=v as typeof f;});post('/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});['deepseek','doubao'].forEach(p=>cy.request('PUT',`/api/admin/ai-services/${p}`,{enabled:true,apiKey:'fixture-only-ai-key'}));cy.then(()=>loginTestAccount(f.account));});
 it('fills notes, restores saved answers, submits and retries without replacing first score',()=>{
  cy.visit('/englishWorld/ielts-listening');cy.contains('button', /^Part 1/).click();cy.get('.ielts-setup-fields select').eq(0).select('completion');cy.contains('button','生成原创材料').click();cy.contains('button','开始作答',{timeout:30000}).click();
  cy.contains('button','开始听力').should('be.enabled').click();cy.get('input[aria-label^="第"]').should('have.length',10);cy.get('.ielts-group').should('not.contain.text','Monday');
  cy.get('input[aria-label^="第"]').each(el=>cy.wrap(el).type('Monday'));cy.contains('已保存',{timeout:10000}).scrollIntoView().should('be.visible');cy.reload();cy.get('input[aria-label^="第"]').first().should('have.value','Monday');
  cy.contains('button','检查并交卷').click();cy.contains('还有 0 题未答').should('be.visible');cy.contains('button','确认交卷').click();cy.contains('h2','本次结果 10 / 10').should('be.visible');cy.contains('button',/^原文$/).click();cy.contains('听力原文').scrollIntoView().should('be.visible');cy.contains('button','同题再练').click();cy.contains('button','开始听力').should('be.visible');cy.request('/api/ielts-listening/attempts').its('body.data').should('have.length',2);
 });
 it('renders a usable map with keyboard-selectable letter answers and records results',()=>{
  cy.visit('/englishWorld/ielts-listening');cy.contains('button', /^Part 2/).click();cy.get('.ielts-setup-fields select').eq(0).select('map');cy.contains('button','生成原创材料').click();cy.contains('button','开始作答',{timeout:30000}).click();cy.contains('button','开始听力').should('be.enabled').click();cy.get('svg[aria-label="Riverside Park 地图"]').should('be.visible');cy.screenshot('ielts-map-question',{capture:'viewport'});cy.get('svg[aria-label="Riverside Park 地图"] circle').first().then(marker=>{const x=marker.attr('cx'),y=marker.attr('cy');cy.contains('button','放大地图').click();cy.viewport(1280,800);cy.get('svg[aria-label="Riverside Park 地图"] circle').first().should('have.attr','cx',x).and('have.attr','cy',y);cy.contains('button','复位').click();cy.viewport(1440,900);cy.get('svg[aria-label="Riverside Park 地图"] circle').first().should('have.attr','cx',x).and('have.attr','cy',y);});cy.get('select[aria-label^="第"]').first().select('A').select('').should('have.value','');cy.get('select[aria-label^="第"]').each(el=>cy.wrap(el).select('A'));cy.contains('button','检查并交卷').click();cy.contains('button','确认交卷').click();cy.contains('h2',/本次结果 [01] \/ 10/).should('be.visible');cy.screenshot('ielts-map-result');
 });
 it('prepares a four-part mixed paper with 40 numbered slots and no answer leak',()=>{
  // This vendor-double flow uses an administrator-configured budget for four expanded templates; real acceptance never changes limits.
  cy.request('PUT','/api/admin/ai-services/limits/deepseek',{charactersPerDay:300000});
  cy.visit('/englishWorld/ielts-listening');cy.contains('button', /^四部分/).click();cy.get('.ielts-setup-fields select').eq(0).select('mixed');cy.contains('button','生成原创材料').click();cy.contains('button','开始作答',{timeout:30000}).click();cy.get('.ielts-number-list button').should('have.length',40);cy.get('.ielts-group').should('not.contain.text','The booking is on Monday.');cy.get('button[aria-label="第31题 未答"]').click();cy.contains('h2','Part 4').scrollIntoView().should('be.visible');cy.screenshot('ielts-mixed-part-four');
 });
 it('keeps private attempts inaccessible to a second student and guards admin operations',()=>{
  post('/ielts-listening/materials',{requestId:crypto.randomUUID(),topic:'Booking',parts:'single',part:1,kind:'completion'}).then(({body})=>post(`/ielts-listening/materials/${body.data.id}/prepare`).then(()=>post('/ielts-listening/attempts',{requestId:crypto.randomUUID(),materialId:body.data.id,mode:'training'}))).then(({body})=>{const id=body.data.id;loginTestAccount({username:'automation_other',password:f.account.password});cy.request({url:`/api/ielts-listening/attempts/${id}`,failOnStatusCode:false}).its('status').should('eq',404);cy.request({url:`/api/ielts-listening/attempts/${id}/audio/0`,failOnStatusCode:false}).its('status').should('eq',404);cy.clearCookie('admin_token');cy.request({url:'/api/admin/ielts-listening/materials',failOnStatusCode:false}).its('status').should('eq',401);});
 });
 it('exposes preparation retry after a supplier failure without losing the material',()=>{
  cy.request('PUT','/api/admin/ai-services/deepseek',{enabled:false});
  cy.visit('/englishWorld/ielts-listening');cy.contains('button', /^Part 1/).click();cy.get('.ielts-setup-fields select').eq(0).select('completion');cy.contains('button','生成原创材料').click();
  cy.contains('button','重试准备',{timeout:10000}).should('be.visible');
  cy.request('PUT','/api/admin/ai-services/deepseek',{enabled:true});cy.contains('button','重试准备').click();cy.contains('button','开始作答',{timeout:30000}).should('be.visible');
 });
 it('automatically submits a played simulation after the two-minute check window',()=>{
  cy.clock(Date.now(),['Date','setInterval','clearInterval']);cy.visit('/englishWorld/ielts-listening');cy.contains('button', /^Part 1/).click();cy.get('.ielts-setup-fields select').eq(0).select('completion');cy.get('.ielts-setup-fields select').eq(1).select('simulation');
  cy.contains('button','生成原创材料').click();cy.contains('button','开始作答',{timeout:30000}).click();cy.contains('button','开始听力').should('be.enabled').click();
  cy.contains('检查时间',{timeout:10000}).should('exist');cy.contains('button','0.8× 慢速').should('not.exist');cy.tick(122000);cy.contains('h2','本次结果 0 / 10',{timeout:10000}).should('be.visible');
 });

});
