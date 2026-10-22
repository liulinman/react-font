// Web UI response fixtures; real SQL/HTTP evidence is in the backend integration suite.
describe('Web automatic reading review', () => {
  function setup() {
    let p:any={id:71,title:'Web review',status:'draft',config:{targetType:'all',questionCount:1,ieltsBand:6},assignedCount:0,submittedCount:0,workflow:{revision:1,qualityRevision:1,autoReview:{status:'ready'},issues:[],sources:[],reviewedQuestions:[]},content:{title:'Web review',paragraphs:['Birds have claws.'],questions:[{id:'q1',kind:'sentence_completion',stem:'Birds have ____.',options:[],correctIndex:null,acceptedAnswers:['claws'],maxWords:1,explanation:'原文说明鸟有爪。',evidence:{paragraph:1,quote:'Birds have claws.'}}]}};
    for(const path of ['users','notifications','notification-schedules'])cy.intercept('GET',`**/api/admin/${path}*`,{code:200,data:{list:[],total:0}});
    cy.intercept('GET','**/api/admin/me',{code:200,data:{username:'admin'}});
    cy.intercept('GET','**/api/admin/reading-practices?*',req=>req.reply({code:200,data:{list:[p],total:1}}));
    cy.intercept('GET','**/api/admin/reading-practices/71',req=>req.reply({code:200,data:p}));
    cy.intercept('GET','**/api/admin/reading-practices/71/feedback',{code:200,data:{list:[]}});
    cy.intercept('POST','**/api/admin/reading-practices/71/save-check',req=>{expect(req.body.content.questions[0].explanation).to.equal('修改后的解析');p={...p,content:req.body.content,workflow:{...p.workflow,revision:2,qualityRevision:2}};req.reply({code:200,data:p});}).as('saveCheck');
    cy.intercept('POST','**/api/admin/reading-practices/71/publish',req=>{expect(req.body.confirmAll).to.equal(true);expect(req.body.reviewed).to.equal(true);p={...p,status:'published'};req.reply({code:200,data:p});}).as('publish');
    return {setPaper:(value:any)=>{p=value;},getPaper:()=>p};
  }
  it('edits in place and publishes with one final confirmation without per-question checkboxes',()=>{
    setup();cy.viewport(1440,1000);cy.visit('/admin/?section=practices');cy.contains('button','审核练习').click();
    cy.get('.reading-workbench input[type=checkbox]').should('not.exist');cy.contains('button','完成核对').should('not.exist');
    cy.contains('button','修改本题').click();cy.get('[aria-label="就地修改解析"]').clear().type('修改后的解析');cy.contains('button','保存并复查本题').click();cy.wait('@saveCheck');
    cy.contains('button','确认并发布').click();cy.get('.ant-modal:visible').contains('button','再检查一下').click();cy.get('@publish.all').should('have.length',0);
    cy.contains('button','确认并发布').click();cy.get('.ant-modal:visible').contains('button','确认发布').click();cy.wait('@publish');cy.screenshot('web-auto-review-published',{capture:'viewport'});
  });
  it('polls processing until ready without requiring another check button',()=>{
    const state=setup();state.setPaper({...state.getPaper(),workflow:{...state.getPaper().workflow,qualityRevision:null,autoReview:{status:'processing'} }});
    cy.viewport(1440,1000);cy.visit('/admin/?section=practices');cy.contains('button','审核练习').click();cy.contains('AI 正在自动整理').should('be.visible');cy.contains('button','确认并发布').should('be.disabled');
    cy.then(()=>state.setPaper({...state.getPaper(),workflow:{...state.getPaper().workflow,qualityRevision:1,autoReview:{status:'ready'}}}));cy.contains('button','确认并发布',{timeout:10000}).should('not.be.disabled');
  });
  it('starts automatic processing from pasted material and directly opens the processing drawer',()=>{
    const state=setup();cy.intercept('POST','**/api/admin/reading-practices/imports',req=>{expect(req.body.mode).to.equal('complete_answers');expect(req.body.autoProcess).to.equal(true);state.setPaper({...state.getPaper(),status:'queued',content:null,workflow:{revision:1,issues:[],sources:[]}});req.reply({code:200,data:state.getPaper()});}).as('import');
    cy.viewport(1440,1000);cy.visit('/admin/?section=practices');cy.contains('button','新建练习').click();cy.contains('.ant-segmented-item','粘贴文本').click();cy.get('textarea#text').type('Birds have claws. Questions: Birds have ____.');cy.contains('button','开始整理').click();cy.wait('@import');cy.get('.reading-workbench').should('be.visible');
  });
  it('waits for every PDF/photo upload before starting one automatic task',()=>{
    const state=setup();let uploads=0;
    cy.intercept('POST','**/api/admin/reading-practices/sources',req=>{const n=++uploads;req.reply({delay:n===1?1500:3500,body:{code:200,data:{id:`source-${n}`,name:`test-${n}.png`,mime:'image/png',pages:1,size:100,url:`/admin/reading-practices/sources/source-${n}`}}});}).as('upload');
    cy.intercept('POST','**/api/admin/reading-practices/imports',req=>{expect(req.body.sourceIds).to.have.length(2);expect(req.body.autoProcess).to.equal(true);state.setPaper({...state.getPaper(),status:'queued',content:null});req.reply({code:200,data:state.getPaper()});}).as('importFiles');
    cy.viewport(1440,1000);cy.visit('/admin/?section=practices');cy.contains('button','新建练习').click();
    cy.get('input[type=file]').last().selectFile([{contents:Cypress.Buffer.from('%PDF-test'),fileName:'test.pdf',mimeType:'application/pdf'},{contents:Cypress.Buffer.from('photo'),fileName:'photo.png',mimeType:'image/png'}],{force:true});
    cy.contains('button','开始整理').should('be.disabled');cy.wait('@upload');cy.contains('button','开始整理').should('be.disabled');cy.wait('@upload');cy.contains('button','开始整理').should('not.be.disabled').click();cy.wait('@importFiles');
  });

});
