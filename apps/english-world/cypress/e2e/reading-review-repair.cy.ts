// Admin browser interaction using response fixtures; real SQL/HTTP covered separately.
describe('AI review repair and problem navigation', () => {
  it('marks the affected question, locates evidence and clears fixed issues without approving', () => {
    let paper: any = { id: 14, title: 'The origins of birds', status: 'draft', config: { targetType: 'all', questionCount: 5, ieltsBand: 6 }, assignedCount: 0, submittedCount: 0,
      content: { title: 'The origins of birds', paragraphs: ['First paragraph.', 'Huxley studied theropods.', 'The dinosaurs lacked collarbones.', 'Fourth paragraph.', 'An early reptile.', 'Cladistics compares similarities.', 'A primitive bird had a vicious claw.'], questions: [1,2,3,4,5].map((n) => ({ id: `q${n}`, kind: 'sentence_completion', stem: `Sentence ${n} has a blank ____ .`, options: [], correctIndex: null, acceptedAnswers: [n === 5 ? 'claw' : 'theropods'], maxWords: 1, instructions: 'ONE WORD ONLY', explanation: '请依据原文核实答案。', evidence: { paragraph: n === 5 ? 6 : 2, quote: n === 5 ? 'A primitive bird had a vicious claw.' : 'Huxley studied theropods.' } })) },
      workflow: { revision: 2, qualityRevision: 2, reviewedQuestions: [], sources: [], issues: [{ id: 'structure-q5', type: 'structure', questionId: 'q5', message: '引用必须为对应段落中的原文', field: 'evidence', actualParagraph: 6, expectedParagraph: 7, quote: 'A primitive bird had a vicious claw.' }, { id: 'ai-q5', type: 'ai', questionId: 'q5', message: 'evidence.paragraph 标为6，实际为7', evidence: 'A primitive bird had a vicious claw.' }] } };
    for (const path of ['users', 'notification-schedules', 'notifications']) cy.intercept('GET', `**/api/admin/${path}*`, { code: 200, data: { list: [], total: 0 } });
    cy.intercept('GET', '**/api/admin/me', { code: 200, data: { username: 'admin' } });
    cy.intercept('GET', '**/api/admin/reading-practices?*', req => req.reply({ code: 200, data: { list: [paper], total: 1 } }));
    cy.intercept('GET', '**/api/admin/reading-practices/14', req => req.reply({ code: 200, data: paper }));
    cy.intercept('GET', '**/api/admin/reading-practices/14/feedback', { code: 200, data: { list: [] } });
    cy.intercept('POST', '**/api/admin/reading-practices/14/check', req => {
      expect(req.body).to.deep.equal({ revision: 2, repair: true });
      paper = structuredClone(paper); paper.content.questions[4].evidence.paragraph = 7;
      paper.workflow = { ...paper.workflow, revision: 3, qualityRevision: 3, issues: [], lastCheckSummary: { repairedQuestionIds: ['q5'], repairs: [{ questionId: 'q5', message: '引用出处已从第 6 段修正为第 7 段' }], remainingIssueCount: 0 } };
      req.reply({ code: 200, data: paper });
    }).as('repair');
    cy.viewport(1440, 1000); cy.visit('http://127.0.0.1:5197/admin/?section=practices');
    cy.contains('button', '审核练习').click(); cy.contains('[role="tab"]', '核对题目').click();
    cy.contains('button', '第 5 题 · 待处理').click();
    cy.get('#review-question-q5').should('be.visible').and('contain', '待处理');
    cy.get('#review-question-q5 details').should('have.attr', 'open');
    cy.get('.reading-workbench').should('not.contain', 'evidence.paragraph');
    cy.wait(400); cy.screenshot('review-question-marked', { capture: 'viewport' });
    cy.contains('button', 'AI 检查并修复').click(); cy.wait('@repair');
    cy.contains('本次已修复 1 题').should('be.visible');
    cy.contains('button', '第 5 题 · 待确认').should('exist');
    cy.get('#review-question-q5').should('not.contain', '引用必须为对应段落中的原文');
    cy.get('#review-question-q5 input[type="checkbox"]').should('not.be.checked');
    cy.screenshot('review-fixed-awaiting-teacher', { capture: 'viewport' });
  });
});
