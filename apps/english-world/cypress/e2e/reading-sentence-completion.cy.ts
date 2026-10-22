// Browser interaction with API fixtures, not real AI or service acceptance.
describe('Sentence completion input', () => {
  for (const width of [1440, 390]) it(`fills, restores and submits sentence blanks at ${width}px`, () => {
    const paper = { id: 81, title: 'The origins of birds', paragraphs: ['Huxley studied theropods.'], status: 'published', submitted: false, started: true, ieltsBand: null,
      questions: [{ id: 'q1', kind: 'sentence_completion', stem: 'Huxley studied a group called .......... .', options: [], instructions: 'Choose ONE WORD ONLY from the passage.', maxWords: 1 }] };
    cy.intercept('POST', '**/user/getCurrentUser', { code: 200, data: { id: 1, username: 'tester', avatar: '' } });
    cy.intercept('GET', '**/notifications?*', { code: 200, data: { list: [], total: 0 } });
    cy.intercept('GET', '**/notifications/unread-count', { code: 200, data: { count: 0 } });
    for (const path of ['notifications/events', 'context-lab/task-events']) cy.intercept('GET', `**/${path}`, { statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body: '' });
    cy.intercept('POST', '**/api/reading-practices/81/start', { code: 200, data: { started: true } });
    cy.intercept('GET', '**/api/reading-practices/81', { code: 200, data: paper });
    cy.intercept('GET', '**/api/reading-practices/81/feedback', { code: 200, data: { list: [] } });
    cy.intercept('POST', '**/api/reading-practices/81/submissions', req => {
      expect(req.body.answers).to.deep.equal([{ questionId: 'q1', answerText: 'theropods' }]);
      req.reply({ code: 200, data: { practiceId: 81, submittedAt: '2026-10-21T00:00:00Z', score: 100, correctCount: 1, total: 1,
        results: [{ ...paper.questions[0], answerText: 'theropods', acceptedAnswers: ['theropods'], correctIndex: null, correct: true, explanation: '原文指出研究对象。', evidence: { paragraph: 1, quote: 'Huxley studied theropods.' } }] } });
    }).as('submit');
    cy.viewport(width, 900);
    cy.visit(`${width === 390 ? '/mobile' : '/englishWorld'}/reading-practices/81`);
    cy.contains('button', '开始考试').click();
    if (width === 390) cy.contains('button', '作答题目').click();
    cy.get('.ielts-exam-questions input[type="text"]').type('theropods');
    cy.reload();
    if (width === 390) cy.contains('button', '作答题目').click();
    cy.get('.ielts-exam-questions input[type="text"]').should('have.value', 'theropods');
    cy.contains('ONE WORD ONLY').should('be.visible');
    cy.get('body').then(body => expect(body[0].scrollWidth).to.be.at.most(width));
    cy.screenshot(`sentence-fill-${width}`, { capture: 'viewport' });
    cy.contains('button', '交卷').click();
    cy.contains('button', '确认交卷').click();
    cy.wait('@submit');
    cy.get('.ielts-exam-questions').should('contain', 'theropods').and('be.visible');
    cy.contains('考试已完成').should('be.visible');
  });
});
