describe("Import original reading materials", () => {
  it("keeps generation fields out of formatting and submits only relevant settings", () => {
    cy.viewport(1280, 720);
    cy.intercept("GET", "**/api/admin/me", {
      code: 200,
      data: { username: "tester" },
    });
    cy.intercept("GET", "**/api/admin/users*", {
      code: 200,
      data: { list: [], total: 0 },
    });
    cy.intercept("GET", "**/api/admin/reading-practices*", {
      code: 200,
      data: { list: [], total: 0 },
    });
    cy.intercept("GET", "**/api/admin/notification*", {
      code: 200,
      data: { list: [], total: 0 },
    });
    cy.intercept("POST", "**/api/admin/reading-practices/imports", (req) => {
      expect(req.body.mode).to.equal("format");
      expect(req.body.config).to.deep.equal({ targetType: "all" });
      req.reply({ code: 200, data: { id: 7, status: "queued" } });
    }).as("import");
    cy.visit("http://127.0.0.1:5176/admin/");
    cy.contains("nav button", "阅读练习").click();
    cy.contains("button", "新建练习").click();
    cy.get(".ant-drawer-body").within(() => {
      cy.get("#config_topic").should("not.exist");
      cy.get("#config_wordCount").should("not.exist");
      cy.get("#config_questionCount").should("not.exist");
      cy.contains("label", "保留文章并生成题目").click();
      cy.get("#config_questionCount").should("be.visible");
      cy.get("#config_wordCount").should("not.exist");
      cy.contains("label", "仅识别并整理格式").click();
      cy.get("#config_questionCount").should("not.exist");
      cy.get("#text").type("Original passage and its original questions.");
    });
    cy.document().should(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.screenshot("import-materials-simple-form", { capture: "viewport" });
    cy.get('.ant-drawer-body').scrollTo('bottom');
    cy.screenshot("import-materials-submit", { capture: "viewport" });
    cy.contains("button", "识别并创建草稿").click();
    cy.wait("@import");
    cy.get(".ant-drawer-body").should("not.exist");
  });
});
