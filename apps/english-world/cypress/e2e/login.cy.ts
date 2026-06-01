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

  it("logs in and opens the word list", () => {
    cy.intercept("POST", "/api/user/login", {
      code: 200,
      message: "ok",
      data: { user },
    }).as("login");

    cy.intercept("POST", "/api/english/filterWordList", {
      code: 200,
      message: "ok",
      data: {
        list: [
          {
            id: 1,
            englishWord: "apple",
            englishChinese: "苹果",
            englishType: 0,
            englishLevel: 1,
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }).as("wordList");

    cy.visit("/login");

    cy.get('[data-cy="login-username"]').type("tester");
    cy.get('[data-cy="login-password"]').type("123456");
    cy.get('[data-cy="login-submit"]').click();

    cy.wait("@login");
    cy.location("pathname").should("eq", "/englishWorld");
    cy.wait("@wordList");
    cy.contains("单词列表").should("be.visible");
    cy.contains("apple").should("be.visible");
  });
});
