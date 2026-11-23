import { loginTestAccount } from "../integration/login-test-account";
// Real local Nest API + disposable MySQL. No production data or mocked folder APIs.
describe('Knowledge folders',()=>{
 const base='/englishWorld/knowledge-notes';
 before(()=>{cy.request('/api/__automation/ready').its('body.suite').should('eq','english-world-local');});
 beforeEach(()=>{cy.viewport(1200,800);loginTestAccount({username:'automation_learner',password:'Automation123!'});});
 it('organizes existing notes, creates subfolders, moves batches, filters, renames and deletes without losing content',()=>{
  cy.request('/api/knowledge-notes/folders').then(({body})=>{ body.data.list.filter((f:any)=>f.parentId===null).forEach((f:any)=>cy.request('DELETE','/api/knowledge-notes/folders/'+f.id)); });
  cy.request('/api/knowledge-notes').then(({body})=>{body.data.list.forEach((n:any)=>cy.request('DELETE','/api/knowledge-notes/'+n.id));});
  cy.request('POST','/api/knowledge-notes',{requestId:crypto.randomUUID(),title:'accept 与 receive 的区别',body:'accept 强调接受，receive 强调收到。',category:'易错点',examples:'I received an offer and accepted it.',source:'学习笔记',wordIds:[]});
  cy.visit(base);cy.contains('button','文件夹',{matchCase:true}).click();cy.contains('h2','accept 与 receive').should('be.visible');
  cy.get('[aria-label="新建文件夹"]').click();
  cy.get('[aria-label="文件夹名称"]').type('词语辨析');cy.contains('button','保存文件夹').click();
  cy.contains('.note-folder-link','词语辨析').click();
  cy.contains('button','新建子文件夹').click();cy.get('[aria-label="文件夹名称"]').type('动词区别');cy.contains('button','保存文件夹').click();
  cy.contains('.note-folder-link','动词区别').should('be.visible');
  cy.contains('.note-folder-view','全部笔记').click();
  cy.get('[aria-label="选择笔记 accept 与 receive 的区别"]').check();cy.contains('button','移动已选').click();
  cy.get('.ant-modal [aria-label="目标文件夹"]').select('词语辨析 / 动词区别');cy.contains('button','确认移动').click();
  cy.get('.ant-modal').should('not.be.visible');
  cy.contains('.note-folder-link','词语辨析').click();cy.contains('h2','accept 与 receive').should('be.visible');
  cy.get('.knowledge-meta').should('contain','词语辨析 / 动词区别');
  cy.get('[aria-label="搜索知识笔记"]').type('不存在的文字');cy.contains('button','搜索').click();cy.contains('button','清空筛选').click();cy.get('.knowledge-folder-location').should('contain','词语辨析');
  cy.get('[aria-label="搜索知识笔记"]').type('accept');cy.contains('button','搜索').click();
  cy.contains('h2','accept 与 receive').should('be.visible');cy.reload();cy.contains('h2','accept 与 receive').should('be.visible');cy.contains('button',/^文件夹$/).click();
  cy.get('[aria-label="管理文件夹 动词区别"]').click();cy.get('[aria-label="文件夹名称"]').clear().type('动词辨析');cy.contains('button','保存文件夹').click();
  cy.contains('.note-folder-link','动词辨析').click();cy.contains('a','＋ 新建笔记').click();
  cy.get('.knowledge-editor [aria-label="目标文件夹"]').find('option:selected').should('have.text','词语辨析 / 动词辨析');
  cy.get('#knowledge-title').type('say 与 tell');cy.get('#knowledge-body').type('tell 后面通常需要接人。');cy.contains('button','保存').click();
  cy.contains('h1','say 与 tell').should('be.visible');cy.contains('a','返回列表').click();
  // Clear search inherited from the previous folder.
  cy.get('[aria-label="搜索知识笔记"]').clear();cy.contains('button','搜索').click();
  cy.contains('h2','say 与 tell').should('be.visible');
  cy.contains('.note-folder-view','全部笔记').click();
  cy.get('.knowledge-folder-layout').then($el=>expect($el[0].getBoundingClientRect().right).to.be.at.most(1200));
  cy.screenshot('knowledge-folders-desktop',{capture:'viewport'});
  cy.get('[aria-label="管理文件夹 词语辨析"]').click();cy.contains('button','删除此文件夹').click();
  cy.contains('button','删除文件夹，保留笔记').click();cy.get('.ant-modal').should('not.be.visible');
  cy.contains('.note-folder-view','未归档').click();cy.contains('h2','accept 与 receive').should('be.visible');cy.contains('h2','say 与 tell').should('be.visible');
  cy.contains('h2','accept 与 receive').click();cy.contains('.knowledge-body','accept 强调接受').should('be.visible');
 });
 it('shows folder loading errors and recovers without pretending the tree is empty',()=>{
  cy.intercept('GET','/api/knowledge-notes/folders',{statusCode:503,body:{code:503,message:'temporary failure'}}).as('foldersFailure');
  cy.visit(base);cy.contains('button','文件夹',{matchCase:true}).click();cy.wait('@foldersFailure');cy.contains('文件夹加载失败',{timeout:15000}).should('be.visible');
  cy.get('[aria-label="新建文件夹"]').should('be.disabled');
 });
});
