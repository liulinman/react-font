describe('iOS entry UI (browser boundary test, not a native transport test)', () => {
  it('opens mobile login, navigates the account, and signs out at iPhone width', () => {
    const user = { id: 900001, username: 'ios-fixture' };
    let authenticated = false;
    cy.viewport(390, 844);
    cy.intercept({ pathname: '/api/**' }, request => {
      const path = new URL(request.url).pathname;
      if (path.endsWith('/user/login')) {
        authenticated = true;
        request.reply({ code: 200, data: { user } });
      } else if (path.endsWith('/user/logout')) {
        authenticated = false;
        request.reply({ code: 200, data: null });
      } else if (path.endsWith('/user/getCurrentUser')) {
        request.reply(authenticated ? { code: 200, data: user } : { code: 4001, data: null });
      } else if (path.endsWith('/recite/stats')) {
        request.reply({code: 200, data: {statistics: {totalCount: 0, correctCount: 0, errorCount: 0, accuracy: 0}, directionStats: {}}});
      } else if (path.endsWith('/notifications/unread-count')) {
        request.reply({ code: 200, data: { count: 0 } });
      } else {
        request.reply({ code: 200, data: { list: [], total: 0, nextCursor: null } });
      }
    });
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.assign(win, { CapacitorCustomPlatform: { name: 'ios' } });
      },
    });
    cy.get('#mobile-login-username').should('be.visible').type(user.username);
    cy.get('#mobile-login-password').type('fixture-only', { log: false });
    cy.get('.mobile-login__submit').click();
    cy.location('pathname').should('eq', '/mobile');
    cy.get('[role="tab"]').should('have.length', 4);
    cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
    cy.contains('[role="tab"]', '我的').click();
    cy.contains(user.username).should('be.visible');
    cy.contains('应用信息').click();
    cy.contains('通过 Xcode 安装新版本').should('be.visible');
    cy.contains('当前已是最新版本').should('not.exist');
    cy.contains('[role="tab"]', '我的').click();
    cy.contains('button', '退出登录').click();
    cy.get('#mobile-login-username').should('be.visible');
    cy.screenshot('ios-mobile-login');
  });
});
