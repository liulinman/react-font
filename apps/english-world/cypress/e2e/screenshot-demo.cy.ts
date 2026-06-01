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
  });

  it("shows today's review card and takes a manual screenshot", () => {
    cy.visit("/login");

    cy.get('[data-cy="login-username"]').type("tester");
    cy.get('[data-cy="login-password"]').type("123456");
    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@login");
    cy.location("pathname").should("eq", "/englishWorld/recite");

    cy.contains("今日复习").should("be.visible");
    cy.contains("开始今日复习").should("be.visible");
    cy.contains("开始今日复习").click();
    cy.wait("@settings");
    cy.wait("@startReview");
    cy.contains("网络摄像头").should("be.visible");
    cy.contains("第 1 / 3 题").should("be.visible");
    cy.screenshot("today-review-task");
  });
});
