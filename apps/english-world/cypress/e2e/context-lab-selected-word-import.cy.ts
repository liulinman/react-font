describe("context lab selected-word import", () => {
  it("normalizes a selected word through the unified import preview", () => {
    cy.viewport(1600, 900);

    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 200,
      message: "ok",
      data: {
        id: 1,
        username: "tester",
        avatar: "",
        createTime: "2026-01-01 00:00:00",
        updateTime: "2026-01-01 00:00:00",
      },
    }).as("currentUser");

    cy.intercept("GET", "**/notifications/unread-count", {
      code: 200,
      message: "ok",
      data: { count: 0 },
    });
    cy.intercept("GET", /\/notifications(?:\?.*)?$/, {
      code: 200,
      message: "ok",
      data: { list: [], nextCursor: null },
    });

    cy.intercept("POST", "**/context-lab/history", {
      code: 200,
      message: "ok",
      data: {
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming", "insects"],
            articleExerciseId: 88,
            article: "Urban Ecology\n\nInsects support urban farming.",
            questions: [
              {
                id: "q1",
                stem: "What is the passage about?",
                options: ["Urban farming", "Space travel"],
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    }).as("contextHistory");

    cy.intercept("POST", "**/english/importMissingWords/enrich-preview", (request) => {
      expect(request.body.words).to.deep.equal([
        {
          englishWord: "Insects",
          englishLevel: 0,
          englishType: 0,
          englishPartSpeech: [9],
          englishReference:
            "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=Insects",
        },
      ]);
      request.reply({
        delay: 250,
        body: {
          code: 200,
          message: "ok",
          data: {
            received: 1,
            aiEnhanced: true,
            items: [
              {
                englishWord: "insect",
                englishPhonetic: "/ˈɪnsekt/",
                englishChinese: "昆虫",
                englishPartSpeech: [2],
                englishNote: "原始词形：Insects（复数形式）",
                englishLevel: 0,
                englishType: 0,
              },
            ],
          },
        },
      });
    }).as("enrichSelectedWord");

    cy.intercept("POST", "**/english/importMissingWords/preview", {
      code: 200,
      message: "ok",
      data: {
        received: 1,
        normalized: 1,
        importable: 1,
        skippedExisting: 0,
        skippedDuplicate: 0,
        existingWords: [],
        duplicateWords: [],
      },
    }).as("previewSelectedWord");

    cy.intercept("POST", "**/english/importMissingWords", (request) => {
      expect(request.body).to.deep.equal({
        overwriteExisting: false,
        words: [
          {
            englishWord: "insect",
            englishPhonetic: "/ˈɪnsekt/",
            englishChinese: "昆虫",
            englishPartSpeech: [2],
            englishNote: "原始词形：Insects（复数形式）",
            englishLevel: 0,
            englishType: 0,
            englishReference:
              "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=Insects",
          },
        ],
      });
      request.reply({
        code: 200,
        message: "ok",
        data: {
          received: 1,
          normalized: 1,
          inserted: 1,
          skippedExisting: 0,
          skippedDuplicate: 0,
          insertedWords: ["insect"],
          skippedWords: [],
          updated: 0,
          updatedWords: [],
        },
      });
    }).as("importSelectedWord");

    cy.visit("/englishWorld/context-lab");
    cy.wait("@currentUser");
    cy.wait("@contextHistory");
    cy.contains("button", "开始练习").click();

    cy.window().then((appWindow) => {
      cy.stub(appWindow, "getSelection").returns({
        rangeCount: 1,
        removeAllRanges: () => undefined,
        toString: () => "Insects",
      } as unknown as Selection);
    });
    cy.contains(
      ".context-lab-article-paragraph",
      "Insects support urban farming.",
    ).rightclick();

    cy.contains("button", "一键添加到词库").click();
    cy.get('[role="region"][aria-label="导入预览"]')
      .should("be.visible")
      .within(() => {
        cy.contains("AI 补全中").should("be.visible");
        cy.get('input[aria-label="第 1 个词单词"]').should(
          "have.value",
          "Insects",
        );
      });

    cy.wait("@enrichSelectedWord");
    cy.get('[role="region"][aria-label="导入预览"]').within(() => {
      cy.get('input[aria-label="第 1 个词单词"]').should(
        "have.value",
        "insect",
      );
      cy.get('input[aria-label="第 1 个词释义"]').should(
        "have.value",
        "昆虫",
      );
      cy.contains("button", "确认导入").click();
    });

    cy.wait("@previewSelectedWord");
    cy.wait("@importSelectedWord");
    cy.contains("已导入 1 个词条").should("be.visible");
  });
});
