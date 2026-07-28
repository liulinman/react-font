describe("context lab practice scrolling", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 200,
      message: "ok",
      data: {
        id: 1,
        username: "tester",
        avatar: "",
        createTime: "2026-01-01 00:00:00",
        updateTime: "2026-01-01 00:00:00",
      },
    }).as("currentUser");

    cy.intercept("POST", "**/context-lab/history", {
      code: 200,
      message: "ok",
      data: {
        list: [
          {
            id: 37,
            taskId: 37,
            status: "succeeded",
            sourceType: "custom",
            words: ["scroll", "practice"],
            articleExerciseId: 37,
            article: Array.from(
              { length: 12 },
              (_, index) =>
                `Paragraph ${index + 1}. A deliberately long reading passage keeps both practice panes taller than the available viewport.`,
            ).join("\n\n"),
            questions: Array.from({ length: 13 }, (_, index) => ({
              id: `q-${index + 1}`,
              stem: `Question ${index + 1}: choose the correct answer from the passage.`,
              options: ["First option", "Second option", "Third option"],
            })),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    }).as("contextHistory");
  });

  it("keeps each desktop practice pane independently scrollable", () => {
    cy.viewport(1600, 900);
    cy.visit("/englishWorld/context-lab");
    cy.wait("@currentUser");
    cy.wait("@contextHistory");

    cy.contains("button", "开始练习").click();

    cy.get(
      ".context-lab-practice-modal .context-lab-question-pane",
    ).then(($pane) => {
      const pane = $pane[0];
      const paneStyle = getComputedStyle(pane);
      expect(paneStyle.overflowY).to.match(/auto|scroll/);
      expect(paneStyle.scrollbarGutter).to.contain("stable");
      expect(pane.scrollHeight).to.be.greaterThan(pane.clientHeight);

      pane.scrollTop = pane.scrollHeight;
      expect(pane.scrollTop).to.be.greaterThan(0);
    });
  });
});
