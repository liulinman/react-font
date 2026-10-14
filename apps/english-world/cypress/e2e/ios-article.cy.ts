describe("Mobile article practice", () => {
  it("reads, translates, restores answers, submits and opens historical explanations", () => {
    const task = {
      id: 10,
      taskId: 10,
      status: "succeeded",
      sourceType: "custom",
      words: ["wander"],
      articleExerciseId: 99,
      article: "A quiet morning\n\nMaya walks beside the river every morning.",
      questions: [
        {
          id: "q1",
          stem: "Where does Maya walk?",
          options: ["By the river", "In a forest"],
          questionType: "detail",
        },
      ],
    };
    const result = {
      id: 55,
      attemptId: 55,
      taskId: 10,
      articleExerciseId: 99,
      score: 100,
      correctCount: 1,
      wrongCount: 0,
      weakWords: [],
      nextSuggestions: [],
      results: [
        {
          questionId: "q1",
          correct: true,
          correctIndex: 0,
          userSelectedIndex: 0,
          explanation: "The article says she walks beside the river.",
        },
      ],
    };
    let submissions = 0;
    cy.viewport(390, 844);
    cy.intercept({ pathname: "/api/**" }, (req) => {
      const path = new URL(req.url).pathname;
      let data: any = {};
      if (path.endsWith("/user/getCurrentUser"))
        data = { id: 900003, username: "Reader" };
      if (path.endsWith("/context-lab/history"))
        data = { list: [task], total: 1 };
      if (path.endsWith("/context-lab/detail")) data = task;
      if (path.endsWith("/context-lab/translate-article"))
        data = { translations: ["安静的早晨", "玛雅每天早晨在河边散步。"] };
      if (path.endsWith("/context-lab/attempt-detail")) data = result;
      if (path.endsWith("/context-lab/attempt-history"))
        data = { list: [result], total: 1 };
      if (path.endsWith("/context-lab/submit")) {
        submissions++;
        expect(req.body.sessionId).to.eq(99);
        expect(req.body.answers).to.deep.eq([
          { questionId: "q1", selectedIndex: 0 },
        ]);
        data = result;
      }
      req.reply({ code: 200, data });
    });
    cy.visit("/mobile/tools/context-lab", {
      onBeforeLoad(win) {
        Object.assign(win, { CapacitorCustomPlatform: { name: "ios" } });
        win.localStorage.clear();
      },
    });
    cy.contains("h2", "A quiet morning").should("be.visible");
    cy.screenshot("article-library");
    cy.contains("h2", "A quiet morning").click();
    cy.contains("Maya walks beside the river every morning.").should(
      "be.visible",
    );
    cy.contains("button", "查看中文翻译").click();
    cy.contains("玛雅每天早晨在河边散步。").should("be.visible");
    cy.screenshot("article-reading");
    cy.get('a[aria-label="去答题"]').click();
    cy.contains("button", "提交练习").should("be.disabled");
    cy.contains("label", "By the river").click();
    cy.reload();
    cy.get("input[type=radio]").first().should("be.checked");
    cy.screenshot("article-answer");
    cy.contains("button", "提交练习").click();
    cy.contains("The article says she walks beside the river.")
      .scrollIntoView()
      .should("be.visible");
    cy.screenshot("article-result");
    cy.then(() => expect(submissions).to.eq(1));
    cy.contains("a", "答题记录").click();
    cy.contains("a", "100 分").click();
    cy.contains("The article says she walks beside the river.")
      .scrollIntoView()
      .should("be.visible");
    cy.contains("a", "再练一次").click();
    cy.get("input[type=radio]").should("not.be.checked");
    cy.then(() => expect(submissions).to.eq(1));
    cy.viewport(320, 700);
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(320),
    );
  });
});
