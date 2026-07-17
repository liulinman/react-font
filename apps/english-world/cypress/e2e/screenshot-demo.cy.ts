describe("cypress syntax demo", () => {
  const user = {
    id: 1,
    username: "tester",
    createTime: "2026-01-01 00:00:00",
    updateTime: "2026-01-01 00:00:00",
  };

  beforeEach(() => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 4001,
      message: "未登录",
      data: null,
    });

    cy.intercept("POST", "/api/user/login", {
      code: 200,
      message: "ok",
      data: { user },
    }).as("login");

    cy.intercept("POST", "/api/config/getAll", {
      code: 200,
      message: "ok",
      data: {},
    }).as("settings");

    cy.intercept("POST", "/api/recite/start", {
      code: 200,
      message: "ok",
      data: {
        questions: [
          { wordId: 1, question: "网络摄像头", direction: 0 },
          { wordId: 2, question: "恶作剧", direction: 0 },
          { wordId: 3, question: "蛋白质", direction: 0 },
        ],
        direction: 0,
        totalCount: 3,
      },
    }).as("startReview");

    cy.intercept("POST", "/api/daily-coach/summary", {
      code: 200,
      message: "ok",
      data: {
        totalWords: 513,
        todayNewWords: 4,
        reciteAccuracy: 72,
        levelDistribution: [
          { level: 0, count: 18 },
          { level: 1, count: 37 },
        ],
        weakWords: [
          { id: 1, word: "memorable", level: 0 },
          { id: 2, word: "gradient", level: 1 },
          { id: 3, word: "resilient", level: 0 },
        ],
        suggestedActions: [
          {
            type: "review",
            title: "开始今日复习",
            description: "优先处理低掌握度单词，完成一轮短复习。",
            wordIds: [1, 2, 3],
            estimatedMinutes: 4,
          },
          {
            type: "context",
            title: "进入语境练习",
            description: "把薄弱词放进短阅读和选择题里巩固。",
            wordIds: [1, 2, 3],
            estimatedMinutes: 8,
          },
        ],
      },
    }).as("dailyCoach");

    cy.intercept("POST", "/api/memory-map/overview", {
      code: 200,
      message: "ok",
      data: {
        levels: [
          { level: 0, count: 18 },
          { level: 1, count: 37 },
        ],
        dueWords: [{ id: 1, word: "memorable", level: 0 }],
        weakWords: [{ id: 3, word: "resilient", level: 0 }],
        recentMistakes: [{ id: 2, word: "gradient", level: 1 }],
        streakLikeStats: { recentSessions: 6, recentAccuracy: 72 },
      },
    }).as("memoryMap");
  });

  it("captures the desktop focus studio", () => {
    cy.viewport(1440, 960);
    cy.visit("/login");

    cy.get('[data-cy="login-username"]').type("tester");
    cy.get('[data-cy="login-password"]').type("123456");
    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@login");
    cy.location("pathname").should("eq", "/englishWorld/recite");

    cy.contains("button", "今天").click();
    cy.wait("@dailyCoach");
    cy.wait("@memoryMap");
    cy.contains("今天的学习重点").should("be.visible");
    cy.contains("今天先做这一步").should("be.visible");
    cy.screenshot("focus-studio-today", { capture: "viewport" });

    cy.contains("button", "学习").click();

    cy.contains("今日复习").should("be.visible");
    cy.contains("开始今日复习").should("be.visible");
    cy.contains("开始今日复习").click();
    cy.wait("@settings");
    cy.wait("@startReview");
    cy.contains("网络摄像头").should("be.visible");
    cy.contains(".recite-question-topline", "第 1 题").should("be.visible");
    cy.screenshot("focus-studio-review", { capture: "viewport" });
  });
});
