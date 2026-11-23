describe("cypress syntax demo", () => {
  const user = {
    id: 1,
    username: "tester",
    createTime: "2026-01-01 00:00:00",
    updateTime: "2026-01-01 00:00:00",
  };

  beforeEach(() => {
    cy.intercept("GET", "/api/notifications/unread-count", {code:200,data:{count:0}});
    cy.intercept("GET", "/api/mcp-access/tokens", {code:200,data:{items:[]}});
    cy.intercept("GET", "/api/mcp-access/audit", {code:200,data:{items:[]}});
    cy.intercept("GET", "/api/mcp-access/info", {code:200,data:{endpoint:"/mcp",transport:"http",auth:"bearer"}});

    cy.intercept("GET", "/api/notifications*", {code:200,data:{list:[],total:0,count:0,nextCursor:null}});
    cy.intercept("GET", "/api/notifications/events", {headers:{"content-type":"text/event-stream"},body:": mock notification stream\n\n"});

    cy.intercept("POST", "/api/user/captcha", {code:200,data:{captchaId:"mock-captcha",imageDataUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP/QAAAAASUVORK5CYII=",expiresIn:120}});
    cy.intercept("GET", "/api/ai-learning/history", {code:200,data:{sessions:[],reviewWordIds:[]}});
    cy.intercept("POST", "/api/english/filterWordList", {code:200,data:{list:[{id:1,englishWord:"resilient",englishChinese:"有韧性的"}],total:1}}).as("words");
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 200,
      message: "ok",
      data: user,
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
    cy.visit("/englishWorld");

    cy.location("pathname").should("eq", "/englishWorld");
    cy.wait("@dailyCoach");
    cy.wait("@memoryMap");
    cy.contains("今天先做这一步").should("be.visible");
    cy.screenshot("focus-studio-today", { capture: "viewport" });
    cy.contains(".ant-menu-submenu", "学习").then(menu=>{if(!menu.hasClass("ant-menu-submenu-open"))cy.wrap(menu).find(".ant-menu-submenu-title").click();});
    cy.contains('[role="menuitem"]', "场景听力").click();
    cy.location("pathname").should("eq", "/englishWorld/ai-listening");
    cy.contains("h1", "场景听力").should("be.visible");
    cy.wait("@words");
    cy.contains("label", "resilient").find('input[type="checkbox"]').check();
    cy.get('[aria-label="本轮已选单词"]').should("contain.text", "resilient");
    cy.contains("button", "开始复习").should("be.enabled");
    cy.screenshot("focus-studio-listening-selection", { capture: "viewport" });
  });
});
