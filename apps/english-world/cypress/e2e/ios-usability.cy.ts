describe("Mobile vocabulary and split reading usability", () => {
  const words = [
    {
      id: 1,
      englishWord: "serendipity",
      englishChinese: "意外发现美好事物的运气；不期而遇的惊喜",
      englishPhonetic: "/ˌser.ənˈdɪp.ə.ti/",
      englishLevel: 1,
    },
    {
      id: 2,
      englishWord: "wander",
      englishChinese: "漫步；闲逛",
      englishPhonetic: "/ˈwɒn.də/",
      englishLevel: 0,
    },
    {
      id: 3,
      englishWord: "resilience",
      englishChinese: "韧性；适应力",
      englishPhonetic: "/rɪˈzɪl.i.əns/",
      englishLevel: 2,
    },
  ];
  it("keeps adding visible above the list and saves a word through the real form", () => {
    let added: any = null;
    cy.viewport(390, 844);
    cy.intercept({ pathname: "/api/**" }, (req) => {
      const path = new URL(req.url).pathname;
      let data: any = {};
      if (path.endsWith("/user/getCurrentUser"))
        data = { id: 900004, username: "Learner" };
      if (path.endsWith("/english/findWordList")) {
        req.reply({ statusCode: 404, body: { code: 500, message: "Cannot GET /english/findWordList" } });
        return;
      }
      if (path.endsWith("/english/filterWordList")) {
        const list =
          added && req.body.englishWord === added.englishWord ? [added] : added ? [...words, added] : words;
        data = { list, total: list.length, totalPages: 1 };
      }
      if (path.endsWith("/english/existEnglishWord")) data = false;
      if (path.endsWith("/english/AddEnglishWord")) {
        expect(req.body.englishWord).to.eq("tranquil");
        added = { ...req.body, id: 40 };
        data = {};
      }
      req.reply({ code: 200, data });
    });
    cy.visit("/mobile/words", {
      onBeforeLoad(win) {
        Object.assign(win, { CapacitorCustomPlatform: { name: "ios" } });
        win.localStorage.clear();
      },
    });
    cy.contains("strong", "serendipity").should("be.visible");
    cy.contains("a", "添加单词")
      .should("be.visible")
      .then((el) =>
        expect(el[0].getBoundingClientRect().top).to.be.lessThan(150),
      );
    cy.screenshot("usability-word-library");
    cy.contains("a", "添加单词").click();
    cy.get('input[aria-label="单词或短语"]').type("tranquil");
    cy.get('textarea[aria-label="中文释义"]').type("安静的；平和的");
    cy.screenshot("usability-add-word");
    cy.contains("button", "保存").click();
    cy.contains("h1", "tranquil").should("be.visible");
    cy.contains("安静的；平和的").should("be.visible");
    cy.screenshot("usability-word-detail");
    cy.viewport(320, 700);
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(320),
    );
  });
  it("keeps a long passage stationary when changing questions and resumes both positions", () => {
    const article =
      "The art of noticing\n\n" +
      Array.from(
        { length: 12 },
        (_, i) =>
          `${i + 1}. A quiet walk can change the way we see the world. Maya follows the river through the city every morning. Instead of rushing, she notices the light on the water and the sound of birds. These small moments help her feel calm and ready for the day.`,
      ).join("\n\n");
    const task = {
      taskId: 10,
      id: 10,
      status: "succeeded",
      sourceType: "custom",
      words: ["wander", "notice", "tranquil"],
      articleExerciseId: 99,
      article,
      questions: [
        {
          id: "q1",
          stem: "Where does Maya walk every morning?",
          options: [
            "Along the river",
            "Through a crowded market",
            "Inside a shopping centre",
            "Across the mountains",
          ],
        },
        {
          id: "q2",
          stem: "How does the walk make Maya feel?",
          options: [
            "Calm and ready for the day",
            "Tired and worried",
            "Confused and lonely",
            "Bored and impatient",
          ],
        },
      ],
    };
    cy.viewport(390, 844);
    cy.intercept({ pathname: "/api/**" }, (req) => {
      const path = new URL(req.url).pathname;
      let data: any = {};
      if (path.endsWith("/user/getCurrentUser"))
        data = { id: 900005, username: "Reader" };
      if (path.endsWith("/context-lab/detail")) data = task;
      req.reply({ code: 200, data });
    });
    cy.visit("/mobile/tools/context-lab/10/answer", {
      onBeforeLoad(win) {
        Object.assign(win, { CapacitorCustomPlatform: { name: "ios" } });
        win.localStorage.clear();
      },
    });
    cy.contains("h2", "Where does Maya walk every morning?").should(
      "be.visible",
    );
    cy.contains("How does the walk make Maya feel?").should("not.exist");
    cy.get('.article-question-scroll').should(el=>expect(el[0].scrollHeight).to.be.at.most(el[0].clientHeight+1));
    cy.get('.article-single-question label').should('have.length',4).each(el=>{const r=el[0].getBoundingClientRect();expect(r.top).to.be.greaterThan(0);expect(r.bottom).to.be.lessThan(844);});
    cy.get(".article-passage").scrollTo(0, 220);
    cy.contains("label", "Along the river").click();
    cy.contains("button", "下一题").click();
    cy.get(".article-passage").should((el) =>
      expect(el[0].scrollTop).to.be.closeTo(220, 2),
    );
    cy.contains("h2", "How does the walk make Maya feel?").should("be.visible");
    cy.contains("label", "Calm and ready").click();
    cy.screenshot("usability-split-reading");
    cy.get('button[aria-label="查看原文"]').click();
    cy.get("dialog").should("be.visible");
    cy.get("dialog .article-passage").scrollTo(0, 340);
    cy.contains("button", "返回答题").click();
    cy.get("dialog").should("not.exist");
    cy.get(".article-passage").should((el) =>
      expect(el[0].scrollTop).to.be.closeTo(340, 2),
    );
    cy.get("input[type=radio]").first().should("be.checked");
    cy.reload();
    cy.contains("h2", "How does the walk make Maya feel?").should("be.visible");
    cy.get(".article-passage").should((el) =>
      expect(el[0].scrollTop).to.be.closeTo(340, 2),
    );
    cy.contains("button", "上一题").click();
    cy.get("input[type=radio]").first().should("be.checked");
    cy.viewport(320, 568);
    cy.contains("button", "下一题").should("be.visible");
    cy.get(".article-reading-pane").should((el) =>
      expect(el[0].getBoundingClientRect().height).to.be.greaterThan(50),
    );
    cy.get(".article-question-scroll").should((el) =>
      expect(el[0].getBoundingClientRect().height).to.be.greaterThan(90),
    );
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(320),
    );
    cy.get(".article-question-scroll").should(el=>expect(el[0].scrollHeight).to.be.at.most(el[0].clientHeight+1));
    cy.screenshot("usability-small-phone");
  });
});
