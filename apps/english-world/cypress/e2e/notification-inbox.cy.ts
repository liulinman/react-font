describe('Notification inbox readability', () => {
  const body = '本期没有指定话题。请用 1 分钟描述你最近经历的一件小事：发生了什么、和谁、结果怎样。试着用 recently、take place、in the end 等表达，注意过去时与连接词。\n说完自查：时间、地点、感受是否交代清楚？';
  beforeEach(() => {
    const today = new Date().toISOString();
    cy.intercept({ pathname: '/api/**' }, req => {
      const path = new URL(req.url).pathname;
      let data: unknown = {};
      if (path.endsWith('/user/getCurrentUser')) data = { id: 901, username: 'Learner' };
      else if (path.endsWith('/notifications')) data = { list: [
        { id: 1, title: '近期事件口语微练习', body, category: 'recent_event', priority: 'normal', publishedAt: today, readAt: null },
        { id: 2, title: 'Recent Event: IELTS Speaking Practice', body: 'Practise a recent-event answer: describe what happened, when and where, who was involved, and how you felt. Use past simple and linking words like first, then, finally. Add one speculation phrase. Avoid stating unverified facts.', category: 'recent_event', priority: 'normal', publishedAt: '2026-09-10T08:30:00Z', readAt: null },
        { id: 3, title: 'Turn a Recent Event Into IELTS Practice', body: 'Pick any recent event you are following and practise: summarise it in two sentences, then give your opinion.', category: 'ielts_daily', priority: 'normal', publishedAt: '2026-09-09T08:30:00Z', readAt: today },
      ], nextCursor: null };
      else if (path.endsWith('/notifications/unread-count')) data = { count: 2 };
      else if (path.endsWith('/read')) data = { unreadCount: 1 };
      else if (path.endsWith('/knowledge-notes')) data = { list: [], total: 0, page: 1, pageSize: 20 };
      req.reply({ code: 200, data });
    });
  });
  for (const width of [1200, 390]) {
    it(`shows compact summaries and readable expanded content at ${width}px`, () => {
      cy.viewport(width, 680);
      cy.visit('/englishWorld/knowledge-notes');
      cy.get('.english-world-notification-button').click();
      cy.get('.english-world-notification-drawer .ant-drawer-body').should('be.visible');
      cy.get('.english-world-notification-item-body').first().should($body => {
        expect($body[0].scrollHeight).to.be.greaterThan($body[0].clientHeight);
      });
      cy.get('.english-world-notification-drawer.ant-drawer-content').should($drawer => {
        expect($drawer[0].scrollWidth).to.be.at.most($drawer[0].clientWidth);
        expect($drawer[0].getBoundingClientRect().width).to.be.at.most(width);
      });
      cy.get('.english-world-notification-drawer.ant-drawer-content').screenshot(`notification-inbox-${width}`);
      cy.contains('.english-world-notification-item-button', '近期事件口语微练习').click().should('have.attr', 'aria-expanded', 'true');
      cy.get('.english-world-notification-item-body').first().should($body => {
        expect($body[0].scrollHeight).to.be.at.most($body[0].clientHeight + 1);
      });
      cy.contains('.english-world-notification-item-button', '收起').click().should('have.attr', 'aria-expanded', 'false');
    });
  }
});
