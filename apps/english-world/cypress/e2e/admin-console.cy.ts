describe('Admin console workflows', () => {
  let published: unknown[];
  let schedulesCreated: unknown[];
  let destructive: string[];
  beforeEach(() => {
    published = []; schedulesCreated = []; destructive = [];
    const notifications = Array.from({ length: 45 }, (_, i) => ({
      id: i + 1, title: i === 0 ? '近期事件口语微练习' : `IELTS Speaking Practice · ${i + 1}`,
      body: '请用一分钟描述最近经历的一件小事。\n交代发生的时间、地点和你的感受。Use past simple and linking words like first, then, finally.',
      category: i % 2 ? 'ielts_daily' : 'recent_event', priority: 'normal', sourceType: 'manual',
      status: i === 2 ? 'withdrawn' : 'published', publishedAt: '2026-10-12T08:30:00Z',
    }));
    cy.intercept({ pathname: '/api/admin/**' }, req => {
      const url = new URL(req.url), path = url.pathname;
      let data: unknown = {};
      if (path.endsWith('/me')) data = { username: 'admin' };
      else if (path.endsWith('/users')) data = { list: [{ id: 7, username: 'alice', status: 'active', createTime: '2026-09-01T08:00:00Z' }], total: 1 };
      else if (path.endsWith('/notification-schedules')) {
        if (req.method === 'POST') { req.alias = 'createSchedule'; schedulesCreated.push(req.body); data = { id: 21, ...req.body }; }
        else data = { list: [{ id: 20, name: '每日雅思表达', category: 'ielts_daily', cadence: 'daily', hour: 8, minute: 0, timezoneOffsetMinutes: 480, aiMode: 'auto_publish', enabled: true, nextRunAt: '2026-10-13T00:00:00Z' }], total: 1 };
      } else if (path.endsWith('/notifications')) {
        if (req.method === 'POST') { req.alias = 'publish'; published.push(req.body); data = { id: 46, ...req.body }; }
        else { const page = Number(url.searchParams.get('page') || 1), size = Number(url.searchParams.get('pageSize') || 20); data = { list: notifications.slice((page - 1) * size, page * size), total: 45, page, pageSize: size }; }
      } else if (path.endsWith('/preview-ai')) data = { title: 'AI 生成标题', body: 'AI 生成正文', priority: 'normal', sourceType: 'ai' };
      else if (req.method === 'DELETE' || path.endsWith('/withdraw') || path.endsWith('/run-now')) { req.alias = 'mutation'; destructive.push(path); }
      req.reply({ code: 200, data });
    });
    cy.viewport(1200, 680);
    cy.visit('/admin/');
    cy.contains('button', '用户管理').should('be.visible');
  });
  const navigate = (name: string) => cy.contains('.admin-nav button', name).click();
  const select = (id: string, text: string) => {
    cy.get(`#${id}`).closest(".ant-select").find(".ant-select-selector").click();
    cy.get('.ant-select-dropdown:visible').contains('.ant-select-item-option-content', text).click();
  };
  it('opens full content, confirms destructive actions and fetches history pages', () => {
    cy.screenshot('admin-users', { capture: 'viewport' });
    navigate('历史记录');
    cy.contains('.admin-title-link', '近期事件口语微练习').click();
    cy.get('.ant-drawer-body').should('contain', '交代发生的时间');
    cy.get('.ant-drawer-close').click();
    cy.get('[aria-label="撤回公告"]').first().click();
    cy.get('.ant-modal').should('contain', '近期事件口语微练习');
    cy.then(() => expect(destructive).to.have.length(0));
    cy.contains('.ant-modal button', /取\s*消/).click();
    cy.then(() => expect(destructive).to.have.length(0));
    cy.get('[aria-label="撤回公告"]').first().click();
    cy.contains('.ant-modal button', '确认撤回').click(); cy.wait('@mutation');
    cy.then(() => expect(destructive).to.deep.equal(['/api/admin/notifications/1/withdraw']));
    cy.get('.admin-panel:visible .ant-pagination-next').click();
    cy.contains('.admin-title-link', 'IELTS Speaking Practice · 21').should('be.visible');
    cy.get('.admin-panel:visible .ant-pagination-prev').click();
    cy.contains('.admin-title-link', '近期事件口语微练习').should('exist');
    cy.scrollTo('top');
    cy.get('.ant-message-notice').should('not.exist');
    cy.screenshot('admin-history', { capture: 'viewport' });
  });
  it('validates recipients, previews a snapshot and sends only on confirmation', () => {
    navigate('公告发布');
    cy.get('#title').type('新的练习通知'); cy.get('#body').type('今天练习过去时。');
    select('targetType', '指定用户');
    cy.contains('button', '预览并发送').click();
    cy.contains('请至少选择一位接收用户').should('be.visible');
    cy.get('#targetUserIds').click();
    cy.get('.ant-select-dropdown:visible').contains('alice (#7)').click();
    cy.get('#title').click();
    select('targetType', '全部用户'); select('targetType', '指定用户');
    cy.get('#targetUserIds').closest('.ant-select').should('contain', 'alice (#7)');
    cy.contains('button', '预览并发送').click();
    cy.get('.ant-modal').should('contain', '指定 1 位用户');
    cy.then(() => expect(published).to.have.length(0));
    cy.contains('.ant-modal button', '返回编辑').click();
    cy.get('#body').should('have.value', '今天练习过去时。');
    cy.get('.ant-modal-wrap').should('not.be.visible');
    cy.get('#title').click(); cy.scrollTo('top');
    cy.screenshot('admin-compose', { capture: 'viewport' });
    cy.contains('button', '预览并发送').click();
    cy.contains('.ant-modal button', '确认发送').click(); cy.wait('@publish');
    cy.then(() => expect(published).to.deep.equal([{ title: '新的练习通知', body: '今天练习过去时。', category: 'announcement', priority: 'normal', sourceType: 'manual', targetType: 'selected', targetUserIds: [7] }]));
    cy.contains('h1', '历史记录').should('be.visible');
  });
  it('sends a chosen weekday and omits hidden recurrence values for one-time tasks', () => {
    navigate('定时任务');
    cy.contains('button', '新建任务').click();
    cy.get('#name').type('每周表达练习');
    select('cadence', '每周'); select('weekday', '星期五');
    cy.get('.ant-select-dropdown:visible').should('not.exist');
    cy.get('.ant-drawer-body').scrollTo('top');
    cy.screenshot('admin-schedule', { capture: 'viewport' });
    cy.contains('button', '保存定时任务').click();
    cy.wait('@createSchedule');
    cy.then(() => expect(schedulesCreated[0]).to.include({ cadence: 'weekly', weekday: 5, hour: 8, minute: 0, timezoneOffsetMinutes: 480 }));
    cy.contains('button', '新建任务').click(); cy.get('#name').type('一次练习');
    select('cadence', '一次');
    cy.contains('button', '保存定时任务').click();
    cy.contains('请选择执行时间').should('be.visible');
    cy.then(() => expect(schedulesCreated).to.have.length(1));
    cy.get('#runAt').type('2099-10-15 09:00{enter}');
    cy.contains('button', '保存定时任务').click();
    cy.wait('@createSchedule');
    cy.then(() => {
      expect(schedulesCreated).to.have.length(2);
      expect(schedulesCreated[1]).to.include({ cadence: 'once' }).and.not.have.property('weekday');
      expect(schedulesCreated[1]).not.to.have.property('hour');
    });
  });
  it('preserves publication content after failure and blocks duplicate submissions', () => {
    let attempts = 0;
    cy.intercept('POST', '/api/admin/notifications', req => {
      attempts += 1;
      req.reply({ statusCode: 500, delay: 600, body: { code: 500, message: '暂时无法发布' } });
    }).as('failedPublish');
    navigate('公告发布'); cy.get('#title').type('失败后重试'); cy.get('#body').type('请保留这段内容。');
    cy.contains('button', '预览并发送').click();
    cy.contains('.ant-modal button', '确认发送').dblclick();
    cy.get('.ant-modal .ant-btn-loading').should('exist');
    cy.wait('@failedPublish');
    cy.contains('.ant-modal', '发布失败，内容已保留，请重试。').should('be.visible');
    cy.then(() => expect(attempts).to.equal(1));
    cy.get('.ant-modal').should('contain', '请保留这段内容。');
    cy.intercept('POST', '/api/admin/notifications', { code: 200, data: { id: 46 } }).as('retryPublish');
    cy.contains('.ant-modal button', '确认发送').click(); cy.wait('@retryPublish');
    cy.contains('h1', '历史记录').should('be.visible');
  });
  it('keeps navigation and forms within a narrow viewport', () => {
    cy.viewport(390, 680); navigate('公告发布');
    cy.get('#title').should('be.visible');
    cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
    cy.screenshot('admin-mobile-compose', { capture: 'viewport' });
    navigate('历史记录');
    cy.get('.admin-panel:visible .ant-table-content').should('have.css', 'overflow-x', 'auto');
    cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
  });
});
