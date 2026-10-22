// UI fixtures verify formatting/source preservation, not real account persistence.
const body = '## 用法说明\n\n**核心区别**\n普通第一行\n普通第二行\n\n- preserve food\n- preserve evidence\n\n> Keep the original meaning.\n\n| 词语 | 释义 | 例句 | 补充一 | 补充二 | 补充三 |\n| --- | --- | --- | --- | --- | --- |\n| preserve | 保留 | preserve knowledge | 原文 | 原文 | 原文 |\n\n```text\n**这是代码，不应加粗**\n```\n\n<script>window.noteExecuted=true</script>\n\n[课程](https://example.com)\n';
const note = { id: 7, title: '笔记排版示例', category: '词语辨析', body, examples: '**例句**\nKeep it safe.', source: '课程', words: [], folderId: null, version: 1, createdAt: '2026-10-20', updatedAt: '2026-10-20' };
const word = { id: 1, englishWord: 'preserve', englishChinese: '保留', englishLevel: 1, englishType: 0, englishNote: body };
describe('Readable notes', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/user/getCurrentUser', { code: 200, data: { id: 1, username: 'tester', avatar: '' } });
    cy.intercept('GET', '**/api/notifications?*', { code: 200, data: { list: [], total: 0 } });
    cy.intercept('GET', '**/api/notifications/unread-count', { code: 200, data: { count: 0 } });
    cy.intercept('GET', '**/api/notifications/events', { statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body: '' });
    cy.intercept('GET', '**/api/knowledge-notes/folders', { code: 200, data: { list: [], total: 0, unfiled: 1 } });
    cy.intercept('GET', '**/api/knowledge-notes?*', { code: 200, data: { list: [note], total: 1, page: 1, pageSize: 20 } });
    cy.intercept('GET', '**/api/knowledge-notes/7', { code: 200, data: note });
    cy.intercept('POST', '**/api/english/findWordList', { code: 200, data: { list: [word], total: 1, totalPages: 1 } });
    cy.intercept('POST', '**/api/english/filterWordList', { code: 200, data: { list: [word], total: 1, totalPages: 1 } });
  });
  it('renders saved notes and keeps the exact source through preview and save', () => {
    cy.viewport(1280, 850);
    cy.visit('/englishWorld/knowledge-notes/7');
    cy.get('.knowledge-body h2').should('have.text', '用法说明');
    cy.get('.knowledge-body strong').should('contain', '核心区别');
    cy.get('.knowledge-body table').should('be.visible');
    cy.get('.knowledge-body script,.knowledge-body img').should('not.exist');
    cy.get('.knowledge-body pre').should('contain', '**这是代码，不应加粗**');
    cy.window().its('noteExecuted').should('not.exist');
    cy.screenshot('notes-reader-desktop', { capture: 'viewport' });
    cy.contains('a', /^编辑$/).click();
    cy.get('button[aria-label="预览正文"]').click();
    cy.get('[aria-label="正文预览"] h2').should('have.text', '用法说明');
    cy.get('button[aria-label="编辑正文"]').click();
    cy.get('#knowledge-body').should('have.value', body);
    cy.intercept('PUT', '**/api/knowledge-notes/7', req => { expect(req.body.body).to.eq(body); expect(req.body.examples).to.eq(note.examples); req.reply({ code: 200, data: { ...note, version: 2 } }); }).as('save');
    cy.contains('button', /^保存$/).click();
    cy.wait('@save');
    cy.get('.knowledge-body h2').should('have.text', '用法说明');
  });
  it('shows clean summaries and a locally scrolling table in mobile and dark mode', () => {
    cy.viewport(390, 844);
    cy.visit('/mobile/tools/knowledge-notes');
    cy.get('.knowledge-summary').should('contain', '用法说明').and('not.contain', '##').and('not.contain', '**核心区别**');
    cy.contains('a', '笔记排版示例').click();
    cy.get('.note-table-scroll').should('have.css', 'overflow-x', 'auto');
    cy.get('body').then($body => expect($body[0].scrollWidth).to.be.at.most(390));
    cy.document().then(doc => doc.documentElement.setAttribute('data-theme', 'dark'));
    cy.get('.knowledge-body strong').should('be.visible');
    cy.screenshot('notes-reader-mobile-dark', { capture: 'viewport' });
    cy.visit('/mobile/words/1');
    cy.get('[aria-label="释义与笔记"] .note-content h2').should('contain', '用法说明');
  });
  it('renders notes in the review book on screen and in print media', () => {
    cy.viewport(1280, 850);
    cy.intercept('GET', '**/api/word-books/demo', { code: 200, data: { id: 'demo', title: '排版复习册', mode: 'organized', scope: 'all', wordCount: 1, words: [{ ...word, keyPoints: ['**重点**：保留原文', '普通要点'] }], groups: [{ id: 'g1', title: '常见用法', wordIds: [1], notes: [{ text: '> 不改变原意', sourceWordIds: [1] }] }], progress: { groupId: 'g1' } } });
    cy.visit('/englishWorld/word-books/demo');
    cy.get('.book-screen .book-key-points strong').should('have.text', '重点');
    cy.get('.book-screen .book-group-notes blockquote').should('contain', '不改变原意');
    cy.get('.book-screen .book-source summary').click();
    cy.get('.book-screen .book-source h2').should('have.text', '用法说明');
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Emulation.setEmulatedMedia', params: { media: 'print' } }));
    cy.get('.book-print-only').should('be.visible');
    cy.get('.book-print-only .book-key-points strong').should('have.text', '重点');
    cy.get('.book-print-only .book-group-notes blockquote').should('contain', '不改变原意');
    cy.screenshot('notes-book-print', { capture: 'viewport' });
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Emulation.setEmulatedMedia', params: { media: '' } }));
  });
});
