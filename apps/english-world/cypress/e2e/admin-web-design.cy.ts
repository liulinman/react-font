// Desktop-only walkthrough, real isolated API. No production records are changed.
describe('Web admin visual hierarchy and navigation',()=>{
 it('walks every administration section and reading workflow surface',()=>{
  cy.viewport(1280,720);
  const title=`The Community Garden ${Date.now()}`;let id:number;
  const api='/api/admin/reading-practices';
  const poll=(n:number):Cypress.Chainable<any>=>cy.request(`${api}/${n}`).then(({body})=>body.data.status==='draft'?body.data:cy.wait(500).then(()=>poll(n)));
  const shot=(name:string)=>{cy.wait(400); // Let portal transitions finish before visual capture.
  cy.get('body').then($b=>expect($b[0].scrollWidth).to.be.at.most(1280));cy.screenshot(`web-${name}`,{capture:'viewport',scale:true,disableTimersAndAnimations:false});};
  const closeDrawer=()=>cy.get('.ant-drawer-close').filter(':visible').click();
  const closeModal=()=>cy.get('.ant-modal-close').filter(':visible').last().click();
  cy.request('POST','/api/admin/login',{username:'automation_admin',password:'AutomationAdmin123!'});
  cy.request('POST',api+'/imports',{requestUid:`design-${Date.now()}`,title,mode:'format',text:'The first course offered 12 places. The garden opens on Monday.',sourceIds:[],config:{topic:'Garden',wordCount:200,questionCount:3,ieltsBand:6,questionTypes:['choice','true_false_not_given'],targetType:'all'}}).then(({body})=>{id=body.data.id;return poll(id);}).then(p=>cy.request('POST',`${api}/${id}/check`,{revision:p.workflow.revision})).then(({body})=>cy.request('POST',`${api}/${id}/review`,{revision:body.data.workflow.revision,questionIds:body.data.content.questions.map((x:any)=>x.id),resolutions:[]})).then(({body})=>cy.request('POST',`${api}/${id}/publish`,{revision:body.data.workflow.revision,reviewed:true,requestUid:`design-publish-${Date.now()}`}));
  cy.request('POST','/api/user/login',{username:'automation_learner',password:'Automation123!'});
  cy.then(()=>cy.request('POST',`/api/reading-practices/${id}/start`,{}));
  cy.then(()=>cy.request('POST',`/api/reading-practices/${id}/submissions`,{requestUid:`design-submit-${Date.now()}`,answers:[{questionId:'q1',selectedIndex:0},{questionId:'q2',selectedIndex:1},{questionId:'q3',selectedIndex:2}]}));
  cy.request('POST','/api/admin/notifications',{title:'本周阅读练习已更新',body:'请完成本周阅读练习。提交后可以查看答案与解析。',category:'announcement',priority:'normal',sourceType:'manual',targetType:'all'});
  cy.request('POST','/api/admin/notification-schedules',{name:'每日阅读提醒',contentKind:'notification',category:'ielts_daily',cadence:'daily',hour:8,minute:0,timezoneOffsetMinutes:480,targetType:'all',aiMode:'draft',enabled:false});
  cy.visit('/admin/');cy.contains('nav button','阅读练习').click();cy.contains('tr',title).should('be.visible');shot('reading-list');
  cy.contains('button','新建练习').click();cy.get('.ant-drawer-content-wrapper').should('have.css','transform','none');cy.contains('[role=tab]','AI原创生成').click();shot('create-practice');cy.contains('[role=tab]','导入已有材料').click();shot('import');cy.contains('summary','添加原稿中的答案').click();cy.get('#answerText').type('1. A');cy.get('#answerText').should('have.value','1. A');closeDrawer();
  cy.contains('tr',title).find('.admin-title-link').click();cy.get('article[aria-label="阅读文章"]').should('be.visible');shot('article');cy.contains('[role=tab]','核对题目').click();shot('questions');cy.contains('[role=tab]','原稿与历史').click();shot('sources');cy.contains('[role=tab]','AI 帮助').click();shot('ai-help');cy.contains('[role=tab]','反馈与纠错').click();shot('corrections');closeDrawer();
  cy.contains('tr',title).contains('button',/^完成情况$/).click();cy.contains('.reading-analytics-summary','平均分').should('be.visible');shot('analytics');cy.contains('tr','automation_learner').contains('button','答题详情').click();cy.contains('学生答题详情').should('be.visible');shot('answer-detail');cy.contains('button','关闭详情').click();cy.contains('[role=tab]','逐题分析').click();shot('question-analysis');closeModal();
  cy.contains('tr',title).contains('button','追加接收人').click();cy.contains('h4','选择新增用户').should('be.visible');shot('recipients');closeModal();
  cy.contains('nav button','用户管理').click();cy.contains('tr','automation_learner').should('be.visible');shot('users');
  cy.contains('nav button','公告发布').click();cy.get('input[id="title"]').filter(':visible').type('周末阅读提醒');cy.get('textarea[id="body"]').filter(':visible').type('请在周末完成阅读练习，提交后查看解析。');cy.scrollTo('top');shot('announcement');cy.contains('button','预览并发送').click();cy.contains('确认发布公告').should('be.visible');shot('announcement-preview');cy.contains('button','返回编辑').click();
  cy.contains('nav button','定时任务').click();cy.contains('tr','每日阅读提醒').should('be.visible');shot('schedules');cy.contains('tr','每日阅读提醒').first().find('button[aria-label^=更多]').click();cy.contains('[role=menuitem]','删除任务').click();cy.contains('[role=dialog]','确认删除任务').should('be.visible');cy.contains('button',/取\s*消/).click();cy.contains('button','新建任务').click();shot('schedule-form');closeDrawer();
  cy.contains('nav button','历史记录').click();cy.contains('tr','本周阅读练习已更新').should('be.visible');shot('history');cy.contains('tr','本周阅读练习已更新').find('.admin-title-link').click();cy.contains('通知详情').should('be.visible');shot('notification-detail');closeDrawer();
  [1440,1920].forEach(width=>{cy.viewport(width,900);cy.contains('nav button','阅读练习').click();cy.contains('tr',title).should('be.visible');cy.get('body').should($b=>expect($b[0].scrollWidth).to.be.at.most(width));cy.get('.admin-list-toolbar').then($el=>expect($el[0].getBoundingClientRect().right).to.be.at.most(width));cy.screenshot(`web-reading-${width}`,{capture:'fullPage',scale:true,disableTimersAndAnimations:false});});cy.viewport(1280,720);
  cy.contains('button','退出').click();cy.contains('后台登录').should('be.visible');shot('login');
 });
});
