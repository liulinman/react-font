// Real local HTTP + MySQL, deterministic external AI fixture. Not an OCR accuracy test.
describe('Reading source text verification and publication recovery', () => {
  let id: number;
  const get = () => cy.then(() => cy.request(`/api/admin/reading-practices/${id}`).its('body.data'));
  const ready = (attempt=0): Cypress.Chainable<any> => get().then(p => {
    if (p.status==='draft' && p.workflow.qualityRevision===p.workflow.revision) return p;
    expect(attempt).to.be.lessThan(40); return cy.wait(250).then(() => ready(attempt+1));
  });
  it('requires original proof, keeps confirmation through recheck, and only publishes after final confirmation', () => {
    cy.request('POST', '/api/admin/login', { username:'admin', password:'password' });
    cy.visit('/admin/?section=practices');
    cy.window().then(async win => {
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4mEAAAAASUVORK5CYII='), c=>c.charCodeAt(0));
      const data=new win.FormData();data.append('file',new win.Blob([bytes],{type:'image/png'}),'source-page.png');
      const response=await win.fetch('/api/admin/reading-practices/sources',{method:'POST',body:data});
      expect(response.status).to.eq(201);return (await response.json()).data;
    }).then(source => {
      const content={title:'Review recovery browser fixture',paragraphs:['The Alassk Native Language Center studies languages.'],questions:[{id:'q1',kind:'true_false_not_given',stem:'The center studies languages.',options:['YES','NO','NOT GIVEN'],correctIndex:0,explanation:'原文明示研究语言。',evidence:{paragraph:1,quote:'The Alassk Native Language Center studies languages.'}}],_issues:[{category:'uncertain',sourceConcern:'text_uncertainty',questionId:'q1',message:'原稿拼写疑问：请核对 Alassk',evidence:'Alassk Native Language Center',blocking:true}]};
      return cy.request('POST','/api/admin/reading-practices/imports',{requestUid:`browser-recovery-${Date.now()}`,mode:'complete_answers',sourceIds:[source.id],text:JSON.stringify(content),config:{targetType:'all'}});
    }).then(r => {id=r.body.data.id;});
    ready(); cy.reload();
    cy.contains('tr','Review recovery browser fixture').contains('button','审核练习').click();
    cy.get('button[aria-label="确认并发布"]').should('be.disabled');
    cy.contains('summary','核对原稿文字').click();
    cy.get('.reading-source-verification img').should('be.visible').and($img=>expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
    cy.contains('button','确认与原稿一致').should('be.disabled');
    cy.get('textarea[aria-label="核对说明"]').type('已对照所选测试原稿，本测试核验确认流程。');
    cy.get('textarea[aria-label="原稿依据"]').type('本地测试原稿；来源文字核对操作证据。');
    cy.contains('label','我已查看所选原稿').click();
    cy.get('.reading-workbench-footer').should($el=>expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth));
    cy.screenshot('reading-original-source-proof-form',{capture:'viewport'});
    cy.intercept('POST','**/verify-source-issue').as('verify');
    cy.contains('button','确认与原稿一致').click(); cy.wait('@verify').its('response.statusCode').should('eq',201);
    get().then(p=>{expect(p.status).to.eq('draft');expect(p.workflow.issues.find((i:any)=>i.type==='source_text').resolved).to.eq(true);});
    cy.get('button[aria-label="确认并发布"]').should('be.enabled');
    cy.intercept('POST','**/check').as('check');cy.contains('button','重新检查').click();cy.wait('@check');
    cy.get('button[aria-label="确认并发布"]').should('be.enabled');
    cy.screenshot('reading-source-verified-awaiting-final-confirmation',{capture:'viewport'});
    cy.get('button[aria-label="确认并发布"]').click();
    cy.get('.ant-modal').should('contain','确认发布');
    cy.get('.ant-modal').contains('button','再检查一下').click();get().its('status').should('eq','draft');
    cy.get('button[aria-label="确认并发布"]').click();
    cy.intercept('POST','**/publish').as('publish');cy.get('.ant-modal').contains('button','确认发布').click();cy.wait('@publish').its('response.statusCode').should('eq',201);
    get().its('status').should('eq','published');
  });
});
