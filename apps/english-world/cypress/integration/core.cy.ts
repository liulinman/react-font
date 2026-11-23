type Fixtures = { account: { username: string; password: string }; wordId: number };

describe('Real NestJS + MySQL journeys', () => {
  let fixture: Fixtures;
  beforeEach(() => {
    cy.task('resetDatabase', null, { timeout: 60000 }).then((value) => { fixture = value as Fixtures; });
  });
  const challenges = new Map<string, string>();
  const observeCaptcha = () => cy.intercept('POST', '**/user/captcha', req => {
    req.continue(res => { challenges.set(res.body.data.imageDataUrl, res.body.data.captchaId); });
  });
  const solveLoginCaptcha = () => {
    cy.get('img[alt="图形验证码"]').should('be.visible').invoke('attr', 'src').then(src => {
      cy.request({ method: 'POST', url: 'http://127.0.0.1:13317/__automation/account/captcha', body: { captchaId: challenges.get(src!) }, log: false });
      cy.get('[data-cy="login-captcha"]').type('ABCDE', { log: false });
    });
  };
  const login = () => {
    observeCaptcha();
    cy.visit('/englishWorld/settings');
    cy.get('[data-cy="login-username"]').type(fixture.account.username);
    cy.get('[data-cy="login-password"]').type(fixture.account.password, { log: false });
    solveLoginCaptcha();
    cy.get('[data-cy="login-submit"]').click();
    cy.location('pathname').should('eq', '/englishWorld/settings');
  };

  it('AUTH-001: logs in through the UI and retains the real cookie after refresh', () => {
    login();
    cy.reload();
    cy.contains('h2', '账号安全').should('be.visible');
    cy.request('POST', '/api/user/getCurrentUser', {}).its('body.data.username').should('eq', fixture.account.username);
  });

  it('AUTH-002: incorrect password stays on the login page', () => {
    observeCaptcha();
    cy.visit('/login');
    cy.get('[data-cy="login-username"]').type(fixture.account.username);
    cy.get('[data-cy="login-password"]').type('wrong-password', { log: false });
    solveLoginCaptcha();
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

  it('REVIEW-001: completes a real review and recovers the persisted result through the API', () => {
    login();
    cy.request('POST', '/api/recite/start', { wordIds: [fixture.wordId], direction: 0 }).its('body.data.questions').should('have.length', 1);
    cy.request('POST', '/api/recite/submit', { answers: [{ wordId: fixture.wordId, userAnswer: 'resilient' }], direction: 0 }).then(({ body }) => {
      expect(body.data.statistics.correctCount).to.eq(1);
      cy.request('POST', '/api/recite/session-result', { sessionId: body.data.sessionId }).its('body.data.statistics.correctCount').should('eq', 1);
    });
    cy.reload();
    cy.request('POST', '/api/recite/history', { page: 1, pageSize: 10 }).then(({ body }) => {
      expect(body.data.total).to.eq(1);
      expect(body.data.list[0].words).to.have.length(1);
    });
  });
});
