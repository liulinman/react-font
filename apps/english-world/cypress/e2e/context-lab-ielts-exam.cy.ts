describe("Context Lab IELTS exam", () => {
  it("opens from a practice pack, keeps independent panes and restores answers after reload", () => {
    cy.viewport(1440, 900);
    cy.intercept("GET", "**/notifications?*", {
      code: 200,
      data: { list: [], total: 0 },
    });
    cy.intercept("GET", "**/notifications/unread-count", {
      code: 200,
      data: { count: 0 },
    });
    cy.intercept("GET", "**/notifications/events", {
      statusCode: 200,
      headers: { "content-type": "text/event-stream" },
      body: "",
    });
    cy.intercept("GET", "**/context-lab/task-events", {
      statusCode: 200,
      headers: { "content-type": "text/event-stream" },
      body: "",
    });
    cy.intercept("POST", "**/user/getCurrentUser", {
      code: 200,
      data: { id: 1, username: "tester", avatar: "" },
    });
    cy.intercept("POST", "**/context-lab/history", {
      code: 200,
      data: {
        list: [
          {
            id: 37,
            taskId: 37,
            articleExerciseId: 37,
            status: "succeeded",
            sourceType: "custom",
            words: ["inside out", "opinion", "Is the alcohol content high or low?", "allergy", "routine"],
            article:
              "Urban gardens and the future of our cities\n\n" +
              Array.from(
                { length: 12 },
                (_, i) =>
                  `${String.fromCharCode(65 + i)}. Urban farming brings fresh food closer to local communities. Researchers have studied how shared gardens influence social connections and the use of public space. Their findings suggest that successful projects depend on long-term support from residents, rather than simply the availability of land.`,
              ).join("\n\n"),
            questions: Array.from({ length: 13 }, (_, i) => ({
              id: `q${i + 1}`,
              stem: `According to the passage, which factor contributes to the success of urban gardens? (Question ${i + 1})`,
              options: [
                "Support from local residents",
                "The size of the city",
                "The number of visitors",
                "Access to private transport",
              ],
            })),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    }).as("history");
    cy.intercept("POST", "**/context-lab/submit", (req) => {
      expect(req.body.answers).to.deep.equal([
        { questionId: "q1", selectedIndex: 0 },
      ]);
      req.reply({
        code: 200,
        data: {
          score: 8,
          correctCount: 1,
          wrongCount: 12,
          weakWords: [],
          nextSuggestions: [],
          results: [
            {
              questionId: "q1",
              correct: true,
              correctIndex: 0,
              userSelectedIndex: 0,
              explanation: "The passage identifies support from residents.",
            },
          ],
        },
      });
    }).as("submit");
    cy.visit("/englishWorld/context-lab");
    cy.wait("@history");
    for (const width of [1920, 1440, 1280, 900, 390]) {
      cy.viewport(width, 900);
      cy.get('.context-lab-history-actions').first().should($actions => {
        const actions = $actions[0];
        const buttons = Array.from(actions.querySelectorAll('button'));
        const practice = buttons.find(button => button.textContent?.includes('开始练习'))!;
        const exam = buttons.find(button => button.textContent?.includes('雅思机考'))!;
        const practiceRect = practice.getBoundingClientRect();
        const examRect = exam.getBoundingClientRect();
        expect(getComputedStyle(exam).fontSize, 'matching action typography').to.equal(getComputedStyle(practice).fontSize);
        expect(examRect.height, 'matching action height').to.equal(practiceRect.height);
        expect(examRect.left - practiceRect.right, 'space between actions').to.be.at.least(7);
        for (const button of buttons) {
          const rect = button.getBoundingClientRect();
          const card = actions.closest('.context-lab-history-item')!.getBoundingClientRect();
          expect(rect.right, 'button inside card').to.be.at.most(card.right);
          expect(rect.bottom, 'button inside card').to.be.at.most(card.bottom);
          expect(button.scrollWidth, 'button content fits').to.be.at.most(button.clientWidth);
          const label = button.querySelector('span:last-child');
          if (label) {
            const labelRect = label.getBoundingClientRect();
            expect(labelRect.left - rect.left, 'left label padding').to.be.at.least(6);
            expect(rect.right - labelRect.right, 'right label padding').to.be.at.least(6);
          }
        }
      });
    }
    cy.viewport(1280, 720);
    cy.screenshot('ielts-practice-card-actions', { capture: 'viewport', scale: true });
    cy.viewport(1440, 900);
    cy.contains("button", "雅思机考").click();
    cy.contains("button", "开始考试").click();
    cy.get(".ielts-exam-question")
      .first()
      .find("input[type=radio]")
      .first()
      .check();
    cy.get(".ielts-exam-question").first().find("input[type=checkbox]").check();
    cy.get(".ielts-exam-passage, .ielts-exam-questions").each(($pane) => {
      expect($pane[0].scrollHeight).greaterThan($pane[0].clientHeight);
      expect(getComputedStyle($pane[0]).overflowY).eq("auto");
    });
    cy.get('[aria-label="第 13 题，未答"]').click();
    cy.get('[aria-label="第 13 题，未答"]').should(
      "have.attr",
      "aria-current",
      "step",
    );
    cy.get('[aria-label="第 1 题，已答，待检查"]').click();
    cy.get('.ielts-exam').then($exam => {
      const rect = $exam[0].getBoundingClientRect();
      expect(rect.width).to.be.at.most(1440);
      expect($exam[0].scrollWidth).to.be.at.most($exam[0].clientWidth);
      expect(rect.height).to.be.at.most(900);
    });
    cy.get('.ielts-exam-header button').should('be.visible');
    cy.get('.ielts-exam-questions').scrollTo('top');
    cy.viewport(1280, 720);
    cy.get('.ielts-exam').should($exam => {
      expect($exam[0].scrollWidth).to.be.at.most(1280);
    });
    cy.screenshot("ielts-exam-desktop", { capture: "viewport", scale: true });
    cy.viewport(390, 844);
    cy.get('.ielts-exam').should($exam => {
      expect($exam[0].scrollWidth).to.be.at.most(390);
    });
    cy.viewport(1440, 900);
    cy.contains("button", "退出考试界面").click();
    cy.contains("button", "保存并退出").click();
    cy.reload();
    cy.wait("@history");
    cy.contains("button", "雅思机考").click();
    cy.get(".ielts-exam-question")
      .first()
      .find("input[type=radio]")
      .first()
      .should("be.checked");
    cy.get('[aria-label="第 1 题，已答，待检查"]').should("exist");
    cy.contains("button", /^交卷$/).click();
    cy.contains("12 道题未作答").should("be.visible");
    cy.contains("button", "确认交卷").click();
    cy.wait("@submit");
    cy.contains("考试已完成").should("be.visible");
    cy.get(".ielts-exam-question")
      .first()
      .find("input[type=radio]")
      .first()
      .should("be.disabled");
  });
});
