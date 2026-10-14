// Real local MySQL/Nest API. Only the external AI provider is replaced by the test server.
describe('Shared reading practice release acceptance',()=>{
 it('admin creates and publishes; two users independently submit and recover results on desktop/mobile',()=>{
  cy.viewport(1200,680);
  cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});
  cy.visit('/admin/');cy.contains('nav button','阅读练习').click();cy.contains('button','新建练习').click();
  cy.get('textarea').filter(':visible').type('Community gardens and everyday life');cy.contains('button','生成草稿').click();
  cy.contains('待审核',{timeout:30000}).should('be.visible');cy.contains('button','审核练习').first().click();cy.contains('审核练习 · 含标准答案').should('be.visible');cy.contains('题目与解析').should('exist');
  cy.contains('button','审核通过并发布').should('be.disabled');cy.contains('我已核对文章、题目、正确答案和解析').click();cy.contains('button','审核通过并发布').click();cy.contains('button','确认发布').click();cy.contains('已发布',{timeout:10000}).should('be.visible');cy.screenshot('admin-reading-published',{capture:'viewport'});
  cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
  cy.request('/api/reading-practices').then(({body})=>{
   const id=body.data.list[0].id;
   cy.request(`/api/reading-practices/${id}`).then(({body})=>{expect(JSON.stringify(body)).not.to.match(/correctIndex|explanation|evidence/);});
   cy.visit(`/englishWorld/reading-practices/${id}`);cy.contains('h1','Community Gardens').should('be.visible');cy.contains('button','提交答案').click();cy.get('[role=alert]').should('contain','第 1 题');
   cy.get('.rp-questions fieldset').each($field=>cy.wrap($field).find('input').first().check());cy.screenshot('desktop-reading-answer',{capture:'viewport'});
   cy.contains('button','提交答案').click();cy.contains('练习已完成',{timeout:10000}).should('be.visible');cy.get('.rp-score strong').should('have.text','100');
   cy.reload();cy.contains('h2','答案与解析').should('be.visible');cy.screenshot('desktop-reading-result',{capture:'viewport'});
   cy.request('POST','/api/user/logout',{});cy.request('POST','/api/user/login',{username:'automation_other',password:'Automation123!'});
   cy.viewport(320,680);cy.visit('/mobile/me/notifications');cy.contains('a','开始练习').first().click();cy.location('pathname').should('eq',`/mobile/reading-practices/${id}`);cy.contains('h1','Community Gardens').should('be.visible');cy.contains('button','答题').click();cy.get('input:checked').should('have.length',0);
   cy.get('.rp-questions fieldset').each($field=>cy.wrap($field).find('input').eq(1).check());cy.get('body').then($body=>expect($body[0].scrollWidth).to.be.at.most(320));cy.screenshot('mobile-reading-answer',{capture:'viewport'});
   cy.contains('button','提交答案').click();cy.contains('练习已完成').should('be.visible');cy.get('.rp-score strong').should('have.text','0');cy.reload();cy.contains('h2','答案与解析').should('be.visible');cy.screenshot('mobile-reading-result',{capture:'viewport'});
   cy.request('POST','/api/admin/reading-practices/'+id+'/withdraw',{});cy.reload();cy.contains('h2','答案与解析').should('be.visible');
  });
 });
});
