import { loginTestAccount } from '../integration/login-test-account';
const root = '/api/intensive-reading/materials';
const id = () => crypto.randomUUID();
function createNotes() {
  const paragraphs = Array.from({ length: 12 }, (_, n) => `Section ${n + 1}. ${'Reading gives every thought room to develop. '.repeat(n === 11 ? 8 : 2)}`);
  return cy.request('POST', root, { requestId: id(), sourceType: 'text', title: 'Original reading', text: paragraphs.join('\n\n') })
    .then(r => cy.request('POST', `${root}/${r.body.data.id}/versions`, { requestId: id(), expectedVersion: r.body.data.version, title: r.body.data.title, paragraphs: r.body.data.paragraphs }))
    .then(r => {
      let chain = cy.wrap(r.body.data, { log: false });
      for (let n = 0; n < 12; n++) chain = chain.then(m => {
        const p = m.paragraphs[n];
        return cy.request('POST', `${root}/${m.id}/annotations`, { requestId: id(), expectedVersion: m.version, bodyVersionId: m.activeBodyVersionId,
          paragraphId: p.id, start: 0, end: p.text.length, quote: p.text, color: 'blue', category: '', note: `Note ${n + 1}`, isQuestion: true, resolved: false }).then(res => res.body.data);
      });
      return chain;
    });
}
function openLast() {
  return createNotes().then(m => {
    cy.visit(`/englishWorld/intensive-reading/${m.id}`);
    cy.get('.ir-reader').scrollTo(0, 180);
    cy.get('.ir-note').last().scrollIntoView().contains('button', '编辑标注').click();
    return cy.wrap(m, { log: false });
  });
}
describe('Intensive reading editing', () => {
  beforeEach(() => { cy.task('resetDatabase'); loginTestAccount({ username: 'automation_learner', password: 'Automation123!' }); });
  for (const [width, height] of [[1280, 800], [1440, 900], [1920, 1080]]) {
    it(`edits a lower note in place and starts directly with original text at ${width}x${height}`, () => {
      cy.viewport(width, height);
      openLast();
      cy.get('.ir-note').last().should('have.class', 'ir-editor').find('textarea').should('be.focused');
      cy.get('.ir-notes').then($pane => {
        const bounds = $pane[0].getBoundingClientRect();
        cy.get('.ir-editor textarea').then($input => { const rect = $input[0].getBoundingClientRect(); expect(rect.top).to.be.at.least(bounds.top); expect(rect.bottom).to.be.at.most(bounds.bottom); });
        cy.contains('.ir-editor button', '保存笔记').then($button => expect($button[0].getBoundingClientRect().bottom).to.be.at.most(bounds.bottom));
      });
      cy.get('.ir-reader').should($reader => expect($reader[0].scrollTop).to.be.closeTo(180, 1));
      cy.contains('.ir-editor button', '收起').click();
      cy.get('.ir-note').last().contains('button', '编辑标注').should('be.focused');
      cy.get('.ir-reader h1,.ir-eyebrow,.ir-dek,.ir-reader-tools').should('not.exist');
      cy.get('.ir-reader').scrollTo('top');
      cy.get('.ir-paragraph').first().then($paragraph => cy.get('.ir-reader').then($reader => expect($paragraph[0].getBoundingClientRect().top - $reader[0].getBoundingClientRect().top).to.be.lessThan(50)));
      cy.get('[aria-label="放大正文字号"]').click();
      cy.get('.ir-reader').should('have.css', 'font-size', '21px');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
      cy.screenshot(`reading-inline-${width}`);
    });
  }
  it('keeps focus and newer typing through a delayed autosave, composition and local retry', () => {
    openLast().then(m => {
      let writes = 0;
      cy.intercept('PUT', '**/intensive-reading/materials/*/annotations/*', req => { writes++; req.continue(res => res.setDelay(writes === 1 ? 1800 : 0)); }).as('save');
      cy.get('.ir-editor textarea').clear().type('First draft');
      cy.wrap(null).should(() => expect(writes).to.eq(1));
      cy.get('.ir-editor textarea').should('not.be.disabled').and('be.focused').type('{leftarrow}X').then($input => {
        const node = $input[0] as HTMLTextAreaElement;
        const value = node.value, caret = node.selectionStart;
        cy.wait('@save');
        cy.get('.ir-editor textarea').should($next => { expect($next[0]).to.eq(node); expect(node.value).to.eq(value); expect(node.selectionStart).to.eq(caret); expect(node.ownerDocument.activeElement).to.eq(node); });
        cy.wait('@save');
        cy.request(`${root}/${m.id}`).then(r => expect(r.body.data.annotations.at(-1).note).to.eq(value));
      });
      cy.get('.ir-editor textarea').trigger('compositionstart').type('中文');
      cy.then(() => { const count = writes; cy.wait(950).then(() => expect(writes).to.eq(count)); });
      cy.get('.ir-editor textarea').trigger('compositionend');
      cy.wait('@save');
      cy.intercept({ method: 'PUT', url: '**/intensive-reading/materials/*/annotations/*', times: 1 }, { statusCode: 503, body: { code: 503, message: '临时无法保存' } }).as('offline');
      cy.get('.ir-editor textarea').type('继续');
      cy.wait('@offline');
      cy.get('.ir-editor [role="alert"]').should('contain', '临时无法保存');
      cy.get('.ir-editor textarea').should('not.be.disabled').type('保留后续');
      cy.contains('.ir-editor button', '重试保存').click();
      cy.get('.ir-editor [role="alert"]').should('not.exist');
      cy.get('.ir-editor [role="status"]').should('have.text', '已保存');
      cy.request(`${root}/${m.id}`).then(r => expect(r.body.data.annotations.at(-1).note).to.contain('中文继续保留后续'));
      cy.contains('.ir-editor button', '收起').click();
      cy.contains('button', '待解决 12').click();
      cy.get('.ir-note').last().contains('button', '编辑标注').click();
      cy.get('.ir-editor input[type="checkbox"]').last().check();
      cy.get('.ir-editor [role="status"]').should('have.text', '已保存');
      cy.get('.ir-editor textarea').should('be.visible');
      cy.contains('button', '待解决 11').should('have.class', 'ir-selected');
      cy.contains('.ir-editor button', '收起').click();
      cy.get('.ir-note').should('have.length', 11);
      cy.screenshot('reading-inline-retry-filter');
    });
  });
  it('keeps a middle note stable through real autosave and later saves a position queued while busy', () => {
    createNotes().then(m => {
      cy.visit(`/englishWorld/intensive-reading/${m.id}`);
      let started=false;
      cy.intercept('PUT','**/intensive-reading/materials/*/annotations/*',req=>{started=true;req.continue(res=>res.setDelay(2600));}).as('noteSave');
      cy.intercept('PUT','**/intensive-reading/materials/*/progress').as('positionSave');
      cy.get('.ir-note').then($rows=>{
        const ids=[...$rows].map(el=>el.id), chosen=ids[5];
        cy.get('#'+chosen).scrollIntoView().contains('button','编辑标注').click();
        cy.get('.ir-editor textarea').clear().type('Middle note stays here');
        cy.wrap(null).should(()=>expect(started).to.eq(true));
        cy.get('.ir-reader').scrollTo(0,500);
        cy.wait('@noteSave');
        cy.get('.ir-note').should($after=>expect([...$after].map(el=>el.id)).to.deep.eq(ids));
        cy.get('.ir-editor').should('have.id',chosen).find('textarea').should('be.focused');
        cy.wait('@positionSave').then(interception=>cy.request(`${root}/${m.id}`).then(response=>expect(response.body.data.progress).to.deep.eq({paragraphId:interception.request.body.paragraphId,ratio:interception.request.body.ratio})));
        cy.screenshot('reading-middle-stable');
      });
    });
  });
  it('recovers material loading and coalesces search with accurate empty and error states', () => {
    createNotes().then(m=>{
      let unavailable=true;
      cy.intercept('GET',`**/intensive-reading/materials/${m.id}`,req=>unavailable?req.reply({statusCode:503,body:{code:503,message:'材料暂不可用'}}):req.continue());
      cy.visit(`/englishWorld/intensive-reading/${m.id}`);
      cy.get('[role="alert"]').should('contain','材料暂不可用');cy.then(()=>{unavailable=false;});cy.contains('button','重试加载').click();cy.get('.ir-workbench').should('be.visible');
      cy.visit('/englishWorld/intensive-reading');cy.get('.ir-material').should('have.length',1);
      let searches=0;
      cy.intercept('GET','**/intensive-reading/materials?*',req=>{searches++;req.continue(res=>res.setDelay(400));}).as('search');
      cy.get('[aria-label="搜索精读材料"]').type('no matches anywhere',{delay:0});cy.get('[role="status"]').should('contain','加载');
      cy.wait('@search');cy.contains('没有找到匹配的文章，试试其他标题。').should('be.visible');cy.then(()=>expect(searches).to.eq(1));
      cy.intercept({method:'GET',url:'**/intensive-reading/materials?*',times:1},{statusCode:503,body:{code:503,message:'查询暂不可用'}});
      cy.get('[aria-label="搜索精读材料"]').clear().type('offline',{delay:0});cy.get('[role="alert"]').should('contain','查询暂不可用');
      cy.contains('button','重试加载').click();cy.contains('没有找到匹配的文章，试试其他标题。').should('be.visible');
    });
  });
  it('protects the submitted import text while creation is in flight', () => {
    cy.visit('/englishWorld/intensive-reading');cy.get('[role="status"]').should('not.exist');cy.contains('button','＋ 导入材料').click();cy.contains('button','粘贴文章').click();
    cy.get('.ir-modal textarea').type('Submitted original paragraph.');
    cy.intercept('POST','**/intensive-reading/materials',req=>req.continue(res=>res.setDelay(1800))).as('create');cy.contains('button','整理并校对').click();
    cy.get('.ir-modal textarea,.ir-modal input').should('be.disabled');cy.contains('.ir-modal button','PDF / 照片').should('be.disabled');
    cy.wait('@create');cy.get('[aria-label="段落 1"]').should('have.value','Submitted original paragraph.');
  });

});
