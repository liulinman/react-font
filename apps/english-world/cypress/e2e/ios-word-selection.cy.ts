describe("Mobile word selection and filters", () => {
  for (const width of [390, 320]) {
    it(`keeps selection compact and usable at ${width}px`, () => {
      cy.viewport(width, width === 320 ? 568 : 844);
      const words = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1, englishWord: i === 0 ? "algorithm" : `word${i + 1}`,
        englishChinese: "用于验证选择布局的释义", englishLevel: 1,
        englishPhonetic: "/ˈælɡərɪðəm/",
      }));
      cy.intercept({ pathname: "/api/**" }, req => {
        const path = new URL(req.url).pathname;
        let data: unknown = {};
        if (path.endsWith("/user/getCurrentUser")) data = { id: 900009, username: "Selection fixture" };
        if (path.endsWith("/english/filterWordList")) data = { list: words, total: 723, totalPages: 37 };
        if (path.endsWith("/english/findWordList")) {
        req.reply({ statusCode: 404, body: { code: 500, message: "Cannot GET /english/findWordList" } });
        return;
      }
        req.reply({ code: 200, data });
      });
      cy.visit("/mobile/words", { onBeforeLoad(win) {
        Object.assign(win, { CapacitorCustomPlatform: { name: "ios" } });
        win.localStorage.clear();
      }});
      cy.contains("strong", "algorithm").should("be.visible");
      cy.contains("button", /^选择$/).click();
      cy.contains("button", "全选当前页").click();
      cy.get('input[aria-label="选择 algorithm"]').should("be.checked").then(el => {
        expect(el[0].getBoundingClientRect().width).to.be.at.most(24);
        expect(el[0].getBoundingClientRect().height).to.be.at.most(24);
      });
      cy.get(".mobile-word-selection-bar").should("be.visible").then(el => {
        expect(el[0].getBoundingClientRect().height).to.be.lessThan(110);
      });
      cy.contains("strong", "algorithm").click();
      cy.get('input[aria-label="选择 algorithm"]').should("not.be.checked");
      cy.location("pathname").should("eq", "/mobile/words");
      cy.get('input[aria-label="选择 word2"]').should("be.checked");
      cy.get(".mobile-app-shell > main").scrollTo("top");
      cy.screenshot(`word-selection-${width}`);
      cy.contains("button", "使用当前筛选结果").click();
      cy.get('input[aria-label="选择 algorithm"]').should("be.checked");
      cy.contains("button", "开始学习").should("be.disabled");
      cy.contains("summary", /^更多$/).click();
      cy.contains("button", "生成文章练习").should("be.disabled");
      cy.contains("button", "确认批量设置").should("be.visible");
      cy.screenshot(`word-selection-more-${width}`);
      cy.contains("summary", /^更多$/).click();
      cy.contains("button", "取消选择").click();
      cy.contains("button", /^选择$/).click();
      cy.get('input[aria-label="选择 algorithm"]').should("not.be.checked");
      cy.contains("button", "取消选择").click();
      cy.contains("button", /^筛选$/).click();
      cy.contains("button", "应用筛选").should("be.visible");
      cy.contains("summary", "更多筛选条件").click();
      cy.contains("button", "应用筛选").should("be.visible");
      cy.get(".mobile-word-filters__fields").scrollTo("bottom");
      cy.contains("button", "应用筛选").should("be.visible");
      cy.screenshot(`word-filters-${width}`);
      cy.get("body").then(el => expect(el[0].scrollWidth).to.be.at.most(width));
    });
  }
});
