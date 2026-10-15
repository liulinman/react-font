describe('Published practice additional recipients',()=>{
 it('adds a second learner from the list and preserves the completed first learner',()=>{
  const title=`追加接收人验收 ${Date.now()}`;
  let practiceId:number,aliceId:number,bobId:number,originalResult:any;
  const admin='/api/admin/reading-practices';
  const poll=(id:number,attempt=0):Cypress.Chainable<any>=>cy.request(`${admin}/${id}`).then(({body})=>{
   if(body.data.status==='draft')return body.data;
   expect(attempt).to.be.lessThan(30);return cy.wait(1000).then(()=>poll(id,attempt+1));
  });
  cy.viewport(1440,1000);
  cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});
  cy.request('/api/admin/users?page=1&pageSize=50').then(({body})=>{
   aliceId=body.data.list.find((x:any)=>x.username==='automation_learner').id;
   bobId=body.data.list.find((x:any)=>x.username==='automation_other').id;
   return cy.request('POST',`${admin}/imports`,{title,requestUid:`recipient-browser-${Date.now()}`,mode:'format',text:'The first course offered 12 places. The second course offered 16 places. The garden opens on Monday.',sourceIds:[],config:{topic:'Recipient acceptance',wordCount:200,questionCount:3,ieltsBand:6,questionTypes:['choice','true_false_not_given'],targetType:'selected',targetUserIds:[aliceId]}});
  }).then(({body})=>{practiceId=body.data.id;return poll(practiceId);})
  .then(p=>cy.request('POST',`${admin}/${practiceId}/check`,{revision:p.workflow.revision}))
  .then(({body})=>cy.request('POST',`${admin}/${practiceId}/review`,{revision:body.data.workflow.revision,questionIds:body.data.content.questions.map((q:any)=>q.id),resolutions:[]}))
  .then(({body})=>cy.request('POST',`${admin}/${practiceId}/publish`,{revision:body.data.workflow.revision,reviewed:true,requestUid:`recipient-publish-${Date.now()}`}));
  cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
  cy.then(()=>cy.request('POST',`/api/reading-practices/${practiceId}/start`,{}));
  cy.then(()=>cy.request('POST',`/api/reading-practices/${practiceId}/submissions`,{requestUid:`recipient-submission-${Date.now()}`,answers:[{questionId:'q1',selectedIndex:0},{questionId:'q2',selectedIndex:0},{questionId:'q3',selectedIndex:2}]}));
  cy.then(()=>cy.request(`/api/reading-practices/${practiceId}/result`)).then(({body})=>{originalResult=body.data;});
  cy.request('POST','/api/user/logout',{});
  cy.request('POST','/api/user/login',{username:'automation_other',password:'Automation123!'});
  cy.then(()=>cy.request({url:`/api/reading-practices/${practiceId}`,failOnStatusCode:false})).its('status').should('eq',404);
  cy.visit('/admin/');cy.contains('nav button','阅读练习').click();
  cy.contains('tr',title).should('contain','1 / 1').within(()=>cy.contains('button',/^追加接收人$/).click());
  cy.get('.ant-modal-content').should('contain',title).and('contain','automation_learner').and('contain','已提交');
  cy.get('.ant-modal-content').contains('button',/确认追加/).should('be.disabled');
  cy.get('.ant-modal-content input[role=combobox]').click().type('automation');
  cy.get('.ant-select-dropdown').contains('.ant-select-item-option','automation_learner').should('have.class','ant-select-item-option-disabled');
  cy.get('.ant-select-dropdown').contains('.ant-select-item-option','automation_other').click();
  cy.get('.ant-modal-content h3').click();
  cy.get('.ant-modal-content').contains('button',/确认追加.*1/).click();
  cy.get('.ant-modal-content').contains('tr','automation_other').should('exist');
  cy.screenshot('reading-add-recipients-desktop');
  cy.viewport(390,844);
  cy.get('.ant-modal-content').should('be.visible');
  cy.get('body').then(($body)=>expect($body[0].scrollWidth).to.be.at.most(390));
  cy.screenshot('reading-add-recipients-mobile');
  cy.viewport(1440,1000);
  cy.get('.ant-modal-footer').contains('button',/^关\s*闭$/).click();
  cy.contains('tr',title).should('contain','1 / 2').within(()=>cy.contains('button','预览').click());
  cy.contains('[role=tab]','反馈与纠错').click();
  cy.get('.ant-drawer-body').contains('button',/^追加接收人$/).click();
  cy.get('.ant-modal-content').should('contain','automation_learner').and('contain','automation_other');
  cy.then(()=>cy.request(`/api/reading-practices/${practiceId}`)).its('status').should('eq',200);
  cy.then(()=>cy.request(`${admin}/${practiceId}`)).then(({body})=>expect(body.data.assignedCount).to.eq(2));
  cy.request('POST','/api/user/logout',{});
  cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
  cy.then(()=>cy.request(`/api/reading-practices/${practiceId}/result`)).then(({body})=>expect(body.data).to.deep.eq(originalResult));
 });
});
