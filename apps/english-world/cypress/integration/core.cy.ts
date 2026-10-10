type Fixtures = { account: { username: string; password: string }; wordId: number };

describe('Real NestJS + MySQL journeys', () => {
  let fixture: Fixtures;
  beforeEach(() => {
    cy.task('resetDatabase', null, { timeout: 60000 }).then((value) => { fixture = value as Fixtures; });
  });
  const login = () => {
    cy.visit('/login');
    cy.get('[data-cy="login-username"]').type(fixture.account.username);
    cy.get('[data-cy="login-password"]').type(fixture.account.password, { log: false });
    cy.get('[data-cy="login-submit"]').click();
    cy.location('pathname').should('eq', '/englishWorld/recite');
  };

  it('AUTH-001: logs in through the UI and retains the real cookie after refresh', () => {
    login();
    cy.reload();
    cy.contains('button', '开始今日复习').should('be.visible');
    cy.request('POST', '/api/user/getCurrentUser', {}).its('body.data.username').should('eq', fixture.account.username);
  });

  it('AUTH-002: incorrect password stays on the login page', () => {
    cy.visit('/login');
    cy.get('[data-cy="login-username"]').type(fixture.account.username);
    cy.get('[data-cy="login-password"]').type('wrong-password', { log: false });
    cy.get('[data-cy="login-submit"]').click();
    cy.contains('用户名或密码错误').should('be.visible');
    cy.location('pathname').should('eq', '/login');
  });

  it('WORD-001: confirms existing-word conflicts and persists imported vocabulary', () => {
    login();
    // Observe actual HTTP traffic; do not stub the application's APIs.
    cy.intercept('POST', '**/bulkImportWords/preview').as('preview');
    cy.intercept('POST', '**/importMissingWords').as('import');
    cy.visit('/englishWorld/bulk-import');
    cy.get('textarea[placeholder="支持换行、逗号、序号、英文 + 中文释义混合粘贴"]')
      .type('resilient\nmitigate');
    cy.contains('button', '解析预览').click();
    cy.wait('@preview').its('response.body.data.aiEnhanced').should('eq', true);
    cy.contains('button', '确认导入').click();
    cy.contains('发现已有或重复词条，是否继续？').should('be.visible');
    cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 10 }).its('body.data.total').should('eq', 1);
    cy.contains('button', '继续导入').click();
    cy.wait('@import').its('response.body.data.inserted').should('eq', 1);
    cy.contains('已导入 1 个词条').should('be.visible');
    cy.reload();
    cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 10 }).then(({ body }) => {
      expect(body.data.total).to.eq(2);
      expect(body.data.list.map((word: { englishWord: string }) => word.englishWord)).to.have.members(['resilient', 'mitigate']);
    });
  });

  it('REVIEW-001: completes a review and recovers the persisted result after refresh', () => {
    login();
    let submissions = 0;
    cy.intercept('POST', '**/recite/submit', (req) => {
      submissions += 1;
      req.continue();
    }).as('submit');
    cy.visit(`/englishWorld/recite?wordIds=${fixture.wordId}`);
    cy.contains('button', '开始今日复习').click();
    cy.contains('有韧性的').should('be.visible');
    cy.get('input[aria-label="你的答案"]').type('resilient');
    // Two synchronous browser clicks exercise the in-flight guard before rerender.
    cy.contains('button', '完成复习').then(($button) => {
      $button[0].click();
      $button[0].click();
    });
    cy.wait('@submit').then(({ response }) => {
      expect(response?.body.data.statistics.correctCount).to.eq(1);
    });
    cy.location('search').should('contain', 'sessionId=');
    cy.reload();
    cy.contains('.ant-statistic', '正确率').scrollIntoView().should('contain.text', '100.00').and('contain.text', '%');
    cy.request('POST', '/api/recite/history', { page: 1, pageSize: 10 }).then(({ body }) => {
      expect(body.data.list).to.have.length(1);
      expect(body.data.list[0].correctCount).to.eq(1);
      expect(body.data.list[0].words).to.have.length(1);
      expect(submissions).to.eq(1);
    });
  });
});
