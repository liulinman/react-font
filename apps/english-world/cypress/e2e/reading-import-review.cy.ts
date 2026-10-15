// Production frontend builds, real isolated Nest + MySQL. External AI alone is fixture-backed.
describe("Reading material import, review and correction", () => {
  it("teacher imports/reviews/publishes; students give feedback and receive consistent regrading", () => {
    const title = `Reading import acceptance ${Date.now()}`;
    cy.viewport(1280, 720);
    cy.request("POST", "/api/admin/login", {
      username: "automation_admin",
      password: "AutomationAdmin123!",
    });
    cy.visit("/admin/");
    cy.contains("nav button", "阅读练习").click();
    cy.contains("button", "新建练习").click();
    cy.contains("导入已有材料").click();
    cy.get('[id="title"]').filter(":visible").type(title);
    cy.get('[id="text"]')
      .filter(":visible")
      .type(
        "The first course offered 12 places. The second course offered 16 places. The garden opens on Monday.",
      );
    cy.contains("button", "识别并创建草稿").click();
    cy.contains("tr", title, { timeout: 30000 })
      .should("contain", "待审核")
      .within(() => cy.contains("button", "审核练习").click());
    cy.get('article[aria-label="阅读文章"]').should("contain", title);
    cy.get('input[aria-label="练习标题"]').should("not.exist");
    cy.contains("上传原稿").should("not.exist");
    cy.get(".ant-drawer-content-wrapper").should(
      "have.css",
      "transform",
      "none",
    );
    cy.get("body").then(($el) =>
      expect($el[0].scrollWidth).to.be.at.most(1280),
    );
    cy.screenshot("reading-review-readable-article", {
      capture: "viewport",
      scale: true,
    });
    cy.contains("button", "学生视角预览").click();
    cy.get(".ant-modal-content")
      .should("contain", "How many places")
      .and("not.contain", "原文明确第一期");
    cy.contains("button", "返回审核").click();
    cy.contains("button", "下一步：核对题目").click();
    cy.contains("button", "检查题目").click();
    cy.get(".ant-tabs-tabpane-active input[type=checkbox]").each(($el) =>
      cy.wrap($el).check(),
    );
    cy.get(".reading-workbench-question").should("have.length", 3);
    cy.screenshot("reading-review-question-cards", {
      capture: "viewport",
      scale: true,
    });
    cy.viewport(390, 844);
    cy.get(".reading-workbench .ant-drawer-body").then(($el) =>
      expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth),
    );
    cy.screenshot("reading-review-mobile-questions", {
      capture: "viewport",
      scale: true,
    });
    cy.viewport(1440, 1000);
    cy.contains("button", "完成核对").should("be.enabled").click();
    cy.contains("核对完成，可以发布给学生。").should("be.visible");
    cy.contains("button", "发布给学生").click();
    cy.get(".ant-modal-confirm .ant-btn-primary").click();
    cy.contains("button", "创建内容修订版").should("be.visible");
    cy.get(".ant-drawer-footer")
      .contains("button", /^关\s*闭$/)
      .click();
    cy.request("POST", "/api/user/login", {
      username: "automation_learner",
      password: "Automation123!",
    });
    cy.request("/api/reading-practices").then(({ body }) => {
      const id = body.data.list.find((p: any) => p.title === title).id;
      cy.visit(`/englishWorld/reading-practices/${id}`);
      cy.contains("button", "开始作答").click();
      cy.get(".rp-questions fieldset").each(($el, i) =>
        cy
          .wrap($el)
          .find("input[type=radio]")
          .eq(i === 2 ? 2 : 0)
          .check(),
      );
      cy.contains("button", "反馈题目问题").first().click();
      cy.get(".rp-feedback textarea").first().type("请老师核实第一题答案");
      cy.contains("button", "提交反馈").click();
      cy.contains("待处理").should("be.visible");
      cy.get("input[type=radio]:checked").should("have.length", 3);
      cy.contains("button", "提交答案").click();
      cy.contains("练习已完成", { timeout: 10000 }).should("be.visible");
      cy.get(".rp-score strong").should("have.text", "100");
      cy.screenshot("reading-import-student-result");
      cy.request("POST", "/api/user/logout", {});
      cy.request("POST", "/api/user/login", {
        username: "automation_other",
        password: "Automation123!",
      });
      cy.viewport(390, 844);
      cy.visit(`/mobile/reading-practices/${id}`);
      cy.contains("button", "开始作答").click();
      cy.contains("button", "答题").click();
      cy.get(".rp-questions fieldset").each(($el) =>
        cy.wrap($el).find("input[type=radio]").eq(1).check(),
      );
      cy.contains("button", "提交答案").click();
      cy.contains("练习已完成").should("be.visible");
      cy.get(".rp-score strong").should("have.text", "0");
      cy.viewport(1280, 720);
      cy.visit("/admin/");
      cy.contains("nav button", "阅读练习").click();
      cy.contains("button", title).click();
      cy.contains("[role=tab]", "反馈与纠错").click();
      cy.contains("请老师核实第一题答案").should("be.visible");
      // Void the first question through the teacher workbench; all student results must update.
      cy.contains("更正评分答案").click();
      cy.get(".ant-select-dropdown").contains("作废题目").click();
      cy.get('textarea[placeholder="处理原因（必须）"]').type(
        "题意有歧义，本题作废，不计入能力判断",
      );
      cy.contains("button", "预览影响范围").click();
      cy.contains("将重新计算 2 份").should("be.visible");
      cy.contains("button", "确认纠错并重评").click();
      cy.contains("summary", "版本与难度").click();
      cy.contains("评分修订 1").should("be.visible");
      cy.screenshot("reading-import-teacher-correction");
      cy.request(`/api/reading-practices/${id}/result`).then(({ body }) => {
        expect(body.data.total).to.eq(2);
        expect(body.data.correctCount).to.eq(0);
        expect(body.data.originalResult.total).to.eq(3);
      });
      cy.request("POST", "/api/user/logout", {});
      cy.request("POST", "/api/user/login", {
        username: "automation_learner",
        password: "Automation123!",
      });
      cy.request(`/api/reading-practices/${id}/result`).then(({ body }) => {
        expect(body.data.total).to.eq(2);
        expect(body.data.correctCount).to.eq(2);
        expect(body.data.originalResult.total).to.eq(3);
      });
      cy.viewport(390, 844);
      cy.visit(`/mobile/reading-practices/${id}`);
      cy.contains("题意有歧义，本题作废").should("exist");
      cy.get("body").then(($body) =>
        expect($body[0].scrollWidth).to.be.at.most(390),
      );
      cy.screenshot("reading-import-mobile-adjustment");
    });
  });
});
