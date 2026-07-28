const user = {
  id: 1,
  username: "mobile-tester",
  avatar: "",
  createTime: "2026-01-01 00:00:00",
  updateTime: "2026-01-01 00:00:00",
};

const mockMobileApis = () => {
  cy.intercept("POST", "/api/user/getCurrentUser", {
    code: 200,
    message: "ok",
    data: user,
  }).as("currentUser");
  cy.intercept("POST", "/api/english/filterWordList", {
    code: 200,
    message: "ok",
    data: { list: [], total: 0, totalPages: 0 },
  }).as("wordFilter");
  cy.intercept("POST", "/api/english/englishStats", {
    code: 200,
    message: "ok",
    data: {
      levelCount: 0,
      totalCount: 0,
      percentage: 0,
      dailyStats: [],
      partSpeechStatisticalClass: {},
    },
  }).as("englishStats");
  cy.intercept("POST", "**/context-lab/history", {
    code: 200,
    message: "ok",
    data: { list: [], total: 0, page: 1, pageSize: 10 },
  }).as("contextHistory");
};

const expectNoPageOverflow = () => {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth,
    );
  });
};

describe("english world mobile responsive shell", () => {
  beforeEach(mockMobileApis);

  [390, 320].forEach((width) => {
    it(`keeps primary navigation usable at ${width}px`, () => {
      cy.viewport(width, width === 320 ? 568 : 844);
      cy.visit("/englishWorldMobile");
      cy.wait("@currentUser");

      cy.get(".mobile-bottom-nav").should("be.visible");
      cy.contains('[role="tab"]', "词库").click();
      cy.get(".adm-nav-bar-title").should("have.text", "词库");
      cy.get(".mobile-bottom-nav .adm-tab-bar-item").each(($tab) => {
        const rect = $tab[0].getBoundingClientRect();
        expect(rect.height).to.be.at.least(44);
        expect(rect.width).to.be.at.least(44);
      });
      expectNoPageOverflow();
    });
  });
});
