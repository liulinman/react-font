// New received-practice IELTS UI; API fixtures here, SQL/HTTP exercised separately.
describe('Received practice IELTS workspace', () => {
  for (const width of [1440,390]) it(`uses the full exam workspace and submits real shared-answer schema at ${width}px`, () => {
    let submitted = false;
    const paper = { id:81,title:'The origins of birds',paragraphs:['Huxley studied theropods. The dinosaurs lacked collarbones.'],instructions:'Complete the sentences. Choose ONE WORD ONLY from the passage.',questions:[{id:'q1',kind:'sentence_completion',stem:'Huxley studied a group called ____ .',options:[],maxWords:1},{id:'q2',kind:'choice',stem:'What did these dinosaurs lack?',options:['Collarbones','Legs','Eyes']}],ieltsBand:null,status:'published',started:false,submitted:false };
    const result = {practiceId:81,submittedAt:'2026-10-21T00:00:00Z',allowUnanswered:true,score:50,correctCount:1,total:2,results:[{...paper.questions[0],answerText:'theropods',acceptedAnswers:['theropods'],correctIndex:null,correct:true,explanation:'原文提供该名称。',evidence:{paragraph:1,quote:'Huxley studied theropods.'}},{...paper.questions[1],unanswered:true,correctIndex:0,correct:false,explanation:'原文提到锁骨。',evidence:{paragraph:1,quote:'lacked collarbones'}}]};
    cy.intercept('POST','**/user/getCurrentUser',{code:200,data:{id:1,username:'tester',avatar:''}});
    cy.intercept('GET','**/notifications?*',{code:200,data:{list:[],total:0}});cy.intercept('GET','**/notifications/unread-count',{code:200,data:{count:0}});
    for(const path of ['notifications/events','context-lab/task-events'])cy.intercept('GET',`**/${path}`,{statusCode:200,headers:{'content-type':'text/event-stream'},body:''});
    cy.intercept('GET','**/api/reading-practices/81',req=>req.reply({code:200,data:{...paper,submitted}}));
    cy.intercept('GET','**/api/reading-practices/81/result',{code:200,data:result});
    cy.intercept('GET','**/api/reading-practices/81/feedback',{code:200,data:{list:[]}});
    cy.intercept('POST','**/api/reading-practices/81/start',{code:200,data:{started:true}}).as('start');
    cy.intercept('POST','**/api/reading-practices/81/submissions',req=>{expect(req.body.allowUnanswered).to.equal(true);expect(req.body.answers).to.deep.equal([{questionId:'q1',answerText:'theropods'},{questionId:'q2',unanswered:true}]);submitted=true;req.reply({code:200,data:result});}).as('submit');
    cy.intercept('POST','**/context-lab/submit',()=>{throw Error('Wrong exercise service used');});
    cy.viewport(width,900);cy.visit(`${width===390?'/mobile':'/englishWorld'}/reading-practices/81`);
    cy.contains('The origins of birds').should('be.visible');cy.contains('button','开始考试').click();cy.wait('@start');
    cy.get('.ielts-exam').should('be.visible');cy.get('[aria-label="剩余时间"]').should('contain','19:');
    if(width===390)cy.contains('button','答题').click();
    cy.get('input[aria-label="第 1 题答案"]').type('theropods');cy.get('[aria-label="待检查"]').check();
    cy.get('[aria-label="第 1 题，已答，待检查"]').should('exist');
    cy.contains('button','Help').click();cy.get('[role="dialog"][aria-label="Help"]').should('be.visible');cy.contains('button','关闭帮助').click();
    cy.contains('button','Hide').click();cy.get('[role="dialog"][aria-label="试卷已隐藏"]').should('be.visible');cy.contains('button','Resume').click();
    if(width===1440){
      cy.get('[data-testid="exam-text-article"]').then($element=>{
        const element=$element[0], doc=element.ownerDocument, walker=doc.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null;
        while((node=walker.nextNode())){const index=node.textContent?.indexOf('Huxley')??-1;if(index>=0){const range=doc.createRange();range.setStart(node,index);range.setEnd(node,index+6);const selection=doc.defaultView!.getSelection()!;selection.removeAllRanges();selection.addRange(range);break;}}
      }).trigger('contextmenu',{clientX:180,clientY:320});
      cy.contains('button','Notes').click();cy.get('[aria-label="选文笔记"]').type('原文证据');cy.get('[aria-label="关闭笔记"]').click();cy.get('mark.has-note').should('contain','Huxley');
    }
    cy.reload();if(width===390)cy.contains('button','答题').click();
    if(width===1440){cy.get('mark.has-note').click();cy.get('[aria-label="选文笔记"]').should('have.value','原文证据');cy.get('[aria-label="关闭笔记"]').click();}
    cy.get('input[aria-label="第 1 题答案"]').should('have.value','theropods');cy.get('[aria-label="第 1 题，已答，待检查"]').should('exist');
    cy.get('[aria-label="考试字号"]').select('22');
    if(width===390)cy.get('.ielts-exam-panes').then($pane=>cy.get('.ielts-exam-questions').should($questions=>expect($questions[0].getBoundingClientRect().height).to.be.greaterThan($pane[0].getBoundingClientRect().height*0.9)));
    cy.get('body').then(body=>expect(body[0].scrollWidth).to.be.at.most(width));
    cy.screenshot(`received-ielts-${width}`,{capture:'viewport'});
    cy.contains('button','交卷').click();cy.contains('1 道题未作答').should('be.visible');cy.contains('button','确认交卷').click();cy.wait('@submit');
    cy.contains('考试已完成').should('be.visible');cy.contains('button','再考一次').should('not.exist');
    cy.reload();cy.contains('考试已完成').should('be.visible');if(width===390)cy.contains('button','答题').click();cy.get('input[aria-label="第 1 题答案"]').should('have.value','theropods').and('be.disabled');
  });
});
