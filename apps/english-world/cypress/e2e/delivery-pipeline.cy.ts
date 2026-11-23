// Synthetic UI examples only: private PRDs and historic business data stay off Cloud.
describe('Read-only delivery pipeline',()=>{
 const run=(id:string,status:string,freshness:string)=>({id,createdAt:'2026-10-28T08:00:00Z',status,overallStatus:'incomplete',freshness,prdSha256:'synthetic',specVersion:'unknown',rerunOf:null,codeVersions:[{repository:'frontend',commit:'synthetic',dirty:true}],cloudUrls:['https://cloud.cypress.io/projects/hajrxe/runs/1'],rows:[{id:'settings/example/AC-01',text:'教学构造：完整保存正文',status,reason:status==='failed'?'教学构造：预期正文完整，实际内容缺失':'尚未执行',caseIds:['settings/example/CASE-01']}],tests:[],analysis:[{category:'test',conclusion:'教学构造分析',nextStep:'复查断言'}],images:[]});
 const example={id:'settings/example',moduleId:'settings',title:'交付示例功能',prd:{path:'docs/prd/example.md',sha256:'synthetic',route:'example.html'},specs:[{path:'specs/example/spec.md',sha256:'synthetic',content:'# 教学构造 Spec\n\n仅用于界面自动化测试，不是正式产品需求。',stale:false,links:[]}],cases:[{id:'settings/example/CASE-01',title:'正文完整性',status:'draft',requirementIds:['settings/example/AC-01'],steps:['打开示例正文'],expectedResults:['正文完整显示'],bindings:[]}],runs:[run('latest','pending','current'),run('first-failure','failed','stale')]};
 beforeEach(()=>{
  cy.viewport(1440,900);
  cy.intercept('GET','**/api/admin/me',{code:200,data:{username:'synthetic_admin'}});
  cy.intercept('GET','**/api/admin/users*',{code:200,data:{list:[],total:0}});
  cy.intercept('GET','**/api/admin/notifications*',{code:200,data:{list:[],total:0}});
  cy.intercept('GET','**/api/admin/notification-schedules*',{code:200,data:{list:[],total:0}});
  cy.intercept('GET','**/api/admin/prd/example.html',{headers:{'content-type':'text/html'},body:'<h1>教学构造需求正文</h1>'});
  cy.intercept('GET','**/api/admin/prd/pipeline.json',{schemaVersion:1,modules:[{id:'settings',name:'设置与站点'}],features:[example,{...example,id:'settings/missing',title:'缺失产物示例',specs:[],cases:[],runs:[]}]});
 });
 it('PIPE-01 reads Spec and exact case expectations without write actions',()=>{
  cy.visit('/admin/?section=product-requirements');
  cy.contains('button','交付示例功能').should('be.visible');
  cy.contains('[role=tab]','Spec 正文').click();cy.contains('pre','教学构造 Spec').should('be.visible');
  cy.contains('[role=tab]','测试用例').click();cy.contains('summary','正文完整性').click();cy.contains('li','正文完整显示').should('be.visible');cy.contains('候选 / 未覆盖').should('be.visible');
  cy.get('.delivery-pipeline').find('button').should('not.contain','执行测试').and('not.contain','生成');
  cy.screenshot('pipeline-cases-synthetic',{capture:'viewport'});
 });
 it('PIPE-02 switches history, preserves first failure and labels stale and global analysis',()=>{
  cy.visit('/admin/?section=product-requirements');cy.contains('[role=tab]','测试结果').click();
  cy.get('#pipeline-run').select('first-failure');cy.contains('需求已更新').should('be.visible');cy.contains('教学构造：预期正文完整，实际内容缺失').should('be.visible');
  cy.contains('整次运行分析报告').should('be.visible');cy.contains('a','查看 Cloud 运行记录').should('have.attr','rel','noopener noreferrer');
  cy.screenshot('pipeline-history-synthetic',{capture:'viewport'});
  cy.get('#pipeline-run').select('latest');cy.contains('尚未执行').should('be.visible');
 });
 it('PIPE-03 distinguishes missing stages, search-empty and retry from expired login',()=>{
  cy.visit('/admin/?section=product-requirements');cy.contains('button','缺失产物示例').click();
  cy.contains('[role=tab]','Spec 正文').click();cy.contains('尚未归档 Spec 正文').should('be.visible');
  cy.contains('[role=tab]','测试用例').click();cy.contains('尚未登记测试用例').should('be.visible');
  cy.contains('[role=tab]','测试结果').click();cy.contains('尚无自动化测试运行').should('be.visible');
  cy.get('#pipeline-search').type('没有这个功能');cy.contains('没有匹配的功能').should('be.visible');cy.get('#pipeline-search').clear();
  cy.intercept('GET','**/api/admin/prd/pipeline.json',{statusCode:503,body:{}});cy.contains('button','刷新资料').click();cy.contains('产线资料加载失败').should('be.visible');
  cy.intercept('GET','**/api/admin/prd/pipeline.json',{statusCode:401,body:{code:4001}});cy.get('button[aria-label="重试"]').click();cy.contains('管理员登录已失效').should('be.visible');
 });
});
