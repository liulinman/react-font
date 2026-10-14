describe('Site presentation and navigation',()=>{
 beforeEach(()=>{cy.viewport(1200,800);cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});});
 const pages=['','/words','/ai-word','/bulk-import','/overwrite-stats','/recite','/context-lab','/ielts-core','/memory-map','/knowledge-notes','/reading-practices','/stats','/settings'];
 for(const path of pages)it(`desktop ${path||'home'}`,()=>{
  cy.visit('/englishWorld'+path);cy.get('.english-world-main').should('be.visible');
  cy.get('.english-world-context-path strong').should('not.have.text','English World');
  cy.document().should(d=>expect(d.documentElement.scrollWidth).to.be.at.most(d.documentElement.clientWidth));
  cy.get('.english-world-nav').should($n=>expect($n[0].scrollWidth).to.be.at.most($n[0].clientWidth+1));
  cy.screenshot(`desktop-${path.replace('/','')||'home'}`,{capture:'viewport'});
 });
 it('populated reading list and dark theme',()=>{
  cy.intercept('GET','/api/reading-practices*',{code:200,data:{total:2,list:[{id:701,title:'How Urban Trees Cool Their Neighbourhoods',ieltsBand:6,questionCount:5,submitted:true,score:80,status:'published'},{id:702,title:'The Psychology of Waiting in Line',ieltsBand:6,questionCount:5,submitted:false,status:'published'}]}});
  cy.visit('/englishWorld/reading-practices');cy.contains('h2','How Urban Trees').should('be.visible');cy.contains('a','查看解析').should('be.visible');cy.screenshot('reading-list-populated',{capture:'viewport'});
  cy.window().then(win=>win.localStorage.setItem('english-world-theme',JSON.stringify({appearance:'dark',accent:'blue'})));
  cy.reload();
  cy.get('html').should('have.attr','data-theme','dark');cy.contains('h2','How Urban Trees').should('be.visible');cy.screenshot('reading-list-dark',{capture:'viewport'});
 });
 it('login has a usable form',()=>{cy.request('POST','/api/user/logout',{});cy.visit('/login');cy.get('input').first().should('be.visible');cy.screenshot('login',{capture:'viewport'});});
 it('collapsed sidebar remains navigable',()=>{cy.visit('/englishWorld/reading-practices');cy.get('button[aria-label="收起侧栏"]').click();cy.get('button[aria-label="展开侧栏"]').should('be.visible');cy.reload();cy.get('button[aria-label="展开侧栏"]').should('be.visible').click();});
 for(const path of ['/mobile','/mobile/words','/mobile/me','/mobile/reading-practices','/mobile/me/notifications'])it(`mobile ${path}`,()=>{
  cy.viewport(390,844);cy.visit(path);cy.get('h1').should('be.visible');cy.document().should(d=>expect(d.documentElement.scrollWidth).to.be.at.most(d.documentElement.clientWidth));cy.screenshot(path.replaceAll('/','-'),{capture:'viewport'});
 });
 it('admin pages and narrow navigation',()=>{
  cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});cy.visit('/admin/');
  for(const name of ['阅读练习','用户管理','公告发布','定时任务','历史记录']){cy.contains('nav button',name).click();cy.get('.admin-toolbar h1').should('contain',name);cy.screenshot(`admin-${name}`,{capture:'viewport'});}
  cy.viewport(390,844);cy.get('.admin-nav').should('be.visible');cy.contains('nav button','历史记录').scrollIntoView().click();cy.document().should(d=>expect(d.documentElement.scrollWidth).to.be.at.most(d.documentElement.clientWidth));
 });
});
