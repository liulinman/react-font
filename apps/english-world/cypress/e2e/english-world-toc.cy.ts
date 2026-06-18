describe("english-world ToC routes", () => {
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
    cy.contains("strong", "单词列表").should("be.visible");
    cy.contains("面向复习、检索和维护的词库工作台").should("be.visible");
    cy.contains("resilient").should("be.visible");
    cy.contains("有复原力的").should("be.visible");
  };

  const expectStatsDashboard = () => {
    cy.contains("总学习单词").should("be.visible");
    cy.contains("已掌握单词").should("be.visible");
    cy.contains("掌握率").should("be.visible");
    cy.contains("每日新增单词").should("be.visible");
    cy.contains("词性分布").should("be.visible");
  };

  const openMoreMenuItem = (label: string) => {
    cy.contains("button", "更多").click();
    cy.contains('[role="menuitem"]', label).should("be.visible").click();
  };

  it("logs in, opens today's review, and navigates to the real words route", () => {
    mockCurrentUser(false);
    mockWordList();

    cy.intercept("POST", "/api/user/login", {
      code: 200,
      message: "ok",
      data: { user },
    }).as("login");

    cy.visit("/login");

    cy.get('[data-cy="login-username"]').type("tester");
    cy.get('[data-cy="login-password"]').type("123456");
    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@login");
    cy.location("pathname").should("eq", "/englishWorld/recite");
    cy.contains("今日复习").should("be.visible");
    cy.contains("开始今日复习").should("be.visible");

    cy.contains("button", "词库").click();
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

  it("navigates from the More menu to secondary ToC routes", () => {
    mockProtectedEnglishWorld();

    cy.visit("/englishWorld/words");

    cy.wait("@currentUser");
    cy.wait("@wordFilter");
    expectWordLibrary();

    openMoreMenuItem("学习统计");
    cy.location("pathname").should("eq", "/englishWorld/stats");
    cy.wait("@englishStats");
    expectStatsDashboard();

    openMoreMenuItem("语境实验室");
    cy.location("pathname").should("eq", "/englishWorld/context-lab");
    cy.contains("h1", "AI 语境实验室").should("be.visible");
    cy.contains("选择练习来源").should("be.visible");

    openMoreMenuItem("记忆地图");
    cy.location("pathname").should("eq", "/englishWorld/memory-map");
    cy.contains("h4", "记忆地图").should("be.visible");
    cy.contains("弱词队列").should("be.visible");

    openMoreMenuItem("系统设置");
    cy.location("pathname").should("eq", "/englishWorld/settings");
    cy.wait("@getAllConfigs");
    cy.contains("系统设置").should("be.visible");
    cy.contains("单词默写配置").should("be.visible");
  });

  it("creates an async context lab task and practices from history", () => {
    mockProtectedEnglishWorld();
    let historyCalls = 0;

    cy.intercept("POST", "**/context-lab/history", (req) => {
      historyCalls += 1;
      req.reply({
        code: 200,
        message: "ok",
        data:
          historyCalls <= 2
            ? { list: [], total: 0, page: 1, pageSize: 10 }
            : {
                list: [
                  {
                    id: 501,
                    taskId: 501,
                    status: "succeeded",
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

    cy.intercept("POST", "**/context-lab/generate-task", {
      code: 200,
      message: "ok",
      data: {
        id: 501,
        taskId: 501,
        status: "pending",
        sourceType: "proficiency",
        words: ["resilient", "steady", "recover"],
      },
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
    cy.contains("等待回调").should("be.visible");

    cy.contains("button", "刷新状态").click();
    cy.wait("@contextHistory");
    cy.contains("生成完成").should("be.visible");
    cy.contains("button", "开始练习").click();
    cy.contains("A short article about resilient learning.").should(
      "be.visible",
    );
    cy.contains("Recovering after difficulty").click();
    cy.contains("button", "提交练习").click();
    cy.wait("@submitContextExercise");
    cy.contains("正确").should("be.visible");
  });

  it("starts a targeted review from the daily action list", () => {
    mockProtectedEnglishWorld();
    cy.intercept("POST", "/api/recite/start", (req) => {
      expect(req.body.wordIds).to.deep.equal([101, 102]);
      req.reply({
        code: 200,
        message: "ok",
        data: {
          questions: [
            { wordId: 101, question: "有复原力的", direction: 0 },
            { wordId: 102, question: "稳定的", direction: 0 },
          ],
          direction: 0,
          totalCount: 2,
        },
      });
    }).as("startTargetedReview");

    cy.visit("/englishWorld");

    cy.wait("@currentUser");
    cy.get('[aria-label="今日行动清单"]').should("be.visible");
    cy.contains("修复薄弱词").should("be.visible");
    cy.contains("button", "定向复习").click();

    cy.location("pathname").should("eq", "/englishWorld/recite");
    cy.location("search").should("contain", "wordIds=101%2C102");
    cy.contains("这组词来自今日计划").should("be.visible");
    cy.contains("button", "开始今日复习").click();

    cy.wait("@startTargetedReview");
    cy.contains("有复原力的").should("be.visible");
  });
});
