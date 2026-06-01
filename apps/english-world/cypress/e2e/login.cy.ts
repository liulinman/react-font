describe("english-world login", () => {
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
  });

  it("logs in and opens today's review task", () => {
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
  });
});
