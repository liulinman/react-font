const user = {
  id: 1,
  username: "mobile-tester",
  avatar: "",
  createTime: "2026-01-01 00:00:00",
  updateTime: "2026-01-01 00:00:00",
};

const authenticateMobileRoute = () => {
  cy.intercept("POST", "**/api/user/getCurrentUser", {
    code: 200,
    message: "ok",
    data: user,
  }).as("currentUser");
};

const mockNotifications = () => {
  cy.intercept(
    { method: "GET", pathname: "/api/notifications" },
    {
      code: 200,
      message: "ok",
      data: { list: [], nextCursor: null },
    },
  ).as("notifications");
  cy.intercept(
    { method: "GET", pathname: "/api/notifications/unread-count" },
    {
      code: 200,
      message: "ok",
      data: { count: 0 },
    },
  ).as("unreadNotifications");
};

const visitMobile = (path: string) => {
  cy.visit(path, {
    onBeforeLoad(window) {
      Object.defineProperty(window, "EventSource", {
        configurable: true,
        value: class {
          onmessage: ((event: MessageEvent<string>) => void) | null = null;
          onerror: (() => void) | null = null;
          close() {}
        },
      });
    },
  });
};

const expectNoPageOverflow = () => {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth,
    );
  });
};

const expectMobileShell = (activeTab: string) => {
  cy.get(".mobile-app-shell").should("be.visible");
  cy.get('[role="tab"]').should("have.length", 4);
  cy.get('[role="tab"][aria-selected="true"]')
    .should("have.text", activeTab);
  cy.get(".mobile-app-shell__navigation .adm-safe-area-position-bottom").should("exist");
  cy.get(".english-world-shell").should("not.exist");
  cy.get(".english-world-workspace").should("not.exist");
  cy.get(".adm-tab-bar-item").each(($tab) => {
    const rect = $tab[0].getBoundingClientRect();
    expect(rect.width).to.be.at.least(44);
    expect(rect.height).to.be.at.least(44);
  });
  expectNoPageOverflow();
};

const viewportCases = [
  { width: 320, height: 568, label: "320px" },
  { width: 375, height: 812, label: "375px" },
  { width: 390, height: 844, label: "390px" },
  { width: 393, height: 852, label: "393px" },
  { width: 430, height: 932, label: "430px" },
  { width: 844, height: 390, label: "844px landscape" },
];

describe("english world mobile foundation routes", () => {
  it("keeps /mobile/words usable at every required viewport", () => {
    authenticateMobileRoute();
    mockNotifications();
    cy.viewport(viewportCases[0].width, viewportCases[0].height);
    visitMobile("/mobile/words");
    cy.wait("@currentUser");

    viewportCases.forEach(({ width, height, label }) => {
      cy.viewport(width, height);
      expectMobileShell("词库");
      cy.log(`verified ${label}`);
    });
  });

  it("replaces the compatibility entry with the learn tab in the /mobile route tree", () => {
    authenticateMobileRoute();
    mockNotifications();
    cy.viewport(390, 844);
    visitMobile("/englishWorldMobile?view=more");
    cy.wait("@currentUser");

    cy.location("pathname").should("eq", "/mobile");
    expectMobileShell("学习");
  });

  it("uses touch-safe login fields and returns to the saved mobile route", () => {
    cy.intercept("POST", "**/api/user/getCurrentUser", {
      code: 4001,
      message: "未登录",
      data: null,
    }).as("unauthenticated");
    mockNotifications();
    cy.intercept("POST", "**/api/user/login", {
      code: 200,
      message: "ok",
      data: { user },
    }).as("login");
    cy.viewport(390, 844);
    visitMobile("/mobile/tools/context-lab?task=42#answer");
    cy.wait("@unauthenticated");

    cy.location("pathname").should("eq", "/login");
    cy.get("#mobile-login-username, #mobile-login-password").each(($input) => {
      expect(Number.parseFloat(getComputedStyle($input[0]).fontSize)).to.be.at.least(16);
    });
    cy.get(".mobile-login button").each(($action) => {
      const rect = $action[0].getBoundingClientRect();
      expect(rect.width).to.be.at.least(44);
      expect(rect.height).to.be.at.least(44);
    });

    cy.get("#mobile-login-username").type("mobile-tester");
    cy.get("#mobile-login-password").type("123456");
    cy.get(".mobile-login__submit").click();
    cy.wait("@login");

    cy.location("pathname").should("eq", "/mobile/tools/context-lab");
    cy.location("search").should("eq", "?task=42");
    cy.location("hash").should("eq", "#answer");
    expectMobileShell("工具");
  });
});
