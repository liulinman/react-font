describe('Reading completion and score analytics',()=>{
 it('shows learner states, scores, question errors and current grading on desktop and mobile',()=>{
  const title=`完成情况验收 ${Date.now()}`,third=`stats_${Date.now()}`;
  const admin='/api/admin/reading-practices';let id:number,aliceId:number,bobId:number,thirdId:number;
  const poll=(practiceId:number,attempt=0):Cypress.Chainable<any>=>cy.request(`${admin}/${practiceId}`).then(({body})=>{
   if(body.data.status==='draft')return body.data;expect(attempt).to.be.lessThan(30);return cy.wait(1000).then(()=>poll(practiceId,attempt+1));
  });
  const card=(label:string,value:string)=>cy.contains('.reading-analytics-summary .ant-card',label).find('strong').should('have.text',value);
  cy.viewport(1440,1000);
  cy.request('POST','/api/user/register',{username:third,password:'Automation123!'});
  cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});
  cy.request('/api/admin/users?page=1&pageSize=100').then(({body})=>{
   aliceId=body.data.list.find((x:any)=>x.username==='automation_learner').id;bobId=body.data.list.find((x:any)=>x.username==='automation_other').id;thirdId=body.data.list.find((x:any)=>x.username===third).id;
   return cy.request('POST',`${admin}/imports`,{title,requestUid:`stats-${Date.now()}`,mode:'format',text:'The first course offered 12 places. The second course offered 16 places. The garden opens on Monday.',sourceIds:[],config:{topic:'Stats acceptance',wordCount:200,questionCount:3,ieltsBand:6,questionTypes:['choice','true_false_not_given'],targetType:'selected',targetUserIds:[aliceId,bobId,thirdId]}});
  }).then(({body})=>{id=body.data.id;return poll(id);})
   .then(p=>cy.request('POST',`${admin}/${id}/check`,{revision:p.workflow.revision}))
   .then(({body})=>cy.request('POST',`${admin}/${id}/review`,{revision:body.data.workflow.revision,questionIds:body.data.content.questions.map((q:any)=>q.id),resolutions:[]}))
   .then(({body})=>cy.request('POST',`${admin}/${id}/publish`,{revision:body.data.workflow.revision,reviewed:true,requestUid:`stats-publish-${Date.now()}`}));
  cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
  cy.then(()=>cy.request('POST',`/api/reading-practices/${id}/start`,{}));
  cy.then(()=>cy.request('POST',`/api/reading-practices/${id}/submissions`,{requestUid:`stats-alice-${Date.now()}`,answers:[{questionId:'q1',selectedIndex:0},{questionId:'q2',selectedIndex:1},{questionId:'q3',selectedIndex:2}]}));
  cy.request('POST','/api/user/logout',{});cy.request('POST','/api/user/login',{username:'automation_other',password:'Automation123!'});
  cy.then(()=>cy.request('POST',`/api/reading-practices/${id}/start`,{}));
  cy.visit('/admin/');cy.contains('nav button','阅读练习').click();
  cy.contains('tr',title).within(()=>cy.contains('button',/^完成情况$/).click());
  card('接收人数','3');card('完成率','33.3%');card('平均分','67.0');
  cy.contains('tr','automation_learner').should('contain','已完成').and('contain','67.0');
  cy.contains('tr','automation_other').should('contain','作答中');cy.contains('tr',third).should('contain','未开始');
  cy.contains('.ant-select','全部状态').click();cy.get('.ant-select-dropdown').contains('.ant-select-item-option',/^未完成$/).click();
  cy.get('.ant-tabs-tabpane-active').should('not.contain','automation_learner').and('contain','automation_other').and('contain',third);
  cy.contains('.ant-select','未完成').click();cy.get('.ant-select-dropdown').contains('.ant-select-item-option','全部状态').click();
  cy.get('input[aria-label="搜索用户名或ID"]').type('automation_learner');cy.get('.ant-tabs-tabpane-active').should('not.contain','automation_other');
  cy.contains('tr','automation_learner').contains('button','答题详情').click();
  cy.get('.ant-modal-content').filter(':visible').last().should('contain','When does the garden open?').and('contain','学生作答').and('contain','正确答案').and('contain','原文证据');
  cy.get('.ant-modal-content').filter(':visible').last().should('not.contain','How many places did the first course offer?');
  cy.contains('label','只看错题').click();cy.get('.ant-modal-content').filter(':visible').last().should('contain','How many places did the first course offer?');
  cy.contains('button','关闭详情').click();cy.get('input[aria-label="搜索用户名或ID"]').clear();
  cy.then(()=>cy.request('POST',`/api/reading-practices/${id}/submissions`,{requestUid:`stats-bob-${Date.now()}`,answers:[{questionId:'q1',selectedIndex:1},{questionId:'q2',selectedIndex:0},{questionId:'q3',selectedIndex:1}]}));
  cy.contains('button','刷新统计').click();card('平均分','50.0');card('整体错误率','50.0%');card('完成率','66.7%');
  cy.screenshot('reading-analytics-overview');
  cy.contains('[role=tab]','逐题分析').click();cy.get('.ant-tabs-tabpane-active').should('contain','错误率 50.0%').and('contain','单选题');
  cy.contains('.ant-card','How many places did the first course offer?').contains('button','查看答错学生').click();
  cy.get('.ant-modal-content').filter(':visible').last().should('contain','automation_other').and('not.contain','automation_learner');
  cy.get('.ant-modal').filter(':visible').last().find('button[aria-label="Close"]').click();
  cy.contains('.ant-modal-title','第 1 题答错学生').should('not.be.visible');
  cy.viewport(390,844);cy.get('body').then($body=>expect($body[0].scrollWidth).to.be.at.most(390));cy.screenshot('reading-analytics-mobile-questions');
  for(const questionId of ['q1','q2','q3']){
   cy.then(()=>cy.request(`${admin}/${id}`)).then(({body})=>cy.request('POST',`${admin}/${id}/correct`,{requestUid:`stats-void-${questionId}-${Date.now()}`,gradingRevision:body.data.workflow.gradingRevision,questionId,action:'void',reason:'统计验收作废题目'}));
  }
  cy.contains('button','刷新统计').click();card('平均分','—');card('整体错误率','—');card('完成率','66.7%');cy.get('.ant-tabs-tabpane-active').should('contain','已作废，不计入统计');
  cy.contains('[role=tab]','学生明细').click();cy.contains('tr','automation_learner').should('contain','不可评分').and('contain','已完成');
 });
});
