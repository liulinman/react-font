const paper = {id:999,title:'The Psychology of Waiting in Line',ieltsBand:6,status:'published',submitted:false,paragraphs:Array.from({length:12},()=> 'Waiting in queues is a universal experience. Our perception of waiting time is shaped by psychological factors. '.repeat(5)),questions:Array.from({length:8},(_,i)=>({id:`q${i}`,kind:'true_false_not_given',stem:'The actual length of a wait is the only factor that determines how long it feels.',options:['True','False','Not Given']}))};
function checkPanes(){
 cy.document().should(d=>{expect(d.documentElement.scrollWidth).to.be.at.most(d.documentElement.clientWidth);expect(d.documentElement.scrollHeight).to.be.at.most(d.documentElement.clientHeight+1);});
 cy.get(".rp-questions").scrollTo("top");
 cy.get('.rp-article').then($a=>expect($a[0].scrollHeight).to.be.greaterThan($a[0].clientHeight));
 cy.get('.rp-questions').then($q=>expect($q[0].scrollHeight).to.be.greaterThan($q[0].clientHeight));
 cy.get('.rp-article').scrollTo(0,200);cy.get('.rp-questions').should($q=>expect($q[0].scrollTop).to.eq(0));
 cy.get('.rp-questions').scrollTo('bottom');cy.get('.rp-article').should($a=>expect($a[0].scrollTop).to.eq(200));
 cy.get('.english-world-main').should($m=>expect($m[0].scrollHeight).to.be.at.most($m[0].clientHeight+1));
}
describe('Reading pane scrolling',()=>{
 beforeEach(()=>{
 cy.intercept('/api/**',{statusCode:200,body:{code:200,data:{list:[],total:0,unreadCount:0}}});
 cy.intercept('POST','/api/user/getCurrentUser',{code:200,data:{id:999,username:'layout_test',status:'active'}});
 cy.intercept('GET','/api/reading-practices/999',{code:200,data:paper});
 });
 it('scrolls desktop article and questions independently with an unobstructed footer',()=>{
 cy.viewport(1200,680);cy.visit('/englishWorld/reading-practices/999');cy.contains('h1',paper.title).should('be.visible');checkPanes();
 cy.get('.rp-submit').should($f=>{const r=$f[0].getBoundingClientRect();expect(r.bottom).to.be.at.most(680);});
 cy.get('.rp-questions').then($q=>cy.get('.rp-submit').should($f=>expect($q[0].getBoundingClientRect().bottom).to.be.at.most($f[0].getBoundingClientRect().top)));
 cy.screenshot('independent-reading-panes',{capture:'viewport'});
 cy.viewport(1024,600);checkPanes();cy.contains('button','提交答案').click();cy.focused().should('have.id','question-0');
 });
 it('scrolls result explanations independently of the original passage',()=>{
 cy.intercept('GET','/api/reading-practices/999/result',{code:200,data:{practiceId:999,score:100,correctCount:8,total:8,submittedAt:'2026-10-12T10:00:00Z',results:paper.questions.map(q=>({...q,correct:true,correctIndex:0,selectedIndex:0,explanation:'根据原文可判断这个陈述与文章一致。',evidence:{paragraph:1,quote:'Waiting in queues is a universal experience.'}}))}});
 cy.viewport(1200,680);cy.visit('/englishWorld/reading-practices/999/result');cy.contains('h2','答案与解析').should('be.visible');checkPanes();
 });
 it('keeps mobile article and question tabs',()=>{
 cy.viewport(390,844);cy.visit('/mobile/reading-practices/999');cy.contains('h1',paper.title).should('be.visible');cy.get('.rp-article').should('be.visible');cy.get('.rp-questions').should('not.be.visible');cy.contains('button','答题').click();cy.get('.rp-questions').should('be.visible');
 });
});
