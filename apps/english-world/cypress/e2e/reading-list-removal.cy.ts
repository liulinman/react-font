// Real isolated Nest/MySQL API; external AI only uses the local fixture provider.
describe('Personal received reading list',()=>{
 it('confirms removal, retries failure, persists refresh, restores on mobile and preserves results',()=>{
  cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});
  cy.request('POST','/api/admin/reading-practices',{requestUid:`removal-browser-${Date.now()}`,config:{topic:'Gardens',wordCount:200,questionCount:3,ieltsBand:6,questionTypes:['choice'],targetType:'all'}}).then(({body})=>{
   const id=body.data.id;
   const waitDraft=(remaining=30):Cypress.Chainable<any>=>cy.request(`/api/admin/reading-practices/${id}`).then(r=>r.body.data.status==='draft'?cy.wrap(r.body.data):remaining>0?cy.wait(500).then(()=>waitDraft(remaining-1)):(()=>{throw Error('Draft did not complete')})());
   waitDraft().then(p=>cy.request('POST',`/api/admin/reading-practices/${id}/check`,{revision:p.workflow.revision})).then(({body})=>cy.request('POST',`/api/admin/reading-practices/${id}/review`,{revision:body.data.workflow.revision,questionIds:body.data.content.questions.map((q:any)=>q.id),resolutions:[]})).then(({body})=>cy.request('POST',`/api/admin/reading-practices/${id}/publish`,{reviewed:true,revision:body.data.workflow.revision,requestUid:`publish-removal-${id}`}));
   cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
   cy.visit('/englishWorld/reading-practices');
   cy.get(`button[aria-label^="移除 "]`).first().click();cy.contains('.ant-modal button',/取\s*消/).click();cy.get('.rp-card').should('have.length',1);
   cy.intercept({method:'POST',url:`**/reading-practices/${id}/remove`,times:1},{statusCode:503,body:{message:'Test transient failure'}}).as('failedRemove');
   cy.get('button[aria-label^="移除 "]').click();cy.contains('.ant-modal button','确认移除').click();cy.wait('@failedRemove');cy.get('.ant-modal [role="alert"]').should('contain','操作未完成');
   cy.contains('.ant-modal button','确认移除').click();cy.contains('h2','还没有收到练习').should('be.visible');cy.reload();cy.contains('h2','还没有收到练习').should('be.visible');
   cy.contains('button','已移除').click();cy.get('.rp-card').should('have.length',1);cy.location('search').should('contain','view=removed');cy.screenshot('removed-desktop',{capture:'viewport'});
   cy.viewport(390,844);cy.visit('/mobile/reading-practices?view=removed');cy.get('button[aria-label^="恢复 "]').should('be.visible');cy.get('body').then(b=>expect(b[0].scrollWidth).to.be.at.most(390));cy.screenshot('removed-mobile',{capture:'viewport'});
   cy.get('button[aria-label^="恢复 "]').click();cy.contains('h2','没有已移除的练习').should('be.visible');
   cy.request('POST','/api/user/login',{username:'automation_other',password:'Automation123!'});cy.request('/api/reading-practices').its('body.data.total').should('eq',1);
   cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
   cy.request('POST',`/api/reading-practices/${id}/start`,{});cy.request(`/api/reading-practices/${id}`).then(({body})=>cy.request('POST',`/api/reading-practices/${id}/submissions`,{requestUid:`submission-removal-${id}`,answers:body.data.questions.map((q:any)=>({questionId:q.id,selectedIndex:0}))})).its('body.data.score').should('eq',100);
   cy.visit('/mobile/reading-practices');cy.get('.rp-card').should('contain','已完成').and('contain','100 分');cy.get('button[aria-label^="移除 "]').click();cy.contains('.ant-modal button','确认移除').click();cy.contains('h2','还没有收到练习').should('be.visible');
   cy.request(`/api/reading-practices/${id}/result`).its('body.data.score').should('eq',100);cy.request('/api/reading-practices/learning-records').its('body.data').should('exist');
   cy.contains('button','已移除').click();cy.get('.rp-card').should('contain','100 分');cy.get('button[aria-label^="恢复 "]').click();cy.contains('h2','没有已移除的练习').should('be.visible');
  });
 });
});
