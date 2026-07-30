const mixedTask = {
  id: 66,
  taskId: 66,
  status: "succeeded",
  sourceType: "pasted-article",
  questionContractVersion: 2,
  words: ["solar", "emissions"],
  articleExerciseId: 166,
  article: `Solar Neighbourhoods

In many European cities, apartment residents have traditionally had little control over the source of their electricity. A family living on the sixth floor cannot simply attach a private turbine to the roof, and tenants may be reluctant to invest in equipment fixed to a building they do not own. Over the past decade, however, a different model has emerged. Local energy cooperatives allow hundreds of households to purchase a share of a common solar installation and receive credit for the power it produces.

One widely studied scheme began in the fictional coastal district of Mereton, where an abandoned tram depot offered a broad, unshaded roof. The council leased the site to a resident-owned cooperative for twenty years. Members paid a modest joining fee, while a public bank supplied the remaining construction loan. Engineers installed solar panels above the old maintenance halls without altering the protected brick facade. The arrangement produced clean electricity close to where it was used and returned any annual surplus to neighbourhood projects.

The cooperative did not promise that every member would receive electricity directly from a particular panel. Instead, smart meters recorded how much energy the installation sent to the local grid each hour. The same quantity was then divided among members according to the size of their shares and deducted from their bills. This accounting method mattered during cloudy weeks, when production fell, and during bright summer afternoons, when the depot generated more power than nearby homes could immediately consume.

Researchers followed the project for four years. They found that participating households used slightly less electricity even though no rule required them to do so. Interviews suggested that the monthly production reports made energy visible: residents began to run washing machines in daylight, replace inefficient appliances, and discuss consumption with neighbours. The panels also lowered household emissions because the regional grid still relied on gas-fired power stations during periods of high demand. Savings were greatest for members who shifted routine tasks away from the evening peak.

Not every effect was positive. Early meetings were dominated by homeowners with technical experience, while renters and residents who spoke limited English rarely attended. The cooperative responded by translating summaries, rotating meeting times, and reserving small shares that could be purchased in instalments. It also created an independent hardship fund rather than suspending members who missed a payment. Participation became broader, although researchers cautioned that such measures required paid administration and could not depend indefinitely on volunteers.

The physical system presented its own constraints. Salt carried inland by winter storms gradually reduced the efficiency of exposed modules, so the maintenance team introduced a freshwater cleaning schedule. Gulls occasionally damaged cable coverings, and one inverter failed during a heatwave. None of these incidents stopped production for more than two days, but they changed the financial forecast. The cooperative increased its repair reserve and published both expected and actual output, helping members understand why a solar project should be judged across seasons rather than by a single month.

Mereton's experience has attracted attention from other councils, yet specialists warn against treating it as a universal template. A suitable roof, a supportive grid operator, affordable credit, and patient organisers were all essential. Dense districts with shaded buildings may need to share a solar farm outside the city instead. Even so, the experiment demonstrates that residents without private roofs can take part in renewable generation. Its strongest lesson may be institutional rather than technological: durable clean-energy projects depend on transparent rules, inclusive decisions, and realistic maintenance plans.`,
  targetQuestionCount: 13,
  generationWarnings: ["QUESTION_COUNT"],
  groups: [
    {
      groupId: "choice",
      title: "Multiple Choice",
      instruction: "Choose one answer.",
      questionIds: ["q1"],
      startNumber: 1,
      endNumber: 1,
    },
    {
      groupId: "tfng",
      title: "True / False / Not Given",
      instruction: "Choose True, False, or Not Given.",
      questionIds: ["q2"],
      startNumber: 2,
      endNumber: 2,
    },
    {
      groupId: "completion",
      title: "Completion",
      instruction:
        "Complete each answer using NO MORE THAN TWO WORDS from the passage.",
      questionIds: ["q3"],
      startNumber: 3,
      endNumber: 3,
      wordLimit: 2,
    },
    {
      groupId: "short-answer",
      title: "Short Answer",
      instruction:
        "Answer each question using NO MORE THAN TWO WORDS from the passage.",
      questionIds: ["q4"],
      startNumber: 4,
      endNumber: 4,
      wordLimit: 2,
    },
  ],
  questions: [
    {
      id: "q1",
      groupId: "choice",
      stem: "Which technology was installed above the tram depot?",
      questionType: "detail",
      responseType: "single_choice",
      options: [
        "Wind turbines",
        "Solar panels",
        "Hydropower",
        "Geothermal",
      ],
    },
    {
      id: "q2",
      groupId: "tfng",
      stem: "The panels lowered household emissions.",
      questionType: "true_false_not_given",
      responseType: "true_false_not_given",
      options: ["True", "False", "Not Given"],
    },
    {
      id: "q3",
      groupId: "completion",
      stem: "Residents bought shares in a local energy ____.",
      questionType: "summary_completion",
      responseType: "text_completion",
      wordLimit: 2,
      options: [],
    },
    {
      id: "q4",
      groupId: "short-answer",
      stem: "What did the panels lower for participating households?",
      questionType: "short_answer",
      responseType: "short_answer",
      wordLimit: 2,
      options: [],
    },
  ],
};

const overLimitAnswer = "community solar panels";

const mixedSubmitResult = {
  attemptId: 606,
  score: 25,
  correctCount: 1,
  wrongCount: 2,
  weakWords: ["emissions"],
  nextSuggestions: ["Review exact phrases and answer limits."],
  results: [
    {
      questionId: "q1",
      responseType: "single_choice",
      correct: true,
      status: "correct",
      userAnswer: { selectedIndex: 1 },
      correctAnswer: { correctIndex: 1 },
      explanation: "The passage discusses solar panels.",
    },
    {
      questionId: "q2",
      responseType: "true_false_not_given",
      correct: false,
      status: "incorrect",
      userAnswer: { selectedValue: "False" },
      correctAnswer: { correctValue: "True" },
      explanation:
        "The passage states that the panels lowered household emissions.",
    },
    {
      questionId: "q3",
      responseType: "text_completion",
      correct: false,
      status: "incorrect",
      reasonCode: "word_limit_exceeded",
      userAnswer: { text: overLimitAnswer },
      correctAnswer: { acceptedAnswers: ["solar energy"] },
      explanation: "The fixture deliberately exercises the word-limit result.",
    },
    {
      questionId: "q4",
      responseType: "short_answer",
      correct: false,
      status: "unanswered",
      userAnswer: null,
      correctAnswer: { acceptedAnswers: ["household emissions"] },
      explanation: "The question was left unanswered.",
    },
  ],
};

const mixedAttempt = {
  id: 606,
  attemptId: 606,
  taskId: 66,
  articleExerciseId: 166,
  score: mixedSubmitResult.score,
  correctCount: mixedSubmitResult.correctCount,
  wrongCount: mixedSubmitResult.wrongCount,
  weakWords: mixedSubmitResult.weakWords,
  nextSuggestions: mixedSubmitResult.nextSuggestions,
  answers: [
    { questionId: "q1", responseType: "single_choice", selectedIndex: 1 },
    {
      questionId: "q2",
      responseType: "true_false_not_given",
      selectedValue: "False",
    },
    {
      questionId: "q3",
      responseType: "text_completion",
      text: overLimitAnswer,
    },
  ],
  results: mixedSubmitResult.results,
  elapsedSeconds: 87,
  createTime: "2026-07-30T12:00:00.000Z",
};

const viewports = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

function expectNoPageOverflow() {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth,
    );
  });
}

function isNearIdentityTransform(transform: string) {
  if (transform === "none") return true;

  const match = transform.match(/^matrix(3d)?\(([^)]+)\)$/);
  if (!match) return false;

  const values = match[2].split(",").map((value) => Number(value.trim()));
  const expected = match[1]
    ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    : [1, 0, 0, 1, 0, 0];

  return (
    values.length === expected.length &&
    values.every(
      (value, index) => Math.abs(value - expected[index]) <= 0.01,
    )
  );
}

function openMixedPractice() {
  cy.contains("button", "开始练习").click();
  cy.get(".context-lab-practice-modal")
    .should("be.visible")
    .and(($modal) => {
      const modal = $modal[0];
      expect(modal.getBoundingClientRect().width / modal.offsetWidth).to.be.at
        .least(0.99);
    });
}

function expectPracticeModalReady() {
  cy.get(".context-lab-practice-modal.ant-modal")
    .should("be.visible")
    .and(($modal) => {
      const style = getComputedStyle($modal[0]);
      const animationNames = style.animationName
        .split(",")
        .map((name) => name.trim());
      const animationIsInactive = animationNames.every(
        (name) => name === "none",
      );
      const transformIsStable = isNearIdentityTransform(style.transform);

      expect(Number.parseFloat(style.opacity)).to.be.closeTo(1, 0.001);
      expect(
        animationIsInactive || transformIsStable,
        `animation=${style.animationName}, transform=${style.transform}`,
      ).to.equal(true);
    });

  cy.get(".context-lab-practice-modal .ant-modal-content")
    .should("be.visible")
    .and(($content) => {
      const content = $content[0];
      const viewport = content.ownerDocument.defaultView;
      const rect = content.getBoundingClientRect();
      const style = getComputedStyle(content);

      expect(viewport).not.to.equal(null);
      expect(rect.width).to.be.greaterThan(0);
      expect(rect.height).to.be.greaterThan(0);
      expect(rect.left).to.be.at.least(0);
      expect(rect.top).to.be.at.least(0);
      expect(rect.right).to.be.at.most(viewport?.innerWidth ?? 0);
      expect(rect.bottom).to.be.at.most(viewport?.innerHeight ?? 0);
      expect(style.opacity).to.equal("1");
      expect(rect.width / content.offsetWidth).to.be.within(0.99, 1.01);
      expect(rect.height / content.offsetHeight).to.be.within(0.99, 1.01);
    });
}

function alignPracticeModalForScreenshot() {
  cy.get(".context-lab-practice-modal")
    .then(($modal) => {
      const modal = $modal[0];
      modal.dataset.cypressScreenshotMarginInline = modal.style.marginInline;
      modal.dataset.cypressScreenshotLeft = modal.style.left;
      modal.style.marginInline = "0";
      const content = modal.querySelector<HTMLElement>(".ant-modal-content");
      if (!content) throw new Error("Practice modal content is unavailable");
      modal.style.left = `${-content.getBoundingClientRect().left}px`;
    })
    .should(($modal) => {
      const content =
        $modal[0].querySelector<HTMLElement>(".ant-modal-content");
      expect(content).not.to.equal(null);
      expect(content?.getBoundingClientRect().left ?? -1).to.be.within(-0.5, 0.5);
    });
}

function restorePracticeModalAfterScreenshot() {
  cy.get(".context-lab-practice-modal").then(($modal) => {
    const modal = $modal[0];
    modal.style.marginInline =
      modal.dataset.cypressScreenshotMarginInline ?? "";
    modal.style.left = modal.dataset.cypressScreenshotLeft ?? "";
    delete modal.dataset.cypressScreenshotMarginInline;
    delete modal.dataset.cypressScreenshotLeft;
  });
  expectPracticeModalReady();
}

function focusQuestionPaneForScreenshot(questionText: string) {
  cy.contains(".context-lab-question-card", questionText)
    .then(($card) => {
      const card = $card[0];
      const pane = card.closest<HTMLElement>(".context-lab-question-pane");
      const list = card.closest<HTMLElement>(".context-lab-question-list");
      if (!pane || !list) throw new Error("Question pane is unavailable");

      pane.dataset.cypressScreenshotScrollTop = String(pane.scrollTop);
      list.dataset.cypressScreenshotPaddingBottom = list.style.paddingBottom;
      list.style.paddingBottom = "600px";

      const paneRect = pane.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      pane.scrollTop += cardRect.top - paneRect.top - 80;
    })
    .should(($card) => {
      const card = $card[0];
      const pane = card.closest<HTMLElement>(".context-lab-question-pane");
      if (!pane) throw new Error("Question pane is unavailable");
      const offset =
        card.getBoundingClientRect().top - pane.getBoundingClientRect().top;
      expect(offset).to.be.within(78, 83);
    });
}

function restoreQuestionPaneAfterScreenshot() {
  cy.get(".context-lab-question-pane").then(($pane) => {
    const pane = $pane[0];
    const list = pane.querySelector<HTMLElement>(".context-lab-question-list");
    if (!list) throw new Error("Question list is unavailable");
    list.style.paddingBottom =
      list.dataset.cypressScreenshotPaddingBottom ?? "";
    pane.scrollTop = Number(pane.dataset.cypressScreenshotScrollTop ?? 0);
    delete list.dataset.cypressScreenshotPaddingBottom;
    delete pane.dataset.cypressScreenshotScrollTop;
  });
}

function expectVerticalSeparation(elements: HTMLElement[], minimumGap: number) {
  elements.slice(1).forEach((element, index) => {
    const previousRect = elements[index].getBoundingClientRect();
    const currentRect = element.getBoundingClientRect();
    expect(currentRect.top - previousRect.bottom).to.be.at.least(minimumGap);
  });
}

function expectQuestionCardsSeparated() {
  cy.get(".context-lab-question-card")
    .should("have.length", 4)
    .then(($cards) => {
      const cards = [...$cards] as HTMLElement[];
      expectVerticalSeparation(cards, 8);
      cards.forEach((card) => {
        const style = getComputedStyle(card);
        expect(Number.parseFloat(style.borderTopWidth)).to.be.at.least(1);
      });
    });
}

function expectReadableMixedLayout() {
  cy.get(".context-lab-reading-pane").then(($pane) => {
    const pane = $pane[0];
    expect(pane.scrollWidth).to.be.at.most(pane.clientWidth);
    expect(pane.scrollHeight).to.be.greaterThan(pane.clientHeight);
  });

  cy.get(".context-lab-article-paragraph")
    .should("have.length", 7)
    .then(($paragraphs) => {
      const paragraphs = [...$paragraphs] as HTMLElement[];
      expectVerticalSeparation(paragraphs, 4);
      paragraphs.forEach((paragraph, index) => {
        const style = getComputedStyle(paragraph);
        const fontSize = Number.parseFloat(style.fontSize);
        const lineHeight = Number.parseFloat(style.lineHeight);
        expect(lineHeight).to.be.at.least(fontSize * 1.45);
        if (index < paragraphs.length - 1) {
          expect(Number.parseFloat(style.marginBottom)).to.be.at.least(8);
        }
        expect(paragraph.getBoundingClientRect().width).to.be.greaterThan(240);
      });
    });

  cy.get(".context-lab-question-group-heading")
    .should("have.length", 4)
    .each(($heading) => {
      const style = getComputedStyle($heading[0]);
      expect(Number.parseFloat(style.borderBottomWidth)).to.be.at.least(1);
      cy.wrap($heading).find("p").should("not.be.empty");
    });

  expectQuestionCardsSeparated();

  cy.get(".context-lab-question-card > p")
    .should("have.length", 4)
    .each(($stem) => {
      const style = getComputedStyle($stem[0]);
      expect(Number.parseFloat(style.lineHeight)).to.be.at.least(
        Number.parseFloat(style.fontSize) * 1.4,
      );
    });

  [0, 1].forEach((questionIndex) => {
    cy.get(".context-lab-question-card")
      .eq(questionIndex)
      .find(".ant-radio-wrapper")
      .then(($labels) => {
        const labels = [...$labels] as HTMLElement[];
        expect(labels.length).to.be.greaterThan(2);
        labels.forEach((label) => {
          expect(label.tagName).to.equal("LABEL");
          expect(label.getBoundingClientRect().height).to.be.greaterThan(18);
        });
        expectVerticalSeparation(labels, 4);
      });
  });

  cy.get(".context-lab-question-field > input")
    .should("have.length", 2)
    .each(($input) => {
      const input = $input[0];
      const field = input.closest<HTMLElement>(
        ".context-lab-question-field",
      );
      const card = input.closest<HTMLElement>(".context-lab-question-card");
      const previous = field?.previousElementSibling as HTMLElement | null;
      if (!field || !card || !previous) {
        throw new Error("Question input geometry is unavailable");
      }

      const inputRect = input.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const previousRect = previous.getBoundingClientRect();

      expect(inputRect.height).to.be.at.least(32);
      expect(inputRect.left).to.be.at.least(cardRect.left);
      expect(inputRect.right).to.be.at.most(cardRect.right);
      expect(inputRect.top).to.be.at.least(fieldRect.top);
      expect(inputRect.bottom).to.be.at.most(fieldRect.bottom);
      expect(inputRect.top).to.be.at.least(cardRect.top);
      expect(inputRect.bottom).to.be.at.most(cardRect.bottom);
      expect(inputRect.top - previousRect.bottom).to.be.at.least(4);
      expect(cardRect.bottom - inputRect.bottom).to.be.at.least(8);
    });
}

function expectSeparatedResults() {
  expectQuestionCardsSeparated();

  cy.get(".context-lab-field-result")
    .should("have.length", 4)
    .each(($result) => {
      const result = $result[0];
      const field = result.closest<HTMLElement>(
        ".context-lab-question-field",
      );
      const card = result.closest<HTMLElement>(".context-lab-question-card");
      const previous = result.previousElementSibling as HTMLElement | null;
      if (!field || !card || !previous) {
        throw new Error("Question result geometry is unavailable");
      }

      const style = getComputedStyle(result);
      const resultRect = result.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const previousRect = previous.getBoundingClientRect();
      const children = [...result.children] as HTMLElement[];

      expect(style.display).to.equal("grid");
      expect(Number.parseFloat(style.rowGap)).to.be.at.least(4);
      expect(Number.parseFloat(style.borderTopWidth)).to.be.at.least(1);
      expect(resultRect.top).to.be.at.least(fieldRect.top);
      expect(resultRect.bottom).to.be.at.most(fieldRect.bottom);
      expect(resultRect.top).to.be.at.least(cardRect.top);
      expect(resultRect.bottom).to.be.at.most(cardRect.bottom);
      expect(resultRect.top - previousRect.bottom).to.be.at.least(8);
      expect(cardRect.bottom - resultRect.bottom).to.be.at.least(8);
      expectVerticalSeparation(children, 0);
      children.forEach((child) => {
        const childRect = child.getBoundingClientRect();
        expect(childRect.height).to.be.greaterThan(0);
        expect(childRect.top).to.be.at.least(resultRect.top);
        expect(childRect.bottom).to.be.at.most(resultRect.bottom);
        expect(childRect.top).to.be.at.least(cardRect.top);
        expect(childRect.bottom).to.be.at.most(cardRect.bottom);
      });

      expect(
        children.filter((child) =>
          child.classList.contains("context-lab-field-result-status"),
        ),
      ).to.have.length(1);
      expect(
        children.filter((child) =>
          child.textContent?.trim().startsWith("你的答案："),
        ),
      ).to.have.length(1);
      expect(
        children.filter((child) =>
          child.textContent?.trim().startsWith("正确答案："),
        ),
      ).to.have.length(1);
      expect(
        children.filter((child) =>
          child.classList.contains("context-lab-question-explanation"),
        ),
      ).to.have.length(1);
      cy.wrap($result).contains("你的答案：").should("exist");
      cy.wrap($result).contains("正确答案：").should("exist");
    });

  cy.get(".context-lab-field-result-reason").should("have.length", 1);
}

describe("context lab mixed IELTS question types", () => {
  beforeEach(() => {
    let submitted = false;

    cy.intercept("POST", "**/user/getCurrentUser", {
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

    cy.intercept("GET", "**/notifications?*", {
      code: 200,
      message: "ok",
      data: { list: [], nextCursor: null },
    });
    cy.intercept("GET", "**/notifications/unread-count", {
      code: 200,
      message: "ok",
      data: { count: 0 },
    });

    cy.intercept("GET", "**/context-lab/task-events?*", (request) => {
      expect(request.url).to.contain("questionContractVersion=2");
      request.reply({
        statusCode: 200,
        headers: { "content-type": "text/event-stream" },
        body: 'data: {"type":"connected"}\n\n',
      });
    }).as("taskEvents");

    cy.intercept("POST", "**/context-lab/history", (request) => {
      expect(request.body.questionContractVersion).to.equal(2);
      request.reply({
        code: 200,
        message: "ok",
        data: {
          list: [
            {
              ...mixedTask,
              ...(submitted
                ? {
                    attemptCount: 1,
                    latestAttemptId: 606,
                    latestScore: mixedSubmitResult.score,
                    latestWrongCount: mixedSubmitResult.wrongCount,
                    latestAttemptTime: mixedAttempt.createTime,
                  }
                : {}),
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      });
    }).as("contextHistory");

    cy.intercept("POST", "**/context-lab/submit", (request) => {
      expect(request.body.answers).to.deep.equal([
        { questionId: "q1", responseType: "single_choice", selectedIndex: 1 },
        {
          questionId: "q2",
          responseType: "true_false_not_given",
          selectedValue: "False",
        },
        {
          questionId: "q3",
          responseType: "text_completion",
          text: overLimitAnswer,
        },
      ]);
      submitted = true;
      request.reply({ code: 200, message: "ok", data: mixedSubmitResult });
    }).as("mixedSubmit");

    cy.intercept("POST", "**/context-lab/attempt-history", (request) => {
      expect(request.body).to.deep.equal({
        taskId: 66,
        page: 1,
        pageSize: 20,
      });
      request.reply({
        code: 200,
        message: "ok",
        data: {
          list: [mixedAttempt],
          total: 1,
          page: 1,
          pageSize: 20,
        },
      });
    }).as("attemptHistory");

    cy.intercept("POST", "**/context-lab/attempt-detail", (request) => {
      expect(request.body).to.deep.equal({ attemptId: 606 });
      request.reply({ code: 200, message: "ok", data: mixedAttempt });
    }).as("attemptDetail");
  });

  viewports.forEach(({ width, height }) => {
    it(`accepts mixed practice at ${width}x${height}`, () => {
      cy.viewport(width, height);
      cy.visit("/englishWorld/context-lab");
      cy.wait("@currentUser");
      cy.wait("@contextHistory");
      cy.wait("@taskEvents");
      expectNoPageOverflow();

      openMixedPractice();
      expectNoPageOverflow();
      expectPracticeModalReady();

      cy.get(".context-lab-generation-warning")
        .should("be.visible")
        .and("contain.text", "本套可练习 4/13 题");
      cy.contains(
        ".context-lab-question-group-heading",
        "Question 3 | Maximum 2 words",
      ).should("exist");
      expectReadableMixedLayout();

      cy.get(".context-lab-reading-pane").scrollTo("top");
      cy.get(".context-lab-question-pane").scrollTo("top");
      expectPracticeModalReady();
      alignPracticeModalForScreenshot();
      cy.screenshot(`context-lab-mixed-${width}x${height}-viewport`, {
        capture: "viewport",
        disableTimersAndAnimations: false,
        overwrite: true,
      });
      restorePracticeModalAfterScreenshot();

      focusQuestionPaneForScreenshot(
        "The panels lowered household emissions.",
      );
      alignPracticeModalForScreenshot();
      cy.get(".context-lab-practice-modal .ant-modal-content").screenshot(
        `context-lab-mixed-${width}x${height}-practice-choices`,
        { disableTimersAndAnimations: false, overwrite: true },
      );
      restorePracticeModalAfterScreenshot();
      restoreQuestionPaneAfterScreenshot();

      cy.contains(
        ".context-lab-question-card",
        "The panels lowered household emissions.",
      ).within(() => {
        cy.get(".ant-radio-wrapper").then(($labels) => {
          expect(
            [...$labels].map((label) => label.textContent?.trim()),
          ).to.deep.equal(["True", "False", "Not Given"]);
        });
        cy.contains("label", "False").click();
      });

      cy.contains(
        ".context-lab-question-card",
        "Which technology was installed above the tram depot?",
      ).within(() => {
        cy.contains("label", "B. Solar panels").click();
      });

      cy.get('input[aria-label="第 3 题答案，最多 2 个词"]').type(
        overLimitAnswer,
      );
      cy.window().should((window) => {
        const draft = window.localStorage.getItem(
          "context-lab:draft:v2:166",
        );
        expect(draft).not.to.equal(null);
        expect(JSON.parse(draft as string).q3).to.deep.equal({
          text: overLimitAnswer,
        });
      });

      cy.get(".context-lab-practice-modal .ant-modal-close").click();
      cy.get(".context-lab-practice-modal").should("not.be.visible");
      openMixedPractice();
      cy.get('input[aria-label="第 3 题答案，最多 2 个词"]').should(
        "have.value",
        overLimitAnswer,
      );

      cy.get('button[aria-label="提交练习"]')
        .should("be.enabled")
        .scrollIntoView()
        .should("be.visible")
        .then(($button) => {
          const rect = $button[0].getBoundingClientRect();
          expect(rect.top).to.be.at.least(0);
          expect(rect.bottom).to.be.at.most(height);
        });
      cy.get('button[aria-label="提交练习"]').should("be.visible");
      expectPracticeModalReady();
      focusQuestionPaneForScreenshot(
        "Residents bought shares in a local energy ____.",
      );
      alignPracticeModalForScreenshot();
      cy.get(".context-lab-practice-modal .ant-modal-content").screenshot(
        `context-lab-mixed-${width}x${height}-practice-inputs`,
        { disableTimersAndAnimations: false, overwrite: true },
      );
      restorePracticeModalAfterScreenshot();
      restoreQuestionPaneAfterScreenshot();
      cy.get('button[aria-label="提交练习"]').click();

      cy.contains("还有 1 题未作答").should("be.visible");
      cy.contains("button", "继续提交").click();
      cy.wait("@mixedSubmit");

      cy.contains(
        ".context-lab-question-card",
        "Which technology was installed above the tram depot?",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：正确").should("be.visible");
        });
      cy.contains(
        ".context-lab-question-card",
        "The panels lowered household emissions.",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：错误").should("be.visible");
        });
      cy.contains(
        ".context-lab-question-card",
        "Residents bought shares in a local energy ____.",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：错误").should("be.visible");
          cy.contains("原因：答案超过字数限制").should("be.visible");
        });
      cy.contains(
        ".context-lab-question-card",
        "What did the panels lower for participating households?",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：未作答").should("be.visible");
        });
      expectSeparatedResults();
      cy.contains(
        ".context-lab-question-card",
        "Residents bought shares in a local energy ____.",
      ).scrollIntoView();
      expectPracticeModalReady();
      alignPracticeModalForScreenshot();
      cy.get(".context-lab-practice-modal .ant-modal-content").screenshot(
        `context-lab-mixed-${width}x${height}-practice-results`,
        { disableTimersAndAnimations: false, overwrite: true },
      );
      restorePracticeModalAfterScreenshot();
      cy.window().should((window) => {
        expect(
          window.localStorage.getItem("context-lab:draft:v2:166"),
        ).to.equal(null);
      });

      cy.get(".context-lab-practice-modal .ant-modal-close").click();
      openMixedPractice();
      cy.get('input[aria-label="第 3 题答案，最多 2 个词"]').should(
        "have.value",
        "",
      );
      expectNoPageOverflow();

      cy.get(".context-lab-practice-modal .ant-modal-close").click();
      cy.reload();
      cy.wait("@currentUser");
      cy.wait("@contextHistory");
      cy.wait("@taskEvents");
      cy.contains("练习 1 次").should("be.visible");

      cy.get('button[aria-label="任务 66 更多操作"]').click();
      cy.contains(".ant-dropdown-menu-item", "查看记录").click();
      cy.wait("@attemptHistory");
      cy.contains(".ant-drawer-title", "练习记录").should("be.visible");
      cy.contains("得分 25").should("be.visible");
      cy.contains("button", "查看详情").click();
      cy.wait("@attemptDetail");

      cy.get(".context-lab-attempt-question").should("have.length", 4);
      cy.contains(
        ".context-lab-attempt-question",
        "Which technology was installed above the tram depot?",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：正确").should("be.visible");
          cy.contains("你的答案：B. Solar panels").should("be.visible");
        });
      cy.contains(
        ".context-lab-attempt-question",
        "The panels lowered household emissions.",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：错误").should("be.visible");
          cy.contains("你的答案：False").should("be.visible");
          cy.contains("正确答案：True").should("be.visible");
        });
      cy.contains(
        ".context-lab-attempt-question",
        "Residents bought shares in a local energy ____.",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("原因：答案超过字数限制").should("be.visible");
          cy.contains(`你的答案：${overLimitAnswer}`).should("be.visible");
        });
      cy.contains(
        ".context-lab-attempt-question",
        "What did the panels lower for participating households?",
      )
        .scrollIntoView()
        .within(() => {
          cy.contains("状态：未作答").should("be.visible");
          cy.contains("正确答案：household emissions").should("be.visible");
        });
      expectNoPageOverflow();
    });
  });
});
