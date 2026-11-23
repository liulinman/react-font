// All authentication requests reach the real isolated NestJS/MySQL application.
// Only graphical answer selection and the external mail boundary use test-harness seams.
describe('Account access real service', () => {
 const password = 'Acceptance123🙂';
 const post = (path: string, body: object, failOnStatusCode = true) => cy.request({ method: 'POST', url: `/api/user/${path}`, body, failOnStatusCode, log: false });
 const solve = (captchaId: string) => cy.request({ method: 'POST', url: 'http://127.0.0.1:13317/__automation/account/captcha', body: { captchaId }, log: false });
 const captcha = () => post('captcha', {}).then(({ body }) => {
  expect(body.data.imageDataUrl).to.match(/^data:image\/png;base64,/);
  expect(body.data).not.to.have.property('code');
  return solve(body.data.captchaId).then(() => ({ captchaId: body.data.captchaId, captchaCode: 'ABCDE' }));
 });
 const mail = (email: string, purpose: 'register' | 'reset') => captcha().then(c => post('email-code', { email, purpose, ...c })).then(({ body }) =>
  cy.request({ method: 'POST', url: 'http://127.0.0.1:13317/__automation/account/mail', body: { email }, log: false }).then(r => ({ challengeId: body.data.challengeId, emailCode: r.body.code })));
 beforeEach(() => { cy.task('resetDatabase', null, { timeout: 60000 }); cy.clearCookies(); });
 it('UI: registers through the desktop form and logs in using a real cookie', () => {
  cy.viewport(1440, 900);
  const images = new Map<string, string>();
  cy.intercept('POST', '**/user/captcha', req => req.continue(res => { images.set(res.body.data.imageDataUrl, res.body.data.captchaId); }));
  const solveVisible = () => cy.get('img[alt="图形验证码"]').should('be.visible').invoke('attr', 'src').then(src => solve(images.get(src!)!));
  cy.intercept('POST', '**/user/getCurrentUser').as('anonymousLogin');
  cy.visit('/englishWorld/settings');
  cy.wait('@anonymousLogin').then(({ response }) => { expect(response!.statusCode).to.eq(401); expect(response!.body.code).to.eq(4001); });
  cy.get('img[alt="图形验证码"]').should('be.visible');
  cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1));
  cy.get('.review-bar').should('not.exist');
  cy.get('.ant-message-notice').should('not.exist');
  cy.screenshot('account-login-1440x900', { capture: 'viewport', scale: true });
  cy.contains('button', '注册账号').click();
  cy.screenshot('account-register-1440x900', { capture: 'viewport', scale: true });
  cy.get('[data-cy="register-username"]').type('ui_learner');
  cy.get('[data-cy="register-email"]').type('ui@example.test');
  cy.get('[data-cy="register-password"]').type(password, { log: false });
  cy.get('[data-cy="register-confirm-password"]').type(password, { log: false });
  solveVisible();
  cy.get('[data-cy="login-captcha"]').type('ABCDE', { log: false });
  cy.get('[data-cy="register-submit"]').click();
  cy.contains('h1', '验证你的邮箱').should('be.visible');
  cy.request({ method: 'POST', url: 'http://127.0.0.1:13317/__automation/account/mail', body: { email: 'ui@example.test' }, log: false }).then(({ body }) => {
   cy.get('[data-cy="email-code"]').type(body.code, { log: false });
  });
  cy.get('[data-cy="register-submit"]').click();
  cy.contains('button', '返回登录').click();
  cy.get('[data-cy="login-username"]').should('have.value', 'ui_learner');
  cy.get('[data-cy="login-password"]').should('have.value', '').type(password, { log: false });
  solveVisible();
  cy.get('[data-cy="login-captcha"]').type('ABCDE', { log: false });
  cy.get('[data-cy="login-submit"]').click();
  cy.location('pathname').should('eq', '/englishWorld/settings');
  cy.reload();
  post('getCurrentUser', {}).its('body.data.email').should('eq', 'ui@example.test');
  cy.visit('/englishWorld/settings');
  cy.contains('h2', '账号安全').should('be.visible');
  cy.screenshot('account-security-1440x900', { capture: 'viewport', scale: true });
  cy.contains('button', '修改密码').click();
  cy.get('label').contains('当前密码').should('be.visible');
  cy.screenshot('account-change-password-1440x900', { capture: 'viewport', scale: true });
 });
 it('VISUAL: shows the real forgot-password form at desktop size', () => {
  cy.viewport(1440, 900);
  cy.intercept('POST', '**/user/getCurrentUser').as('anonymous');
  cy.visit('/login');
  cy.wait('@anonymous').then(({ response }) => { expect(response!.statusCode).to.eq(401); expect(response!.body.code).to.eq(4001); });
  cy.get('body').should('not.contain.text', '未登录');
  cy.contains('button', '忘记密码？').click();
  cy.contains('h1', '找回密码').should('be.visible');
  cy.get('img[alt="图形验证码"]').should('be.visible');
  cy.get('body').should('not.contain.text', '未登录');
  cy.screenshot('account-forgot-1440x900', { capture: 'viewport', scale: true });
 });
 it('MOBILE: requires the shared real graphical challenge before opening the mobile account', () => {
  const images = new Map<string, string>();
  cy.viewport(390, 844);
  cy.intercept('POST', '**/user/captcha', req => req.continue(res => { images.set(res.body.data.imageDataUrl, res.body.data.captchaId); }));
  cy.visit('/mobile');
  cy.get('[data-cy="login-username"]').type('automation_learner');
  cy.get('[data-cy="login-password"]').type('Automation123!', { log: false });
  cy.get('img[alt="图形验证码"]').should('be.visible').invoke('attr', 'src').then(src => solve(images.get(src!)!));
  cy.get('[data-cy="login-captcha"]').type('ABCDE', { log: false });
  cy.get('[data-cy="login-submit"]').click();
  cy.location('pathname').should('eq', '/mobile');
  post('getCurrentUser', {}).its('body.data.username').should('eq', 'automation_learner');
 });
 it('CAPTCHA: rejects missing, refreshed and reused graphical challenges', () => {
  const credentials = { username: 'automation_learner', password: 'Automation123!' };
  post('login', credentials, false).its('status').should('eq', 400);
  captcha().then(c => {
   post('captcha', { previousCaptchaId: c.captchaId });
   post('login', { ...credentials, ...c }, false).its('status').should('eq', 400);
  });
  captcha().then(c => {
   post('login', { ...credentials, ...c }).then(({ body }) => { expect(body.data).not.to.have.property('token'); expect(body.data.user).not.to.have.property('password'); });
   post('login', { ...credentials, ...c }, false).its('status').should('eq', 400);
  });
 });
 it('REGISTER: verifies captured mail once and persists normalized account without auto login', () => {
  const email = 'browser@example.test';
  mail(email, 'register').then(proof => {
   expect(proof.emailCode).to.match(/^\d{6}$/);
   const payload = { username: 'browser_user', email: ' BROWSER@example.test ', password, ...proof };
   post('register', payload).its('body.code').should('eq', 200);
   post('register', payload, false).its('status').should('eq', 400);
   post('getCurrentUser', {}, false).its('status').should('eq', 401);
   captcha().then(c => post('login', { username: 'browser_user', password, ...c }));
   post('getCurrentUser', {}).its('body.data.email').should('eq', email);
  });
 });
 it('RESET: consumes mailbox proof, revokes the old learning cookie and preserves vocabulary', () => {
  captcha().then(c => post('login', { username: 'automation_learner', password: 'Automation123!', ...c }));
  mail('learner@example.test', 'reset').then(proof => {
   const payload = { email: 'learner@example.test', password, ...proof };
   post('reset-password', payload);
   post('getCurrentUser', {}, false).its('status').should('eq', 401);
   post('reset-password', payload, false).its('status').should('eq', 400);
   captcha().then(c => post('login', { username: 'automation_learner', password: 'Automation123!', ...c }, false)).its('status').should('eq', 401);
   captcha().then(c => post('login', { username: 'automation_learner', password, ...c }));
   cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 10 }).its('body.data.total').should('eq', 1);
  });
 });
 it('CHANGE: validates current identity and password before requiring a new login', () => {
  post('change-password', { currentPassword: 'Automation123!', password }, false).its('status').should('eq', 401);
  captcha().then(c => post('login', { username: 'automation_learner', password: 'Automation123!', ...c }));
  post('change-password', { currentPassword: 'wrong-password', password }, false).its('status').should('eq', 401);
  post('change-password', { currentPassword: 'Automation123!', password, userId: 999 }, false).its('status').should('eq', 400);
  post('change-password', { currentPassword: 'Automation123!', password });
  post('getCurrentUser', {}, false).its('status').should('eq', 401);
  captcha().then(c => post('login', { username: 'automation_learner', password, ...c }));
  post('getCurrentUser', {}).its('body.data.username').should('eq', 'automation_learner');
 });
});
