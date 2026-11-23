describe("english-world ToC routes", () => {
  beforeEach(() => {
    cy.intercept(
      { method: "GET", pathname: "/api/notifications" },
      { code: 200, data: { list: [], total: 0, nextCursor: null } },
    );
    cy.intercept("GET", "/api/notifications/unread-count", {
      code: 200,
      data: { count: 0 },
    });
    cy.intercept("GET", "/api/notifications/events", {
      headers: { "content-type": "text/event-stream" },
      body: ": mock notification stream\n\n",
    });
    cy.intercept("GET", "/api/mcp-access/tokens", {
      code: 200,
      data: { items: [] },
    });
    cy.intercept("GET", "/api/mcp-access/audit", {
      code: 200,
      data: { items: [] },
    });
    cy.intercept("GET", "/api/mcp-access/info", {
      code: 200,
      data: { endpoint: "/mcp", transport: "http", auth: "bearer" },
    });

    cy.intercept("POST", "/api/user/captcha", {
      code: 200,
      data: {
        captchaId: "mock-captcha",
        imageDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP/QAAAAASUVORK5CYII=",
        expiresIn: 120,
      },
    });
  });
  const user = {
    id: 1,
    username: "tester",
    avatar: "https://example.com/avatar.png",
    createTime: "2026-01-01 00:00:00",
    updateTime: "2026-01-01 00:00:00",
  };

  const words = [
    {
      id: 101,
      englishWord: "resilient",
      englishPhonetic: "/rɪˈzɪliənt/",
      englishType: 0,
      englishChinese: "有复原力的",
      englishNote: "Bounces back after difficulty.",
      englishLevel: 1,
      englishReference: "She is resilient under pressure.",
      englishCreateTime: "2026-01-02 09:00:00",
      englishUpdateTime: "2026-01-02 09:00:00",
      englishImg: "",
      englishPartSpeech: [0],
    },
    {
      id: 102,
      englishWord: "steady",
      englishPhonetic: "/ˈstedi/",
      englishType: 0,
      englishChinese: "稳定的",
      englishNote: "Calm and consistent.",
      englishLevel: 2,
      englishReference: "Keep a steady pace.",
      englishCreateTime: "2026-01-02 09:10:00",
      englishUpdateTime: "2026-01-02 09:10:00",
      englishImg: "",
      englishPartSpeech: [1],
    },
  ];

  const mockCurrentUser = (authenticated = true) => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: authenticated ? 200 : 4001,
      message: authenticated ? "ok" : "未登录",
      data: authenticated ? user : null,
    }).as("currentUser");
  };

  const mockWordList = () => {
    cy.intercept("POST", "/api/english/filterWordList", {
      code: 200,
      message: "ok",
      data: {
        list: words,
        total: words.length,
        totalPages: 1,
      },
    }).as("wordFilter");
  };

  const mockStats = () => {
    cy.intercept("POST", "/api/english/englishStats", {
      code: 200,
      message: "ok",
      data: {
        levelCount: 2,
        totalCount: 2,
        percentage: 88,
        dailyStats: [
          { date: "2026-01-01", count: 1 },
          { date: "2026-01-02", count: 1 },
        ],
        partSpeechStatisticalClass: {
          1: 1,
          2: 1,
        },
      },
    }).as("englishStats");
  };

  const mockSettings = () => {
    cy.intercept("POST", "/api/config/getAll", {
      code: 200,
      message: "ok",
      data: {},
    }).as("getAllConfigs");
  };

  const mockCockpitApis = () => {
    cy.intercept("POST", "/api/daily-coach/summary", {
      code: 200,
      message: "ok",
      data: {
        totalWords: 2,
        todayNewWords: 0,
        reciteAccuracy: 88,
        weakWords: words.map((word) => ({
          id: word.id,
          word: word.englishWord,
          meaning: word.englishChinese,
          level: word.englishLevel,
        })),
        levelDistribution: [
          { level: 0, count: 0 },
          { level: 1, count: 1 },
          { level: 2, count: 1 },
          { level: 3, count: 0 },
        ],
        suggestedActions: [
          {
            type: "repair",
            title: "修复薄弱词",
            description: "按今日计划复习低掌握度单词",
            wordIds: [101, 102],
            estimatedMinutes: 4,
          },
          {
            type: "context",
            title: "进入语境练习",
            description: "把薄弱词放进短阅读",
            wordIds: [101, 102],
            estimatedMinutes: 6,
          },
        ],
      },
    });

    cy.intercept("POST", "/api/memory-map/overview", {
      code: 200,
      message: "ok",
      data: {
        levels: [
          { level: 0, count: 0 },
          { level: 1, count: 1 },
          { level: 2, count: 1 },
          { level: 3, count: 0 },
        ],
        dueWords: [],
        weakWords: words.map((word) => ({
          id: word.id,
          word: word.englishWord,
          meaning: word.englishChinese,
          level: word.englishLevel,
        })),
        recentMistakes: [],
        streakLikeStats: {
          recentSessions: 3,
          recentAccuracy: 88,
        },
      },
    });
  };

  const mockContextLabHistory = () => {
    cy.intercept("POST", "**/context-lab/history", {
      code: 200,
      message: "ok",
      data: { list: [], total: 0, page: 1, pageSize: 10 },
    }).as("contextHistoryDefault");
  };

  const mockProtectedEnglishWorld = () => {
    mockCurrentUser(true);
    mockWordList();
    mockStats();
    mockSettings();
    mockCockpitApis();
    mockContextLabHistory();
  };

  const expectWordLibrary = () => {
    cy.contains("h1", "词库").should("be.visible");
    cy.get('[aria-label="词库筛选"]').should("be.visible");
    cy.contains("resilient").should("be.visible");
    cy.contains("有复原力的").should("be.visible");
  };

  const expectStatsDashboard = () => {
    cy.contains("总学习单词").should("be.visible");
    cy.contains("已掌握单词").should("be.visible");
    cy.contains("掌握率").should("be.visible");
    cy.contains("新增单词趋势").should("be.visible");
    cy.contains("词性分布").should("be.visible");
  };

  it("logs in, returns to account settings, and navigates to the real words route", () => {
    mockCurrentUser(false);
    mockWordList();

    cy.intercept("POST", "/api/user/login", {
      code: 200,
      message: "ok",
      data: { user },
    }).as("login");

    cy.visit("/englishWorld/settings");

    cy.get('[data-cy="login-username"]').type("tester");
    cy.get('[data-cy="login-password"]').type("123456");
    cy.get('[data-cy="login-captcha"]').type("ABCDE");
    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@login")
      .its("request.body")
      .should("include", { captchaId: "mock-captcha", captchaCode: "ABCDE" });
    cy.location("pathname").should("eq", "/englishWorld/settings");
    cy.contains("h2", "账号安全").should("be.visible");
    cy.contains("button", "修改密码").should("be.visible");

    cy.contains('[role="menuitem"]', "词库列表").click();
    cy.location("pathname").should("eq", "/englishWorld/words");
    cy.wait("@wordFilter");
    expectWordLibrary();
  });

  it("allows direct and refreshed visits to the protected words route with a mocked current user", () => {
    mockCurrentUser(true);
    mockWordList();
    mockCockpitApis();

    cy.visit("/englishWorld/words");

    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/words");
    cy.wait("@wordFilter");
    expectWordLibrary();

    cy.reload();

    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/words");
    cy.wait("@wordFilter");
    expectWordLibrary();
  });

  it("allows direct and refreshed visits to the protected stats route", () => {
    mockProtectedEnglishWorld();

    cy.visit("/englishWorld/stats");

    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/stats");
    cy.wait("@englishStats");
    expectStatsDashboard();

    cy.reload();

    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/stats");
    cy.wait("@englishStats");
    expectStatsDashboard();
  });

  it("keeps legacy #list and #stat ToC entries compatible", () => {
    mockProtectedEnglishWorld();

    cy.visit("/englishWorld#list");

    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/words");
    cy.wait("@wordFilter");
    expectWordLibrary();

    cy.visit("/englishWorld#stat");

    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/stats");
    cy.wait("@englishStats");
    expectStatsDashboard();
  });

  it("navigates with the sidebar, word-library actions and user settings menu", () => {
    mockProtectedEnglishWorld();
    cy.visit("/englishWorld/words");
    cy.wait("@currentUser");
    cy.wait("@wordFilter");
    expectWordLibrary();
    cy.contains('[role="menuitem"]', "数据统计").click();
    cy.location("pathname").should("eq", "/englishWorld/stats");
    cy.wait("@englishStats");
    expectStatsDashboard();
    cy.contains('[role="menuitem"]', "词库列表").click();
    cy.wait("@wordFilter");
    cy.contains("button", "记忆地图").click();
    cy.location("pathname").should("eq", "/englishWorld/memory-map");
    cy.contains("h4", "记忆地图").should("be.visible");
    cy.contains("弱词队列").should("be.visible");
    cy.get('[aria-label="用户菜单：tester"]').click();
    cy.contains('[role="menuitem"]', "系统设置").click();
    cy.location("pathname").should("eq", "/englishWorld/settings");
    cy.contains("h1", "系统设置").should("be.visible");
    cy.contains("h2", "账号安全").should("be.visible");
    cy.contains("MCP 授权").should("be.visible");
    cy.contains("单词默写配置").should("not.exist");
    cy.contains("单词听写配置").should("not.exist");
  });

  it("creates an async context lab task and practices from history", () => {
    mockProtectedEnglishWorld();
    let created = false;
    let completed = false;

    cy.intercept("POST", "**/context-lab/history", (req) => {
      req.reply({
        code: 200,
        message: "ok",
        data: !created
          ? { list: [], total: 0, page: 1, pageSize: 10 }
          : {
              list: [
                {
                  id: 501,
                  taskId: 501,
                  status: completed ? "succeeded" : "pending",
                  sourceType: "proficiency",
                  words: ["resilient", "steady", "recover"],
                  articleExerciseId: 901,
                  article: "A short article about resilient learning.",
                  questions: [
                    {
                      id: "q1",
                      stem: "What does resilient learning describe?",
                      options: [
                        "Recovering after difficulty",
                        "Never practicing",
                        "Avoiding all mistakes",
                        "Forgetting words",
                      ],
                    },
                  ],
                },
              ],
              total: 1,
              page: 1,
              pageSize: 10,
            },
      });
    }).as("contextHistory");

    cy.intercept("POST", "**/context-lab/generate-task", (req) => {
      created = true;
      req.reply({
        code: 200,
        message: "ok",
        data: {
          id: 501,
          taskId: 501,
          status: "pending",
          sourceType: "proficiency",
          words: ["resilient", "steady", "recover"],
        },
      });
    }).as("createContextTask");

    cy.intercept("POST", "**/context-lab/submit", (req) => {
      expect(req.body.sessionId).to.eq(901);
      req.reply({
        code: 200,
        message: "ok",
        data: {
          results: [
            {
              questionId: "q1",
              correct: true,
              correctIndex: 0,
              userSelectedIndex: 0,
              explanation: "回答正确。",
            },
          ],
        },
      });
    }).as("submitContextExercise");

    cy.visit("/englishWorld/context-lab");

    cy.wait("@currentUser");
    cy.wait("@contextHistory");
    cy.contains("button", "生成练习包").click();
    cy.wait("@createContextTask");
    cy.get("article.context-lab-history-item-pending").should("be.visible");

    cy.then(() => {
      completed = true;
    });
    cy.get('[aria-label="任务 501 更多操作"]').click();
    cy.contains('[role="menuitem"]', "刷新状态").click();
    cy.wait("@contextHistory");
    cy.get("article.context-lab-history-item-succeeded").should("be.visible");
    cy.contains("button", "开始练习").click();
    cy.contains("A short article about resilient learning.").should(
      "be.visible",
    );
    cy.contains("Recovering after difficulty").click();
    cy.contains("button", "提交练习").click();
    cy.wait("@submitContextExercise");
    cy.contains("正确").should("be.visible");
  });

  // settings/desktop-learning-nav FR-06, AC-05: the old desktop review entry is retired.
  it("redirects the legacy recite entry to authenticated scene listening without creating AI work", () => {
    mockProtectedEnglishWorld();
    cy.intercept("GET", "**/ai-learning/history", {
      code: 200,
      data: { sessions: [], reviewWordIds: [] },
    }).as("listeningHistory");
    cy.intercept("POST", "**/ai-learning/sessions", () => {
      throw new Error("Legacy navigation must not create an AI session");
    }).as("unexpectedGeneration");
    cy.visit("/englishWorld/recite");
    cy.wait("@currentUser");
    cy.location("pathname").should("eq", "/englishWorld/ai-listening");
    cy.contains("h1", "场景听力").should("be.visible");
    cy.get("@unexpectedGeneration.all").should("have.length", 0);
  });
});
