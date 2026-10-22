describe('Desktop learning navigation',()=>{
 beforeEach(()=>{
  cy.viewport(1440,900);
  cy.intercept('POST','**/user/getCurrentUser',{code:200,data:{id:1,username:'navigation-test'}});
  cy.intercept('GET','**/notifications?*',{code:200,data:{list:[],total:0}});
  cy.intercept('GET','**/notifications/unread-count',{code:200,data:{count:0}});
  cy.intercept('GET','**/notifications/events',{statusCode:200,headers:{'content-type':'text/event-stream'},body:''});
  cy.intercept('GET','**/api/word-books',{code:200,data:{list:[],total:0}});
 });
 it('shows exactly four equal-length learning labels and renames the statistics section',()=>{
  cy.visit('/englishWorld/word-books');
  cy.get('.english-world-nav-menu').should('not.contain','雅思核心复习');
  cy.get('.english-world-nav-menu').should('not.contain','IELTS');
  for(const name of ['文章精读','阅读练习','单词复习','复习手册','数据统计'])cy.get('.english-world-nav-menu').contains(name).should('be.visible');
  cy.get('.english-world-nav-menu').contains('学习').parents('.ant-menu-submenu').find('.ant-menu-sub .ant-menu-item').should('have.length',4);
  cy.get('h1').should('have.text','复习手册');cy.contains('button','制作复习手册').should('be.visible');
  cy.get('.english-world-context-bar').should('contain','复习手册');
  cy.screenshot('desktop-learning-labels',{capture:'viewport'});
 });
 it('redirects the cancelled module and removes its review-page shortcut',()=>{
  cy.intercept('POST','**/recite/session*',{code:200,data:{list:[],total:0}});
  cy.visit('/englishWorld/ielts-core');cy.location('pathname').should('eq','/englishWorld/recite');
  cy.contains('h2','单词复习').should('be.visible');
  cy.contains('button','雅思核心复习').should('not.exist');
 });
});
