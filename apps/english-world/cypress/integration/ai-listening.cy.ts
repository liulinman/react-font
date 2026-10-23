// Real Nest HTTP/MySQL. Vendor boundary uses local deterministic fixtures.
// The silent MP3 verifies transport; these tests do not certify speech quality.
describe('AI listening persisted journeys', () => {
  let f: { wordId: number; account: { username: string; password: string } };
  let session: any;
  const post = (path: string, body: any = {}) => cy.request('POST', `/api${path}`, body);
  const admin = () => post('/admin/login', { username: 'automation_admin', password: 'AutomationAdmin123!' });
  const student = (username?: string) => post('/user/login', { ...f.account, ...(username ? { username } : {}) });
  const configure = () => {
    admin();
    ['deepseek', 'doubao'].forEach(provider => cy.request('PUT', `/api/admin/ai-services/${provider}`, {enabled:true,apiKey:'fixture-only-ai-key'}));
  };
  const create = (id = 'create-session-001') => post('/ai-learning/sessions', {wordIds:[f.wordId],requestUid:id}).then(({body}) => { session=body.data; return session; });
  const ready = () => cy.then(() => post(`/ai-learning/sessions/${session.id}/ready`, {requestUid:'ready-session-001'})).then(({body}) => {session=body.data;return session;});
  const event = (type: string) => post(`/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/event`, {type,requestUid:`event-${type}-001`});
  const submit = (answer: string, id = 'submit-session-001') => post(`/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/submit`, {answer,requestUid:id});
  beforeEach(() => {cy.task('resetDatabase',null,{timeout:60000}).then(value => { f=value as typeof f; });});

  it('management preserves blank keys, clears secrets, rejects untrusted origins and unauthorized roles', () => {
    cy.request({url:'/api/admin/ai-services',failOnStatusCode:false}).its('status').should('eq',401);
    student();
    ['GET','PUT','POST'].forEach(method => cy.request({method,url:`/api/admin/ai-services${method==='PUT'?'/deepseek':method==='POST'?'/deepseek/test':''}`,body:method==='PUT'?{apiKey:'attack'}:undefined,failOnStatusCode:false}).its('status').should('eq',401));
    configure();
    cy.request('/api/admin/ai-services').then(({body})=>{
      expect(body.data.deepseek.configured).eq(true);
      expect(JSON.stringify(body)).not.contain('fixture-only-ai-key');
    });
    cy.request('PUT','/api/admin/ai-services/deepseek',{apiKey:'',enabled:true}).its('body.data.configured').should('eq',true);
    cy.request({method:'PUT',url:'/api/admin/ai-services/deepseek',headers:{'x-real-ip':'203.0.113.10'},body:{apiKey:'not-sent-to-provider'},failOnStatusCode:false}).its('status').should('eq',403);
    cy.request('DELETE','/api/admin/ai-services/deepseek/key').its('body.data.configured').should('eq',false);
    cy.request('POST','/api/admin/ai-services/deepseek/test',{}).its('body.data.ok').should('eq',false);
  });

  it('reviews then hides answers, rejects unheard submission, persists normalized first score and ownership', () => {
    configure();student();create().then(s=>{expect(s.status).eq('review');expect(s.words[0].word).eq('resilient');});
    create().then(s=>expect(s.id).eq(session.id));
    ready().then(s=>{expect(s.status).eq('listening');expect(s.words).deep.eq([]);expect(s.questions[0].gap).contain('______');expect(JSON.stringify(s)).not.contain('resilient');});
    cy.then(()=>cy.request({method:'POST',url:`/api/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/submit`,body:{answer:'resilient',requestUid:'early-submit-001'},failOnStatusCode:false})).its('status').should('eq',400);
    cy.then(()=>event('played'));cy.then(()=>submit(' RESILIENT ')).then(({body})=>{expect(body.data.questions[0].feedback).include({correct:true,independent:true});});
    cy.then(()=>submit('wrong','submit-session-002')).then(({body})=>expect(body.data.questions[0].feedback.userAnswer).eq('RESILIENT'));
    cy.then(()=>cy.request(`/api/ai-learning/sessions/${session.id}`)).its('body.data.status').should('eq','completed');
    cy.request('/api/ai-learning/history').its('body.data.sessions').should('have.length',1);
    student('automation_other');
    cy.then(()=>cy.request({url:`/api/ai-learning/sessions/${session.id}`,failOnStatusCode:false})).its('status').should('eq',404);
    cy.then(()=>cy.request({url:`/api/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/audio`,failOnStatusCode:false})).its('status').should('eq',404);
  });

  it('reveal stays assisted; wrong spelling stays wrong; skip creates no incorrect result',()=>{
    configure();student();create();ready();cy.then(()=>event('revealed'));cy.then(()=>event('played'));
    cy.then(()=>submit('resilient')).then(({body})=>expect(body.data.questions[0].feedback).include({correct:true,independent:false}));
    create('create-session-002');ready();cy.then(()=>event('played'));cy.then(()=>submit('resilients')).then(({body})=>expect(body.data.questions[0].feedback.correct).eq(false));
    create('create-session-003');ready();
    cy.then(()=>post(`/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/skip`,{requestUid:'skip-session-001'})).then(({body})=>{expect(body.data.questions[0].status).eq('skipped');expect(body.data.questions[0]).not.have.property('feedback');});
    cy.request('/api/ai-learning/history').its('body.data.sessions').should('have.length',3);
  });

  it('real audio endpoint caches and stays playable when provider is disabled',()=>{
    configure();student();create();ready();
    cy.then(()=>cy.request({url:`/api/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/audio`,encoding:'binary'})).then(r=>{expect(r.headers['content-type']).contain('audio/mpeg');expect(r.body.length).greaterThan(100);});
    cy.then(()=>cy.request(`/api/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/audio`));
    admin();cy.request('/api/admin/ai-services').then(({body})=>{const u=body.data.usage.filter((u:any)=>u.provider==='doubao');expect(u.reduce((sum:number,x:any)=>sum+Number(x.requests),0)).eq(1);expect(u.reduce((sum:number,x:any)=>sum+Number(x.cacheHits),0)).eq(1);});
    cy.request('PUT','/api/admin/ai-services/doubao',{enabled:false});
    cy.then(()=>cy.request(`/api/ai-learning/sessions/${session.id}/questions/${session.questions[0].id}/audio`)).its('status').should('eq',200);
    cy.request({method:'POST',url:'/api/speech/word',body:{text:'a different uncached phrase'},failOnStatusCode:false}).its('status').should('eq',503);
  });

  [false,true].forEach(mobile=>it(`${mobile?'mobile':'desktop'} completes the visible review, playback, gap and persisted feedback flow`,()=>{
    configure(); student(); cy.viewport(mobile?390:1280,mobile?844:900);
    cy.visit(`${mobile?'/mobile':'/englishWorld'}/ai-listening?wordIds=${f.wordId}`);
    cy.contains('button','开始复习').click();
    cy.contains('h2','看词复习').should('be.visible');
    cy.get('.ai-listening-words').should('contain.text','resilient');
    cy.contains('button','看完了，生成场景').click();
    cy.contains('h2','听场景填空').should('be.visible');
    cy.get('.ai-listening-question').should('not.contain.text','resilient').and('contain.text','______');
    cy.get('input[aria-label="场景 1 答案"]').type(' RESILIENT ');
    cy.contains('button',/^提交$/).should('be.disabled');
    cy.get('.ai-scene-context').should('not.exist');
    cy.contains('button','查看中文提示').click();
    cy.get('.ai-scene-context').should('be.visible');
    cy.contains('button','隐藏中文提示').click();
    cy.get('.ai-scene-context').should('not.exist');
    cy.get('button[aria-label="播放完整句子"]').should('have.text','').click();
    cy.contains('button',/^提交$/).should('not.be.disabled').click();
    cy.contains('h2','本轮已完成').scrollIntoView().should('be.visible');
    cy.get('.ai-listening-feedback').should('contain.text','回答正确').and('contain.text','resilient');
    cy.get('.ai-scene-context').should('be.visible');
    cy.contains('summary','近义词辨析').click();
    cy.get('.ai-listening-feedback').should('contain.text','strong');
    cy.reload();
    cy.get('.ai-listening-feedback').should('contain.text','回答正确');
    cy.get('body').should($body=>expect($body[0].scrollWidth).at.most(mobile?390:1280));
    cy.screenshot(`ai-listening-${mobile?'mobile':'desktop'}-feedback`,{capture:'viewport'});
  }));
  it('administrator reads masked configurations, tests both voices and sees persisted usage in the UI',()=>{
    configure();cy.viewport(1280,900);cy.visit('/admin/?section=ai-services');
    cy.contains('h1','AI 服务管理').should('be.visible');
    cy.get('input[aria-label="deepseek API Key"]').should('have.value','');
    cy.get('input[aria-label="doubao API Key"]').should('have.value','');
    cy.contains('section','豆包语音').within(()=>{
      cy.contains('button','测试连接').click();
      cy.contains('可用').should('be.visible');
    });
    cy.get('audio').should('have.length',2);
    cy.reload();cy.get('input[aria-label="doubao API Key"]').should('have.value','');
    cy.get('body').should('not.contain.text','fixture-only-ai-key');
    cy.screenshot('ai-services-management-masked',{capture:'fullPage'});
  });
  it('administrator saves visible limits including unlimited daily characters and refreshes persisted configuration',()=>{
    configure();cy.viewport(1280,1000);cy.visit('/admin/?section=ai-services');
    cy.get('input[aria-label="DeepSeek 每用户每服务每日字符"]').clear().type('0');
    cy.get('input[aria-label="DeepSeek 每用户每服务每日请求"]').clear().type('500');
    cy.intercept('PUT','**/admin/ai-services/limits/deepseek').as('saveLimits');
    cy.contains('button','保存DeepSeek限制').click();cy.wait('@saveLimits').its('response.statusCode').should('eq',200);
    cy.contains('DeepSeek使用限制已保存').should('be.visible');
    cy.reload();cy.get('input[aria-label="DeepSeek 每用户每服务每日字符"]').should('have.value','0');
    cy.get('input[aria-label="DeepSeek 每用户每服务每日请求"]').should('have.value','500');
    cy.contains('已保存的配置').should('be.visible');
    cy.get('input[aria-label="豆包语音 每用户每服务每日字符"]').should('have.value','30000');
    cy.request('/api/admin/ai-services').its('body.data.providerLimits').should(value=>{expect(value.deepseek.charactersPerDay).eq(0);expect(value.doubao.charactersPerDay).eq(30000);});
    cy.screenshot('ai-services-editable-limits',{capture:'fullPage'});
  });

});
