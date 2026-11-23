import { loginTestAccount } from "./login-test-account";
// PRD: docs/prd/notes/features/knowledge-notes/prd.md
// Real NestJS + disposable MySQL; no knowledge-note API response stubs.
describe('PRD knowledge notes', () => {
  beforeEach(() => {
    cy.task('resetDatabase', null, { timeout: 60000 }).then((value) => {
      const fixture = value as { account: { username: string; password: string } };
      loginTestAccount(fixture.account);
    });
  });
  it('NOTES-AC03 creates a standalone note without selecting a word and persists after refresh', () => {
    cy.visit('/englishWorld/knowledge-notes/new');
    cy.get('#knowledge-title').type('PRD 独立知识笔记验收');
    cy.get('#knowledge-body').type('Without selecting a word.\n独立知识不依赖词条。');
    cy.contains('button', '保存').click();
    cy.contains('h1', 'PRD 独立知识笔记验收').should('be.visible');
    cy.reload();
    cy.contains('h1', 'PRD 独立知识笔记验收').should('be.visible');
    cy.get('.knowledge-body').should('contain.text', '独立知识不依赖词条。');
    cy.request('/api/knowledge-notes?q=PRD').then(({ body }) => {
      expect(body.data.total).to.eq(1);
      const note = body.data.list[0];
      cy.request(`/api/knowledge-notes/${note.id}`).then(({ body: detail }) => {
        expect(detail.data.words).to.have.length(0);
        expect(detail.data.body).to.eq('Without selecting a word.\n独立知识不依赖词条。');
      });
    });
  });
});
