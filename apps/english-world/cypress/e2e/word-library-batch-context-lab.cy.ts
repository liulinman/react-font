describe("word-library batch Context Lab generation", () => {
  const words = ["fragile", "resilient", "steady"].map((englishWord, index) => ({
    id: index + 101,
    englishWord,
    englishType: 0,
    englishChinese: `释义 ${index + 1}`,
    englishLevel: index,
    englishPartSpeech: [0],
  }));

  it("creates and focuses a configured pending task", () => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 200,
      message: "ok",
      data: { id: 1, username: "tester" },
    }).as("currentUser");
    cy.intercept("POST", "/api/config/getAll", {
      code: 200,
      message: "ok",
      data: {},
    });
    cy.intercept("GET", "/api/notifications*", {
      code: 200,
      message: "ok",
      data: { list: [], nextCursor: null },
    });
    cy.intercept("GET", "/api/notifications/unread-count", {
      code: 200,
      message: "ok",
      data: { count: 0 },
    });
    cy.intercept("POST", "/api/english/filterWordList", {
      code: 200,
      message: "ok",
      data: { list: words, total: 3, totalPages: 1 },
    }).as("wordList");

    const pendingTask = {
      id: 44,
      taskId: 44,
      status: "pending",
      sourceType: "custom",
      words: ["fragile", "resilient", "steady"],
    };
    cy.intercept("POST", "**/context-lab/generate-task", (request) => {
      expect(request.body).to.deep.equal({
        sourceType: "custom",
        words: ["fragile", "resilient", "steady"],
        ieltsBand: 7.5,
        modelProvider: "gpt",
      });
      request.reply({ code: 200, message: "ok", data: pendingTask });
    }).as("createContextTask");
    cy.intercept("POST", "**/context-lab/history", {
      code: 200,
      message: "ok",
      data: { list: [pendingTask], total: 1, page: 1, pageSize: 10 },
    }).as("contextHistory");
    cy.intercept("POST", "**/context-lab/detail", {
      code: 200,
      message: "ok",
      data: pendingTask,
    }).as("contextDetail");
    cy.intercept("GET", "**/context-lab/task-events", {
      statusCode: 200,
      body: "",
    });

    cy.visit("/englishWorld/words");
    cy.wait("@currentUser");
    cy.wait("@wordList");
    cy.contains("卡片").click();
    cy.contains("button", "批量管理").click();
    cy.contains("button", "全选当前页").click();
    cy.contains("button", "生成语境题").click();

    cy.contains(".ant-modal-title", "生成语境练习").should("be.visible");
    cy.contains("已选 3/20").should("be.visible");
    cy.contains(".ant-segmented-item", "GPT-5.6").click();
    cy.get('input[aria-label="雅思分数等级"]').clear().type("7.5");
    cy.contains("button", "开始生成").click();
    cy.wait("@createContextTask");

    cy.location("pathname").should("eq", "/englishWorld/context-lab");
    cy.location("search").should(
      "eq",
      "?source=word-library&taskId=44",
    );
    cy.wait("@contextDetail");
    cy.contains('[aria-label="批量生成任务状态"]', "等待回调").should(
      "be.visible",
    );
    cy.get(".context-lab-history-item-selected").should(
      "contain.text",
      "fragile / resilient / steady",
    );
    cy.contains(".ant-modal-title", "单词来源文章").should("not.exist");
  });
});
