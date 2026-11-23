describe("english-world login", () => {
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

  it("logs in and returns to the protected account settings", () => {
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
    cy.intercept("POST", "/api/user/display-name", {
      code: 200,
      data: { id: user.id, displayName: "小林" },
    }).as("saveDisplayName");
    cy.contains("button", "修改昵称").click();
    cy.get("#settings-display-name").clear().type("小林");
    cy.contains("button", "保存昵称").click();
    cy.wait("@saveDisplayName").its("request.body").should("deep.equal", { displayName: "小林" });
    cy.get(".settings-profile-name").should("contain.text", "小林").and("contain.text", "tester");
    cy.get('button[aria-label="用户菜单：小林"]').should("be.visible");
    cy.get(".english-world-main").scrollTo("top", { ensureScrollable: false });
    cy.screenshot("desktop-settings", { capture: "viewport" });
  });
});
