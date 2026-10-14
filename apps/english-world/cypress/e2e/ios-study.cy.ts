describe("Mobile study and review", () => {
  it("completes cards, dictation, result and wrong-word retry without overflow", () => {
    const user = { id: 900002, username: "Lin" };
    const words = [
      {
        id: 1,
        englishWord: "serendipity",
        englishChinese: "意外的美好",
        englishPhonetic: "/ˌser.ənˈdɪp.ə.ti/",
        englishLevel: 0,
      },
      {
        id: 2,
        englishWord: "wander",
        englishChinese: "漫步",
        englishPhonetic: "/ˈwɒn.də/",
        englishLevel: 1,
      },
    ];
    let submissions = 0;
    cy.viewport(390, 844);
    cy.intercept({ pathname: "/api/**" }, (req) => {
      const path = new URL(req.url).pathname;
      let data: any = {};
      if (path.endsWith("/user/getCurrentUser")) data = user;
      if (path.endsWith("/notifications/unread-count")) data = { count: 0 };
      if (path.endsWith("/recite/stats"))
        data = {
          statistics: {
            totalCount: 24,
            correctCount: 20,
            errorCount: 4,
            accuracy: 83,
          },
          directionStats: {},
        };
      if (path.endsWith("/recite/history"))
        data = { list: [], total: 0, totalPages: 0, page: 1, pageSize: 10 };
      if (path.endsWith("/english/findWordList")) {
        req.reply({ statusCode: 404, body: { code: 500, message: "Cannot GET /english/findWordList" } });
        return;
      }
      if (path.endsWith("/english/filterWordList"))
        data = { list: words, total: 2, totalPages: 1 };
      if (path.endsWith("/recite/start")) {
        const ids = req.body.wordIds ?? [1, 2];
        data = {
          questions: words
            .filter((w) => ids.includes(w.id))
            .map((w) => ({
              wordId: w.id,
              question: w.englishChinese,
              direction: 0,
            })),
          direction: 0,
          totalCount: ids.length,
        };
      }
      if (path.endsWith("/recite/submit")) {
        submissions++;
        expect(req.body.answers).to.deep.eq([
          { wordId: 1, userAnswer: "serendipity" },
          { wordId: 2, userAnswer: "" },
        ]);
        data = {
          sessionId: 8,
          direction: 0,
          statistics: {
            totalCount: 2,
            correctCount: 1,
            errorCount: 1,
            accuracy: 50,
          },
          results: words.map((w, i) => ({
            wordId: w.id,
            englishWord: w.englishWord,
            correctAnswer: w.englishWord,
            userAnswer: i ? "" : "serendipity",
            isCorrect: !i,
          })),
        };
      }
      req.reply({ code: 200, data });
    });
    cy.visit("/mobile", {
      onBeforeLoad(win) {
        Object.assign(win, { CapacitorCustomPlatform: { name: "ios" } });
        win.localStorage.clear();
      },
    });
    cy.contains("让每个词，留下来。").should("be.visible");
    cy.screenshot("study-home");
    cy.contains("button", "开始学习").click();
    cy.contains("h1", "选一组词，开始吧").should("be.visible");
    cy.contains("button", "开始学习").click();
    cy.contains("h2", "serendipity").should("be.visible");
    cy.contains("意外的美好").should("not.exist");
    cy.screenshot("study-card");
    cy.contains("button", "查看释义").click();
    cy.contains("意外的美好").should("be.visible");
    cy.contains("button", "记住了").click();
    cy.contains("h2", "wander").should("be.visible");
    cy.contains("button", "查看释义").click();
    cy.contains("button", "还不熟").click();
    cy.contains("这一组，学完了").should("be.visible");
    cy.contains("默写一下，检验记忆").click();
    cy.contains("button", "开始复习").click();
    cy.get("#study-answer").type("serendipity");
    cy.contains("button", "下一词").click();
    cy.screenshot("study-review");
    cy.reload();
    cy.contains("h2", "漫步").should("be.visible");
    cy.contains("button", "上一词").click();
    cy.get("#study-answer").should("have.value", "serendipity");
    cy.contains("button", "下一词").click();
    cy.contains("button", "完成并查看结果").click();
    cy.contains("h2", "复习完成").should("be.visible");
    cy.screenshot("study-result");
    cy.then(() => expect(submissions).to.eq(1));
    cy.contains("button", "重练错词 · 1").click();
    cy.contains("h2", "漫步").should("be.visible");
    cy.contains("1 / 1").should("be.visible");
    cy.viewport(320, 700);
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(320),
    );
    cy.contains("[role=tab]", "词库").click();
    cy.contains("serendipity").should("be.visible");
    cy.screenshot("study-words");
    cy.contains("[role=tab]", "工具").click();
    cy.contains("学习工具").should("be.visible");
    cy.contains("后续交付").should("not.exist");
  });
});
