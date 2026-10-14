describe("word library table layout", () => {
  for (const [width, pageSize] of [[1440, 10], [1920, 10], [1440, 50]]) {
    it(`keeps cells aligned and actions contained at ${width}px / ${pageSize} rows`, () => {
      cy.viewport(width, 1000);
      cy.intercept("POST", "/api/user/getCurrentUser", { code: 200, data: { id: 1, username: "tester" } });
      cy.intercept("POST", "/api/config/getAll", { code: 200, data: {} });
      cy.intercept("GET", "/api/notifications*", { code: 200, data: { list: [], count: 0 } });
      cy.intercept("GET", "/api/notifications/unread-count", { code: 200, data: { count: 0 } });
      cy.intercept("POST", "/api/english/filterWordList", {
        code: 200,
        data: {
          list: Array.from({ length: pageSize }, (_, index) => ({
            id: index + 1, englishWord: `attendance${index}`, englishChinese: "出席；参加；出勤",
            englishPhonetic: "/əˈtendəns/", englishPartSpeech: [0], englishType: 0,
            englishLevel: 0, englishNote: "A note about attendance.",
          })), total: pageSize, totalPages: 1,
        },
      }).as("words");
      cy.visit("/englishWorld/words");
      cy.wait("@words");
      if (pageSize === 50) {
        cy.get(".ant-pagination-options-size-changer").click();
        cy.get(".ant-select-item-option").contains("50 / page").click();
        cy.wait("@words");
      }
      cy.document().should((doc) => {
        expect(doc.documentElement.scrollWidth, "page should not overflow horizontally").to.be.at.most(doc.documentElement.clientWidth);
      });
      cy.get(".english-world-main").should(($main) => {
        expect($main[0].scrollWidth, "main should not overflow horizontally").to.be.at.most($main[0].clientWidth);
      });
      cy.get(".ant-table-selection-column").first().should(($cell) => {
        expect($cell[0].getBoundingClientRect().width).to.be.at.least(40);
      });
      cy.get(".word-action-group").first().should(($group) => {
        const cell = $group[0].closest(".ant-table-cell")!.getBoundingClientRect();
        const buttons = $group[0].querySelectorAll("button, a");
        for (const button of buttons) {
          const rect = button.getBoundingClientRect();
          expect(rect.left, "action left edge").to.be.at.least(cell.left);
          expect(rect.right, "action right edge").to.be.at.most(cell.right);
        }
      });
      cy.get(".word-link").first().should(($link) => {
        const cell = $link[0].closest(".ant-table-cell")!.getBoundingClientRect();
        const wordHeader = $link[0].ownerDocument.querySelectorAll(".english-world-table-wrap th")[3].getBoundingClientRect();
        expect(Math.abs(cell.left - wordHeader.left), "header/body alignment").to.be.lessThan(2);
      });
      cy.get('[aria-label="展开 attendance0 的笔记"]').scrollIntoView({ offset: { top: -200, left: 0 } }).click({ scrollBehavior: false });
      if (pageSize === 50) {
        cy.get(".ant-table-tbody-virtual-holder").scrollTo("top", { ensureScrollable: false });
      }
      cy.contains("A note about attendance.").should("be.visible");
      cy.screenshot(`word-library-${width}-${pageSize}`, { capture: "viewport" });
    });
  }
});
