import { loginTestAccount } from './login-test-account';

// Real isolated HTTP/MySQL + local vendor double. These original fixtures test
// UI/persistence contracts, never supplier voice quality or a real exam score.
const originalPaper = () => {
  const evidence = {
    map: 'The library is northwest of the entrance, and the cafe is northeast of it.',
    single: 'The tour starts on Monday, not Tuesday.',
    multiple: 'Bring a pencil and a notebook, but leave the camera at home.',
    matching: 'Alice chose art and Ben chose biology.',
    reusable: 'Both Cara and Dan chose art.',
    word: 'The final stop is the observatory.',
  };
  const options = [{ id: 'A', text: 'Art' }, { id: 'B', text: 'Biology' }, { id: 'C', text: 'Chemistry' }];
  const question = (id: number, prompt: string, answers: string[], evidence: string) => ({ id, prompt, answers, evidence });
  return {
    title: 'Original UI acceptance tour',
    sections: [{ part: 1, title: 'Original campus tour', transcript: Object.values(evidence).join(' '), groups: [
      { kind: 'map', title: 'Campus text map', instruction: 'ONE WORD ONLY', maxWords: 1, allowNumber: false,
        map: { nodes: [{ id: '1', x: 20, y: 20 }, { id: '2', x: 80, y: 20 }], landmarks: [{ label: 'Entrance', x: 50, y: 85 }, { label: 'North', x: 50, y: 5 }], paths: [{ from: { x: 50, y: 85 }, to: { x: 50, y: 20 } }] },
        questions: [question(1, 'Building at position 1', ['library'], evidence.map), question(2, 'Building at position 2', ['cafe'], evidence.map)] },
      { kind: 'single', title: 'Tour day', instruction: 'Choose ONE letter.', options: [{ id: 'A', text: 'Monday' }, { id: 'B', text: 'Tuesday' }], questions: [question(3, 'On which day does the tour start?', ['A'], evidence.single)] },
      { kind: 'multiple', title: 'What to bring', instruction: 'Choose TWO letters.', options: [{ id: 'A', text: 'Pencil' }, { id: 'B', text: 'Notebook' }, { id: 'C', text: 'Camera' }], questions: [question(4, 'Which TWO things should visitors bring?', ['A', 'B'], evidence.multiple), question(5, 'Which TWO things should visitors bring?', ['A', 'B'], evidence.multiple)] },
      { kind: 'matching', title: 'Different courses', instruction: 'Choose a letter for each person. Use each letter only once.', reusable: false, options, questions: [question(6, 'Alice', ['A'], evidence.matching), question(7, 'Ben', ['B'], evidence.matching)] },
      { kind: 'matching', title: 'Shared courses', instruction: 'Choose a letter for each person. Letters may be used more than once.', reusable: true, options, questions: [question(8, 'Cara', ['A'], evidence.reusable), question(9, 'Dan', ['A'], evidence.reusable)] },
      { kind: 'completion', format: 'note', title: 'Final stop', instruction: 'ONE WORD ONLY', maxWords: 1, allowNumber: false, questions: [question(10, 'Final destination', ['observatory'], evidence.word)] },
    ] }],
  };
};

const answer = (id: number) => cy.get(`#ielts-answer-${id}`);
const listWords = () => cy.request('POST', '/api/english/filterWordList', { page: 1, pageSize: 200 });
const completeWordFields = () => {
  cy.get('.ant-modal #englishLevel').closest('.ant-select').find('.ant-select-selector').click();
  cy.get('.ant-select-dropdown:visible').contains('.ant-select-item-option', '不会').click();
  cy.get('.ant-modal #englishType').closest('.ant-select').find('.ant-select-selector').click();
  cy.get('.ant-select-dropdown:visible').contains('.ant-select-item-option', '单词').click();
  cy.get('.ant-modal #englishChinese').clear().type('天文台');
};

describe('IELTS listening acceptance boundaries', {scrollBehavior: 'center'}, () => {
  let materialId: string;
  let studentAccount: {username: string; password: string};
  beforeEach(() => {
    // The PRD runner owns the isolated seed. Never run this against production.
    cy.task('resetDatabase').then(value => {
      const account = (value as { account: { username: string; password: string } }).account;
      studentAccount = account;
      cy.request('POST', '/api/admin/login', { username: 'automation_admin', password: 'AutomationAdmin123!' });
      ['deepseek', 'doubao'].forEach(provider => cy.request('PUT', `/api/admin/ai-services/${provider}`, { enabled: true, apiKey: 'fixture-only-ai-key' }));
      cy.request('POST', '/api/admin/ielts-listening/materials', { ...originalPaper(), requestId: crypto.randomUUID() })
        .then(({ body }) => {
          expect(body.code).to.eq(200);
          materialId = body.data.id;
          return cy.request('POST', `/api/admin/ielts-listening/materials/${materialId}/prepare`, {});
        }).then(({ body }) => {
          expect(body.data.status).to.eq('ready');
          return cy.request('POST', `/api/admin/ielts-listening/materials/${materialId}/publish`, { published: true });
        }).then(() => loginTestAccount(account));
    });
    cy.viewport(1440, 900);
  });
  const openPaper = () => {
    cy.visit('/englishWorld/ielts-listening');
    cy.contains('.ielts-records li', 'Original UI acceptance tour').contains('button', '开始作答').click();
    cy.contains('button', '开始听力').should('be.enabled').click();
  };

  it('AC13 collects a selected result word with source and cancels duplicates without writes', () => {
    let attemptId: string, savedWord: Record<string, unknown>, originalTotal: number;
    listWords().then(({ body }) => { originalTotal = body.data.total; expect(body.data.list.some((w: { englishWord: string }) => w.englishWord === 'observatory')).to.eq(false); });
    openPaper(); cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click();
    cy.contains('h2', '本次结果 0 / 10').should('be.visible');
    cy.location('search').then(search => { attemptId = new URLSearchParams(search).get('attempt')!; });
    cy.contains('a', '在词库查找并收集 observatory').click(); cy.location('pathname').should('eq', '/englishWorld/words');
    listWords().then(({ body }) => expect(body.data.total).to.eq(originalTotal));
    cy.contains('button', '添加单词').first().click(); cy.get('.ant-modal #englishWord').should('have.value', 'observatory');
    cy.then(() => cy.get('.ant-modal #englishReference').should('have.value', `/englishWorld/ielts-listening?attempt=${attemptId}`));
    // Cancel the untouched prefill: no add/update request and no new word.
    cy.contains('.ant-modal-footer button', /取\s*消/).click();
    listWords().then(({ body }) => expect(body.data.total).to.eq(originalTotal));
    cy.contains('button', '添加单词').first().click(); completeWordFields(); cy.contains('.ant-modal-footer button', '保存词条').click();
    cy.contains('添加成功').should('be.visible');
    listWords().then(({ body }) => { expect(body.data.total).to.eq(originalTotal + 1); savedWord = body.data.list.find((w: { englishWord: string }) => w.englishWord === 'observatory'); expect(savedWord.englishReference).to.eq(`/englishWorld/ielts-listening?attempt=${attemptId}`); });
    cy.contains('button', '添加单词').first().click(); completeWordFields(); cy.contains('.ant-modal-footer button', '保存词条').click();
    cy.contains('单词已经存在！').should('be.visible'); cy.get('.ant-modal-confirm .ant-btn-primary').click();
    cy.contains('.ant-modal-footer button', /取\s*消/).click();
    // Dirty-form cancellation is a separate explicit discard confirmation.
    cy.contains('放弃尚未保存的修改？').should('be.visible'); cy.get('.ant-modal-confirm').contains('button', '放弃修改').click();
    cy.get('.ant-modal-wrap:visible').should('not.exist');
    listWords().then(({ body }) => { expect(body.data.total).to.eq(originalTotal + 1); expect(body.data.list.find((w: { englishWord: string }) => w.englishWord === 'observatory')).to.deep.eq(savedWord); });
  });

  it('AC03 and AC04 preserve text-map positions and support clearing, selection counts and keyboard matching', () => {
    openPaper();
    answer(1).type('library'); answer(2).type('cafe');
    cy.get('svg[aria-label="Campus text map 地图"] circle').first().then(marker => {
      const x = marker.attr('cx'), y = marker.attr('cy');
      cy.contains('button', '放大地图').click();
      cy.viewport(1280, 800);
      cy.get('svg[aria-label="Campus text map 地图"] circle').first().should('have.attr', 'cx', x).and('have.attr', 'cy', y);
      answer(1).should('have.value', 'library').clear().type('sports hall').should('have.value', 'sports hall').clear().type('library');
      cy.contains('button', '复位').click(); cy.viewport(1440, 900);
      cy.get('svg[aria-label="Campus text map 地图"] circle').first().should('have.attr', 'cx', x).and('have.attr', 'cy', y);
    });
    answer(3).select('A').select('B').should('have.value', 'B').select('').should('have.value', '');
    // Real browser key events exercise the native select fallback, not synthetic change handlers.
    answer(3).focus(); cy.press('a'); cy.press(Cypress.Keyboard.Keys.TAB); answer(3).should('have.value', 'A');
    cy.contains('section', 'What to bring').within(() => {
      cy.contains('需选 2 个不同选项；仅有 2 个答题位，不能超选。').should('be.visible');
      cy.get('select').should('have.length', 2);
      answer(4).select('A'); answer(5).select('A'); cy.get('[role="status"]').should('contain', '存在重复选项'); answer(5).select('B');
    });
    answer(6).select('A'); answer(7).select('A');
    cy.contains('本组各选项不可重复使用，请检查重复答案。').should('be.visible');
    answer(7).focus(); cy.press('b'); cy.press(Cypress.Keyboard.Keys.TAB); answer(7).should('have.value', 'B');
    answer(8).select('A'); answer(9).focus(); cy.press('a'); cy.press(Cypress.Keyboard.Keys.TAB); answer(9).should('have.value', 'A');
    cy.contains('section', 'Shared courses').should('contain', '选项可重复使用');
    answer(10).type('observatory');
    cy.contains('button', '检查并交卷').click(); cy.contains('还有 0 题未答').should('be.visible'); cy.contains('button', '确认交卷').click();
    cy.contains('h2', '本次结果 10 / 10').should('be.visible');
  });

  it('AC09 freezes a failed submission and retries the same persisted snapshot', () => {
    openPaper(); answer(1).type('library'); answer(10).type('observatory');
    let rejected = false;
    cy.intercept('POST', '**/ielts-listening/attempts/*', request => {
      if (request.body.event === 'submit' && !rejected) {
        rejected = true; request.reply({ statusCode: 503, body: { code: 503, message: 'Acceptance temporary submit failure' } });
      } else request.continue();
    });
    cy.contains('button', '检查并交卷').click(); cy.contains('还有 8 题未答').should('be.visible'); cy.contains('button', '返回检查').click();
    answer(1).should('be.enabled'); cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click();
    cy.contains('[role="alert"]', 'Acceptance temporary submit failure').should('be.visible'); answer(1).should('be.disabled').and('have.value', 'library'); answer(10).should('be.disabled');
    cy.reload(); answer(1).should('have.value', 'library').and('be.disabled'); answer(10).should('have.value', 'observatory');
    cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click(); cy.contains('h2', '本次结果 2 / 10').should('be.visible');
    cy.location('search').then(search => {
      const id = new URLSearchParams(search).get('attempt');
      cy.request(`/api/ielts-listening/attempts/${id}`).then(({ body }) => {
        expect(body.data.answers).to.include({ '1': 'library', '10': 'observatory' });
        expect(body.data.result.items.find((q: { id: number }) => q.id === 10).answer).to.eq('observatory');
        cy.request('POST', `/api/ielts-listening/attempts/${id}`, { revision: body.data.revision, event: 'submit', answers: { '1': 'changed' }, flags: [] }).its('body.data.result').should('deep.equal', body.data.result);
      });
    });
  });

  it('AC10 saves self-selected review causes with Chinese explanations without changing the first score', () => {
    let id: string, firstResult: unknown, failReflection = true;
    openPaper(); cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click();
    cy.contains('h2', '本次结果 0 / 10').should('be.visible');
    cy.get('.ielts-result-list li').each(row => cy.wrap(row).should('contain', '中文解释：').and('not.contain', '中文解释：暂不可用'));
    cy.location('search').then(search => { id = new URLSearchParams(search).get('attempt')!; cy.request(`/api/ielts-listening/attempts/${id}`).then(({body}) => {firstResult = body.data.result;}); });
    cy.intercept('POST', '**/ielts-listening/attempts/*', request => {
      if (request.body.event === 'reflect' && failReflection) {failReflection = false; request.reply({statusCode: 503, body: {code: 503, message: 'Acceptance reflection save failure'}});}
      else request.continue();
    });
    cy.get('[aria-label="第1题 自选错因"]').select('词不认识');
    cy.contains('第1题错因尚未保存，请重新选择重试').should('be.visible');
    cy.get('[aria-label="第1题 自选错因"]').should('have.value', '').select('词不认识');
    cy.contains('第1题错因已保存').should('be.visible');
    cy.reload(); cy.get('[aria-label="第1题 自选错因"]').should('have.value', '词不认识').select('');
    cy.contains('第1题错因已保存').should('be.visible');
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${id}`)).then(({body}) => {expect(body.data.result).to.deep.eq(firstResult);expect(body.data.reflections?.['1'] || '').to.eq('');});
  });

  it('AC11 and AC12 create, prepare and publish a revision while the old paper result stays frozen', () => {
    let oldAttemptId: string, oldResult: unknown, revisionId: string;
    openPaper(); answer(10).type('observatory'); cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click();
    cy.contains('h2', '本次结果 1 / 10').should('be.visible');
    cy.location('search').then(search => {oldAttemptId = new URLSearchParams(search).get('attempt')!; cy.request(`/api/ielts-listening/attempts/${oldAttemptId}`).then(({body}) => {oldResult = body.data.result;});});
    cy.visit('/admin/?section=ielts-listening');
    cy.contains('tr', 'Original UI acceptance tour').contains('button', '创建修订').click();
    cy.contains('保存将创建新版本草稿，不覆盖原材料或历史作答。').should('be.visible');
    cy.get('#ielts-import-json').should('contain.value', 'Original UI acceptance tour');
    cy.contains('button', '取消修订').click(); cy.get('#ielts-import-json').should('have.value', '');
    cy.contains('tr', 'Original UI acceptance tour').contains('button', '创建修订').click();
    cy.get('#ielts-import-json').should('not.have.value', '').invoke('val').then(raw => {
      const revision = JSON.parse(String(raw)); revision.title = 'Revised UI acceptance tour';
      const q = revision.sections[0].groups[5].questions[0];
      q.prompt = 'Northwest building'; q.answers = ['library']; q.evidence = 'The library is northwest of the entrance, and the cafe is northeast of it.';
      cy.get('#ielts-import-json').clear().type(JSON.stringify(revision), {parseSpecialCharSequences: false});
    });
    cy.intercept('POST', '**/admin/ielts-listening/materials/*/revisions').as('newRevision');
    cy.contains('button', '校验并创建新版本').click();
    cy.wait('@newRevision').then(({response}) => {expect(response?.statusCode).to.be.oneOf([200, 201]); revisionId = response?.body.data.id; expect(revisionId).not.to.eq(materialId);});
    cy.contains('tr', 'Revised UI acceptance tour').contains('button', '准备并配音').click();
    cy.contains('tr', 'Revised UI acceptance tour', {timeout: 30000}).contains('button', /发\s*布/).click();
    cy.contains('tr', 'Revised UI acceptance tour').should('contain', '已发布');
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${oldAttemptId}`)).then(({body}) => {expect(body.data.material.id).to.eq(materialId); expect(body.data.material.title).to.eq('Original UI acceptance tour'); expect(body.data.result).to.deep.eq(oldResult); expect(body.data.result.items.find((q: {id: number}) => q.id === 10).accepted).to.deep.eq(['observatory']);});
    cy.then(() => cy.request('POST', '/api/ielts-listening/attempts', {requestId: crypto.randomUUID(), materialId: revisionId, mode: 'training'})).then(({body}) => {expect(body.data.material.id).to.eq(revisionId); expect(body.data.material.title).to.eq('Revised UI acceptance tour');});
    cy.contains('tr', 'Revised UI acceptance tour').contains('button', /停\s*用/).click();
    cy.contains('tr', 'Revised UI acceptance tour').should('contain', '待发布');
  });


  it('AC02 keeps note table and sentence answers with raw numbers units and flags on the same audio across refresh', () => {
    const lines = ['The building is 12 years old.', 'The meeting is on Monday.', 'The reference is AB7.', 'The fee is 20 pounds.', 'The room is blue.', 'The desk is round.', 'The group visits the research centre.', 'The tour ends on Friday.', 'Bring a notebook.', 'The guide is Alice.'];
    const values = ['12 years', 'Monday', 'AB7', '20 pounds', 'blue', 'round', 'research centre', 'Friday', 'notebook', 'Alice'];
    const prompts = ['Building age', 'Meeting day', 'Booking reference', 'Fee', 'Room colour', 'Desk shape', 'Visit destination', 'Tour ending day', 'Required item', 'Guide name'];
    const contexts = ['The building is', 'Meeting day:', 'Booking reference:', 'Fee:', 'Room colour:', 'Desk shape:', 'The group visits the', 'The tour ends on', 'Bring a', 'The guide is'];
    const formats = [{kind: 'completion', format: 'note', title: 'Visit notes', ids: [1,2,3]}, {kind: 'completion', format: 'table', title: 'Booking table', ids: [4,5,6]}, {kind: 'sentence', title: 'Visit sentences', ids: [7,8,9,10]}];
    const sections = [{part: 1, title: 'Original note table sentence tour', transcript: lines.join(' '), groups: formats.map(({ids, ...format}) => ({...format, instruction: 'NO MORE THAN TWO WORDS AND/OR A NUMBER', maxWords: 2, allowNumber: true, questions: ids.map(id => ({id, prompt: prompts[id - 1], before: contexts[id - 1], after: id === 1 ? 'old.' : '.', answers: [values[id - 1]], evidence: lines[id - 1]}))}))}];
    let id: string;
    cy.request('POST', '/api/admin/ielts-listening/materials', {requestId: crypto.randomUUID(), title: 'Original structured context', sections}).then(({body}) => {id = body.data.id; return cy.request('POST', `/api/admin/ielts-listening/materials/${id}/prepare`, {});}).then(() => cy.request('POST', `/api/admin/ielts-listening/materials/${id}/publish`, {published: true}));
    cy.visit('/englishWorld/ielts-listening'); cy.contains('.ielts-records li', 'Original structured context').contains('button', '开始作答').click(); cy.contains('button', '开始听力').should('be.enabled').click();
    cy.contains('音频正在播放').should('be.visible');
    cy.get('audio').then(elements => {
      const media = elements[0] as HTMLAudioElement; const src = media.currentSrc;
      answer(1).type('  12 YEARS  '); cy.get('.ielts-nav-actions button[aria-pressed]').click();
      cy.get('.ielts-number-list button[aria-label^="第4题 "]').click(); answer(4).type('20 pounds');
      cy.get('.ielts-number-list button[aria-label^="第7题 "]').click(); answer(7).type('research centre');
      cy.get('.ielts-format-note').should('contain', 'The building is').and('contain', 'old.');
      cy.get('.ielts-format-table').should('contain', 'Booking table'); cy.get('.ielts-format-sentence').should('contain', 'Visit sentences');
      cy.get('.ielts-number-list button[aria-label="第1题 已标记 已答"]').click(); answer(1).should('have.value', '  12 YEARS  ');
      cy.then(() => expect(media.currentSrc, 'question navigation keeps the same recording').to.eq(src));
    });
    cy.contains('已保存', {timeout: 15000}).should('exist'); cy.reload();
    answer(1).should('have.value', '  12 YEARS  '); answer(4).should('have.value', '20 pounds'); answer(7).should('have.value', 'research centre');
    cy.get('.ielts-number-list button[aria-label="第1题 已标记 已答"]').should('exist');
    cy.location('search').then(search => cy.request(`/api/ielts-listening/attempts/${new URLSearchParams(search).get('attempt')}`)).then(({body}) => {expect(body.data.answers).to.include({'1':'  12 YEARS  ', '4':'20 pounds', '7':'research centre'}); expect(body.data.flags).to.include(1);});
    cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click(); cy.contains('h2', '本次结果 3 / 10').should('be.visible');
  });

  it('AC01 filters actual materials by type source part topic readiness and the current student completion', () => {
    openPaper(); cy.contains('button', '检查并交卷').click(); cy.contains('button', '确认交卷').click(); cy.contains('h2', '本次结果 0 / 10').should('be.visible'); cy.contains('button', '返回材料与记录').click();
    cy.request('POST', '/api/ielts-listening/materials', {requestId: crypto.randomUUID(), topic: 'Harbour survey', parts: 'single', part: 2, kind: 'sentence'});
    cy.request('/api/ielts-listening/materials').then(({body}) => {expect(body.data.find((material: {id: string}) => material.id === materialId).completed).to.eq(true);const draft = body.data.find((material: {title: string}) => material.title === 'Harbour survey');expect(draft).to.include({topic: 'Harbour survey', completed: false, status: 'draft'});});
    cy.reload();
    const records = () => cy.contains('section', '我的材料与公共题库').find('.ielts-records');
    cy.contains('label', '筛选题型').find('select').select('map'); records().should('contain', 'Original UI acceptance tour').and('not.contain', 'Harbour survey');
    cy.contains('label', '筛选题型').find('select').select('');
    cy.contains('summary', /^更多筛选/).click();
    cy.contains('label', '来源').find('select').select('AI原创模拟'); records().should('contain', 'Harbour survey').and('not.contain', 'Original UI acceptance tour');
    cy.contains('label', '来源').find('select').select('');
    cy.contains('label', '筛选部分').find('select').select('2'); records().should('contain', 'Harbour survey').and('not.contain', 'Original UI acceptance tour');
    cy.contains('label', '筛选部分').find('select').select('');
    cy.contains('label', '搜索材料或主题').find('input').type('survey'); records().should('contain', 'Harbour survey').and('not.contain', 'Original UI acceptance tour');
    cy.contains('label', '搜索材料或主题').find('input').clear();
    cy.contains('label', '材料状态').find('select').select('ready'); records().should('contain', 'Original UI acceptance tour').and('not.contain', 'Harbour survey');
    cy.contains('label', '材料状态').find('select').select('incomplete'); records().should('contain', 'Harbour survey').and('not.contain', 'Original UI acceptance tour'); records().contains('button', '开始作答').should('not.exist');
    cy.contains('label', '材料状态').find('select').select('');
    cy.contains('label', '完成状态').find('select').select('completed'); records().should('contain', 'Original UI acceptance tour').and('not.contain', 'Harbour survey');
    cy.contains('label', '完成状态').find('select').select('uncompleted'); records().should('contain', 'Harbour survey').and('not.contain', 'Original UI acceptance tour');
  });


  it('AC01 AC11 AC12 reject invalid imports drafts student admin writes and other-user private resources through real HTTP', () => {
    const badAnswers = originalPaper(); badAnswers.sections[0].groups[0].questions[0].answers = [];
    const badMap = originalPaper(); badMap.sections[0].groups[0].map!.nodes[0].id = 'wrong';
    [badAnswers, badMap].forEach(payload => cy.request({method: 'POST', url: '/api/admin/ielts-listening/materials', body: {...payload, requestId: crypto.randomUUID()}, failOnStatusCode: false}).then(({status, body}) => {expect(status).to.eq(400);expect(body.message, 'human-readable validation reason').to.match(/材料|答案|图示|题号/);}));
    let draftId: string, ownId: string, attemptId: string;
    cy.request('POST', '/api/admin/ielts-listening/materials', {...originalPaper(), title: 'Unprepared admin draft', requestId: crypto.randomUUID()}).then(({body}) => {
      draftId = body.data.id;
      cy.request({method: 'POST', url: `/api/admin/ielts-listening/materials/${draftId}/publish`, body: {published: true}, failOnStatusCode: false}).then(({status, body}) => {expect(status).to.eq(409);expect(body.message).to.match(/准备|就绪|发布/);});
      cy.request({method: 'POST', url: '/api/ielts-listening/attempts', body: {requestId: crypto.randomUUID(), materialId: draftId, mode: 'training'}, failOnStatusCode: false}).its('status').should('eq', 404);
      cy.request('/api/ielts-listening/materials').then(({body}) => expect(body.data.some((m: {id: string}) => m.id === draftId)).to.eq(false));
    });
    cy.request('POST', '/api/ielts-listening/materials', {requestId: crypto.randomUUID(), topic: 'Private owner draft', parts: 'single', part: 1, kind: 'completion'}).then(({body}) => {
      ownId = body.data.id;
      cy.request({method: 'POST', url: '/api/ielts-listening/attempts', body: {requestId: crypto.randomUUID(), materialId: ownId, mode: 'training'}, failOnStatusCode: false}).then(({status, body}) => {expect(status).to.eq(409);expect(body.message).to.match(/就绪/);});
    });
    cy.then(() => cy.request('POST', '/api/ielts-listening/attempts', {requestId: crypto.randomUUID(), materialId, mode: 'training'})).then(({body}) => {attemptId = body.data.id;});
    cy.clearCookie('admin_token');
    cy.then(() => {
      const base = `/api/admin/ielts-listening/materials/${materialId}`;
      ['/api/admin/ielts-listening/materials', `${base}/prepare`, `${base}/publish`, `${base}/revisions`].forEach(url => cy.request({method: 'POST', url, body: {...originalPaper(), requestId: crypto.randomUUID(), published: true}, failOnStatusCode: false}).its('status').should('eq', 401));
      cy.request({url: `${base}/edit`, failOnStatusCode: false}).its('status').should('eq', 401);
    });
    cy.then(() => loginTestAccount({username: 'automation_other', password: studentAccount.password}));
    cy.then(() => {
      [`/api/ielts-listening/materials/${ownId}`, `/api/ielts-listening/attempts/${attemptId}`, `/api/ielts-listening/attempts/${attemptId}/audio/0`].forEach(url => cy.request({url, failOnStatusCode: false}).its('status').should('eq', 404));
      cy.request({method: 'POST', url: `/api/ielts-listening/materials/${ownId}/prepare`, body: {}, failOnStatusCode: false}).its('status').should('eq', 404);
      cy.request({method: 'POST', url: `/api/ielts-listening/attempts/${attemptId}`, body: {revision: 0, event: 'submit', answers: {}}, failOnStatusCode: false}).its('status').should('eq', 404);
    });
  });

  it('AC08 grades raw casing blanks word limits necessary units suffixes and explicit variants through persisted submit', () => {
    const keys = [['Monday'], ['12 years'], ['cat'], ['blue bird'], ['centre', 'center'], ['Monday'], ['Monday'], ['Monday'], ['Monday'], ['Monday']];
    const questions = keys.map((answers, i) => ({id: i + 1, prompt: ['Day', 'Building age including unit', 'Animal singular', 'Bird description', 'Building spelling'][i] || `Appointment day ${i + 1}`, answers, evidence: `Confirmed ${answers.join(' or ')}.`}));
    const section = {part: 1, title: 'Original grading facts', transcript: questions.map(q => q.evidence).join(' '), groups: [{kind: 'completion', format: 'note', title: 'Recorded facts', instruction: 'NO MORE THAN TWO WORDS AND/OR A NUMBER', maxWords: 2, allowNumber: true, questions}]};
    let id: string;
    cy.request('POST', '/api/admin/ielts-listening/materials', {requestId: crypto.randomUUID(), title: 'Original grading boundaries', sections: [section]}).then(({body}) => {id = body.data.id;return cy.request('POST', `/api/admin/ielts-listening/materials/${id}/prepare`, {});}).then(() => cy.request('POST', `/api/admin/ielts-listening/materials/${id}/publish`, {published: true})).then(() => cy.request('POST', '/api/ielts-listening/attempts', {requestId: crypto.randomUUID(), materialId: id, mode: 'training'})).then(({body}) => cy.request('POST', `/api/ielts-listening/attempts/${body.data.id}`, {revision: body.data.revision, event: 'start'})).then(({body}) => cy.request('POST', `/api/ielts-listening/attempts/${body.data.id}`, {revision: body.data.revision, event: 'submit', answers: {'1':'  mOnDaY  ', '2':'12', '3':'cats', '4':'a blue bird', '5':'CENTER'}, flags: []})).then(({body}) => {
      const first = body.data.result;
      expect(first.score).to.eq(2);expect(first.total).to.eq(10);
      expect(first.items[0]).to.include({answer: '  mOnDaY  ', correct: true});
      expect(first.items[1]).to.include({answer: '12', correct: false});expect(first.items[1].accepted).to.deep.eq(['12 years']);
      expect(first.items[2]).to.include({answer: 'cats', correct: false});
      expect(first.items[3]).to.include({correct: false, reason: '超出词数或数字限制'});
      expect(first.items[4].correct).to.eq(true);expect(first.items[5]).to.include({answer: '', correct: false, reason: '未作答'});
      cy.request(`/api/ielts-listening/attempts/${body.data.id}`).its('body.data.result').should('deep.equal', first);
    });
  });

  it('AC09 freezes the last unsaved deadline input across a real submit outage and marks an unverifiable late snapshot abnormal', {defaultCommandTimeout: 15000, requestTimeout: 120000, responseTimeout: 120000}, () => {
    cy.visit('/englishWorld/ielts-listening'); cy.get('.ielts-setup-fields select').eq(1).select('simulation');
    cy.contains('.ielts-records li', 'Original UI acceptance tour').contains('button', '开始作答').click();cy.contains('button', '开始听力').should('be.enabled').click();
    answer(1).type('library');cy.contains('已保存', {timeout: 15000}).should('exist');
    cy.contains('.ielts-session-status', '检查时间', {timeout: 30000}).should('exist');
    let rejectSubmit = true;
    cy.intercept('POST', '**/ielts-listening/attempts/*', request => {
      if (request.body.event === 'save') request.reply({statusCode: 503, body: {code: 503, message: 'Acceptance final save unavailable'}});
      else if (request.body.event === 'submit' && rejectSubmit) {rejectSubmit = false;request.reply({statusCode: 503, body: {code: 503, message: 'Acceptance deadline submit unavailable'}});}
      else request.continue();
    });
    // Real server deadline: do not replace either browser or server clock.
    cy.contains('.ielts-session-status', '检查时间 0:03', {timeout: 135000}).should('exist');
    answer(10).type('observatory');
    cy.contains('Acceptance final save unavailable').should('exist');
    cy.contains('Acceptance deadline submit unavailable', {timeout: 15000}).should('exist');
    answer(10).should('be.disabled').and('have.value', 'observatory');answer(1).should('be.disabled');
    cy.location('search').then(search => {
      const id = new URLSearchParams(search).get('attempt')!;
      cy.window().then(win => {const frozen = JSON.parse(win.sessionStorage.getItem(`freewing:ielts:${id}`)!);expect(frozen.frozen).to.eq(true);expect(frozen.answers).to.include({'1':'library','10':'observatory'});});
      cy.request(`/api/ielts-listening/attempts/${id}`).then(({body}) => {expect(body.data.answers['1']).to.eq('library');expect(body.data.answers['10']).not.to.eq('observatory');});
      cy.wait(4000); // Beyond the server's three-second verification window.
      cy.reload();cy.contains('h2', '本次结果 2 / 10', {timeout: 30000}).should('be.visible');
      cy.contains('已中断模拟，不计严格一次听成绩').should('be.visible');
      cy.request(`/api/ielts-listening/attempts/${id}`).then(({body}) => {expect(body.data.answers).to.include({'1':'library','10':'observatory'});expect(body.data.interrupted).to.eq(true);expect(body.data.result.items[9].answer).to.eq('observatory');});
    });
    cy.contains('button', /^回听$/).click();
    cy.contains('当前提供整段回听；尚无经核实的逐题时间定位。').scrollIntoView().should('be.visible');
  });


  it('AC09 serializes two truly concurrent first submits and preserves their shared result against stale revision retries', () => {
    let id: string, revision: number, first: unknown;
    cy.visit('/englishWorld/ielts-listening');
    cy.then(() => cy.request('POST', '/api/ielts-listening/attempts', {requestId: crypto.randomUUID(), materialId, mode: 'training'})).then(({body}) => cy.request('POST', `/api/ielts-listening/attempts/${body.data.id}`, {revision: body.data.revision, event: 'start'})).then(({body}) => {id = body.data.id;revision = body.data.revision;});
    cy.window().then(win => Promise.all(['library', 'changed'].map(value => win.fetch(`/api/ielts-listening/attempts/${id}`, {
      method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision, event: 'submit', answers: {'1': value}, flags: [2]}),
    }).then(async response => ({status: response.status, body: await response.json()}))))).then(responses => {
      responses.forEach(response => {expect(response.status).to.be.oneOf([200,201]);expect(response.body.code).to.eq(200);});
      expect(responses[0].body.data.result).to.deep.eq(responses[1].body.data.result);
      expect(responses[0].body.data.revision).to.eq(responses[1].body.data.revision);
      first = responses[0].body.data.result;
    });
    cy.then(() => cy.request(`/api/ielts-listening/attempts/${id}`)).then(({body}) => expect(body.data.result).to.deep.eq(first));
    cy.then(() => cy.request('POST', `/api/ielts-listening/attempts/${id}`, {revision, event: 'submit', answers: {'1':'stale overwrite'}, flags: []})).then(({body}) => expect(body.data.result).to.deep.eq(first));
    cy.request('/api/ielts-listening/attempts').then(({body}) => expect(body.data).to.have.length(1));
  });

});
