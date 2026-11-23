describe("word library dictionary layout", () => {
  for (const [width, pageSize] of [[1440, 10], [1920, 10], [1440, 50]]) {
    it(`keeps entries readable and actions contained at ${width}px / ${pageSize} rows`, () => {
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
      cy.get('.word-dictionary').should('be.visible');
      cy.get('.word-dictionary table').should('not.exist');
      cy.get('.word-dictionary-index input[type=checkbox]').should('have.length',pageSize+1);
      cy.get('.word-dictionary-head button').each($button=>{const parent=$button[0].closest('.word-dictionary-detail')!.getBoundingClientRect();const rect=$button[0].getBoundingClientRect();expect(rect.right).lte(parent.right);});
      cy.contains("A note about attendance.").should("be.visible");
      cy.screenshot(`word-library-${width}-${pageSize}`, { capture: "viewport" });
    });
  }
});
