// Response fixtures verify interaction only; database cleanup is covered by SQL integration.
describe('Admin permanent deletion', () => {
 for (const width of [1440, 390]) it(`previews, cancels, reconfirms stale scope, and corrects last page at ${width}px`, () => {
  let deleted = false, attempts = 0, token = 0, writes = 0;
  const paper = {id:21,title:'Birds',status:'withdrawn',config:{targetType:'all',questionCount:5},assignedCount:2,submittedCount:1,workflow:{version:1,sourceType:'files',issues:[]}};
  for(const path of ['users','notification-schedules','notifications']) cy.intercept('GET',`**/api/admin/${path}*`,{code:200,data:{list:[],total:0}});
  cy.intercept('GET','**/api/admin/me',{code:200,data:{username:'admin'}});
  cy.intercept('GET','**/api/admin/reading-practices?*',req=>{ const page=Number(new URL(req.url).searchParams.get('page')||1); req.reply({code:200,data:{list:deleted?(page===1?[{...paper,id:1,title:'Retained'}]:[]):[paper],total:deleted?20:21}}); }).as('list');
  cy.intercept('GET','**/api/admin/reading-practices/21/deletion-preview?*',req=>{ const scope=new URL(req.url).searchParams.get('scope'); token++; req.reply({code:200,data:{scope,practiceIds:scope==='family'?[21,22]:[21],versions:[{id:21,title:'Birds',version:1,status:'withdrawn'}],counts:{practices:scope==='family'?2:1,assignments:2,submissions:1,notifications:1,receipts:2,events:3,runs:1,sources:1,sharedSources:1},confirmationToken:`token-${token}`}}); }).as('preview');
  cy.intercept('DELETE','**/api/admin/reading-practices/21',req=>{ writes++; attempts++; expect(req.body).to.deep.equal({scope:'family',confirmed:true,confirmationToken:`token-${token}`}); if(attempts===1) req.reply({statusCode:409,body:{code:409,message:'范围已变化'}}); else {deleted=true;req.reply({code:200,data:{deleted:true,practiceIds:[21,22],sourceCleanup:{pending:1}}});} }).as('remove');
  cy.viewport(width,900); cy.visit('http://127.0.0.1:5197/admin/?section=practices'); cy.wait('@list');
  cy.get('.ant-pagination-item-2').click(); cy.wait('@list');
  const open=()=>{cy.contains('button','更多').click();cy.contains('[role="menuitem"]','永久删除').click();cy.wait('@preview');};
  open();cy.contains('[role="dialog"]','答卷及成绩：1').should('be.visible');cy.wait(400);cy.get('[role="dialog"]').screenshot(`permanent-delete-modal-${width}`);cy.contains('[role="dialog"] button','取 消').click();cy.then(()=>expect(writes).eq(0));
  open();cy.contains('label','同时删除本练习的所有版本').click();cy.wait('@preview');cy.contains('练习版本：2').should('be.visible');cy.contains('[role="dialog"] button','永久删除').should('be.disabled');
  cy.contains('label','我已了解').click();cy.contains('[role="dialog"] button','永久删除').click();cy.wait('@remove');cy.wait('@preview');cy.contains('删除未完成').should('be.visible').and('contain','范围已变化');cy.contains('label','我已了解').find('input').should('not.be.checked');
  cy.contains('label','我已了解').click();cy.contains('[role="dialog"] button','永久删除').click();cy.wait('@remove');cy.contains('部分专属附件仍在后台清理中').should('be.visible');cy.get('.ant-pagination-item-1').should('have.class','ant-pagination-item-active');cy.contains('Retained').should('exist');
 });
});
