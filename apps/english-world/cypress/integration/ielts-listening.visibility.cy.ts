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

describe('IELTS matching visibility regression', {scrollBehavior: 'center'}, () => {
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


});
