const ok = (data: unknown) => ({ code: 200, message: "success", data });
const playableMp3Base64 = [
  "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",
].join("");

const playableMp3Response = () => {
  const bytes = Cypress.Buffer.from(playableMp3Base64, "base64");
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return {
    statusCode: 200,
    headers: {
      "content-type": "audio/mpeg",
      "content-length": String(bytes.byteLength),
      "cache-control": "no-store",
    },
    body,
  };
};

describe("listening learning session", () => {
  it("completes a selected-word listening journey with refresh and idempotent retry", () => {
    const capabilities = [
      { mode: "root_family", status: "coming_soon", reason: "即将开放" },
      { mode: "micro_scene", status: "coming_soon", reason: "即将开放" },
      { mode: "confusion", status: "coming_soon", reason: "即将开放" },
      { mode: "listening", status: "enabled" },
      { mode: "output", status: "coming_soon", reason: "即将开放" },
    ];
    const meaningResult = {
      attemptId: 8101,
      itemId: 7101,
      status: "final",
      outcome: "correct",
      dimensionResults: [
        { dimension: "listening", outcome: "correct" },
        { dimension: "meaning_recognition", outcome: "correct" },
      ],
      sessionVersion: 2,
      nextItemId: 7102,
    };
    const spellingResult = {
      attemptId: 8102,
      itemId: 7102,
      status: "final",
      outcome: "correct",
      dimensionResults: [{ dimension: "spelling", outcome: "correct" }],
      sessionVersion: 5,
    };
    const submittedResults: Array<Record<string, unknown>> = [];
    let currentItem: "meaning" | "spelling" | "none" = "meaning";
    let sessionStatus: "active" | "paused" | "completed" = "active";
    let sessionVersion = 1;
    let meaningAttemptUid: string | undefined;
    let spellingAttemptUid: string | undefined;
    let droppedSpellingPayload: Record<string, unknown> | undefined;
    let acceptSpellingRetry = false;

    const detail = () => ({
      sessionId: 42,
      status: sessionStatus,
      sessionVersion,
      submittedResults,
      ...(currentItem === "meaning"
        ? {
            currentItem: {
              schemaVersion: 1,
              mode: "listening",
              phase: "understand",
              itemId: 7101,
              item: {
                itemType: "listening_meaning",
                itemUid: "opaque-item-701-a",
                wordId: 701,
                audio: {
                  britishUrl:
                    "/api/learning-session/audio/701/11111111-1111-4111-8111-111111111111.mp3",
                },
                meaningChoices: [
                  {
                    value: "2a56b8c1-8f0b-4d8f-a1a5-d22088458c92",
                    label: "检查；审视",
                  },
                  {
                    value: "751d9b72-1ff8-46a0-8c30-3975cd960e41",
                    label: "以上释义均不正确",
                  },
                ],
              },
            },
          }
        : currentItem === "spelling"
          ? {
              currentItem: {
                schemaVersion: 1,
                mode: "listening",
                phase: "recall",
                itemId: 7102,
                item: {
                  itemType: "listening_spelling",
                  itemUid: "opaque-item-701-b",
                  wordId: 701,
                  audio: {
                    britishUrl:
                      "/api/learning-session/audio/701/22222222-2222-4222-8222-222222222222.mp3",
                  },
                  spellingCue: { firstLetter: "i", length: 7 },
                },
              },
            }
          : {}),
      ...(sessionStatus === "completed"
        ? {
            result: {
              completedWords: 1,
              elapsedSeconds: 84,
              independentCorrect: 0,
              hintedCorrect: 1,
              needsWork: 0,
              pending: 0,
              levelChanges: 1,
              words: [
                {
                  wordId: 701,
                  word: "inspect",
                  originalLevel: 1,
                  systemLevel: 2,
                  manualLevel: null,
                  nextReviewAt: "2026-08-06T00:00:00.000Z",
                  recommendedMode: "listening",
                },
              ],
            },
          }
        : {}),
    });

    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 200,
      message: "ok",
      data: { id: 1, username: "listener" },
    }).as("currentUser");
    cy.intercept("GET", /\/api\/notifications(?:\?.*)?$/, {
      code: 200,
      message: "ok",
      data: { list: [], nextCursor: null },
    });
    cy.intercept("GET", "/api/notifications/unread-count", {
      code: 200,
      message: "ok",
      data: { count: 0 },
    });
    cy.intercept("GET", "/api/notifications/events", {
      statusCode: 200,
      body: "",
    });
    cy.intercept(
      "GET",
      "/api/learning-session/audio/701/11111111-1111-4111-8111-111111111111.mp3",
      (request) => request.reply(playableMp3Response()),
    ).as("meaningAudio");
    cy.intercept(
      "GET",
      "/api/learning-session/audio/701/22222222-2222-4222-8222-222222222222.mp3",
      (request) => request.reply(playableMp3Response()),
    ).as("spellingAudio");
    cy.intercept("POST", "/api/english/filterWordList", {
      code: 200,
      message: "ok",
      data: {
        list: [
          {
            id: 701,
            englishWord: "inspect",
            englishChinese: "检查；审视",
            englishLevel: 1,
            englishType: 0,
            englishPartSpeech: [0],
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }).as("wordList");
    cy.intercept("POST", "/api/learning-session/capabilities", {
      body: ok({ modes: capabilities }),
    }).as("capabilities");
    cy.intercept("POST", "/api/learning-session/preview", (request) => {
      expect(request.body).to.deep.equal({
        wordIds: [701],
        selectedModes: ["listening"],
      });
      request.reply({
        body: ok({
          wordCount: 1,
          estimatedSeconds: 30,
          modeCapabilities: capabilities,
          words: [
            {
              wordId: 701,
              sourceOrder: 0,
              primaryMode: "listening",
              eligibleModes: ["listening"],
              audioEligibility: "eligible",
              adaptationStatus: "adapted",
            },
          ],
          blocks: [
            {
              mode: "listening",
              wordIds: [701],
              items: [
                {
                  wordId: 701,
                  sourceOrder: 0,
                  itemType: "listening_meaning",
                },
                {
                  wordId: 701,
                  sourceOrder: 0,
                  itemType: "listening_spelling",
                },
              ],
              answerItemCount: 2,
              estimatedSeconds: 30,
            },
          ],
        }),
      });
    }).as("preview");
    cy.intercept("POST", "/api/learning-session/create", (request) => {
      expect(request.body.wordIds).to.deep.equal([701]);
      expect(request.body.selectedModes).to.deep.equal(["listening"]);
      expect(request.body.requestUid).to.match(/^learning-session-/);
      request.reply({
        body: ok({
          sessionId: 42,
          status: "active",
          sessionVersion: 1,
          currentItemId: 7101,
        }),
      });
    }).as("create");
    cy.intercept("POST", "/api/learning-session/detail", (request) => {
      expect(request.body).to.deep.equal({ sessionId: 42 });
      request.reply({ body: ok(detail()) });
    }).as("detail");
    cy.intercept("POST", "/api/learning-session/pause", (request) => {
      expect(request.body).to.deep.equal({ sessionId: 42, sessionVersion });
      sessionStatus = sessionStatus === "active" ? "paused" : "active";
      sessionVersion += 1;
      request.reply({
        body: ok({ sessionId: 42, status: sessionStatus, sessionVersion }),
      });
    }).as("pause");
    cy.intercept("POST", "/api/learning-session/submit", (request) => {
      if (request.body.itemId === 7101) {
        expect(request.body).to.deep.include({
          sessionId: 42,
          itemId: 7101,
          sessionVersion: 1,
          answer: {
            kind: "choice",
            selectedValue: "2a56b8c1-8f0b-4d8f-a1a5-d22088458c92",
          },
          hintCount: 0,
          hintTypes: [],
        });
        expect(request.body.attemptUid).to.be.a("string").and.not.be.empty;
        expect(request.body.attemptUid).to.match(/^learning-attempt-/);
        meaningAttemptUid = request.body.attemptUid;
        currentItem = "spelling";
        sessionVersion = 2;
        submittedResults.push(meaningResult);
        request.reply({
          body: ok({
            ...meaningResult,
            feedback: {
              kind: "meaning",
              expectedLabel: "检查；审视",
              explanation: "释义匹配。",
            },
          }),
        });
        return;
      }

      expect(request.body.itemId).to.equal(7102);
      if (!droppedSpellingPayload) {
        droppedSpellingPayload = JSON.parse(JSON.stringify(request.body)) as Record<
          string,
          unknown
        >;
        expect(request.body).to.deep.include({
          sessionId: 42,
          itemId: 7102,
          sessionVersion: 4,
          answer: { kind: "spelling", text: "inspect" },
          hintCount: 1,
          hintTypes: ["show_spelling"],
        });
        expect(request.body.attemptUid).to.be.a("string").and.not.be.empty;
        expect(request.body.attemptUid).to.match(/^learning-attempt-/);
        expect(meaningAttemptUid).to.be.a("string").and.not.be.empty;
        expect(request.body.attemptUid).not.to.equal(meaningAttemptUid);
        spellingAttemptUid = request.body.attemptUid;
        request.destroy();
        return;
      }

      expect(request.body).to.deep.equal(droppedSpellingPayload);
      expect(request.body.attemptUid).to.equal(
        droppedSpellingPayload.attemptUid,
      );
      expect(request.body.attemptUid).to.equal(spellingAttemptUid);
      if (!acceptSpellingRetry) {
        request.destroy();
        return;
      }
      currentItem = "none";
      sessionVersion = 5;
      submittedResults.push(spellingResult);
      request.reply({
        body: ok({
          ...spellingResult,
          feedback: {
            kind: "spelling",
            expected: "inspect",
            diff: [{ text: "inspect", kind: "same" }],
          },
        }),
      });
    }).as("submit");
    cy.intercept("POST", "/api/learning-session/complete", (request) => {
      expect(request.body).to.deep.equal({ sessionId: 42, sessionVersion: 5 });
      sessionStatus = "completed";
      sessionVersion = 6;
      request.reply({
        body: ok({ sessionId: 42, status: "completed", sessionVersion: 6 }),
      });
    }).as("complete");

    cy.visit("/englishWorld/words");
    cy.wait("@currentUser");
    cy.wait("@wordList");
    cy.contains("卡片").click();
    cy.contains("button", "批量管理").click();
    cy.get('input[aria-label="选择 inspect"]').check();
    cy.get('button[aria-label="开始记忆"]').click();

    cy.get('[role="dialog"][aria-label="开始混合记忆"]').should("be.visible");
    cy.contains("本次 1 个词").should("be.visible");
    cy.wait("@capabilities");
    cy.get('input[aria-label="听音记忆"]').should("be.checked");
    for (const mode of ["词根词族", "微场景", "易混辨析", "主动输出"]) {
      cy.get(`input[aria-label="${mode}"]`)
        .should("be.visible")
        .and("be.disabled");
    }
    cy.wait("@preview");
    cy.get('[aria-label="学习计划预览"]')
      .should("be.visible")
      .and("contain.text", "全部词条已通过预览");
    cy.get('button[aria-label="开始混合记忆"]').click();
    cy.wait("@create");

    cy.location("pathname").should("eq", "/englishWorld/learn/session/42");
    cy.wait("@detail");
    cy.wait("@meaningAudio");
    cy.get("body").should("not.contain.text", "inspect");
    cy.get("audio").should(($audio) => {
      expect(($audio[0] as HTMLAudioElement).readyState).to.be.at.least(1);
    });
    cy.contains("button", "播放英式发音")
      .should("have.attr", "aria-pressed", "false")
      .and("not.be.disabled")
      .click()
      .should("have.attr", "aria-pressed", "true");
    cy.contains('[role="status"]', "正在播放英式发音").should("be.visible");
    cy.contains("label", "检查；审视")
      .find('input[type="radio"]')
      .check()
      .should("be.checked");
    cy.contains("button", "提交答案").click();
    cy.wait("@submit");
    cy.wait("@detail");
    cy.wait("@spellingAudio");

    cy.contains("label", "输入听到的单词")
      .find('input[type="text"]')
      .should("have.value", "");
    cy.get("body").should("not.contain.text", "inspect");
    cy.contains("button", "暂停学习").click();
    cy.wait("@pause");
    cy.wait("@detail");
    cy.contains("学习已暂停").should("be.visible");
    cy.contains("button", "继续学习").click();
    cy.wait("@pause");
    cy.wait("@detail");

    cy.contains("button", "查看拼写提示")
      .click()
      .should("be.disabled");
    cy.get('[role="status"][aria-label="拼写提示"]')
      .should("be.visible")
      .and("contain.text", "首字母 i，共 7 个字母");
    cy.contains("label", "输入听到的单词")
      .find('input[type="text"]')
      .type("insp");
    cy.reload();
    cy.wait("@detail");
    cy.contains("label", "输入听到的单词")
      .find('input[type="text"]')
      .should("have.value", "insp");
    cy.contains("button", "查看拼写提示").click();
    cy.contains("label", "输入听到的单词")
      .find('input[type="text"]')
      .type("ect");
    cy.contains("button", "提交答案").click();
    cy.wait("@submit");

    cy.contains('[role="alert"]', "提交未同步，请重试").should("be.visible");
    cy.then(() => {
      acceptSpellingRetry = true;
    });
    cy.contains("button", "重试提交").click();
    cy.wait("@submit");
    cy.wait("@detail");
    cy.contains("本轮题目已完成").should("be.visible");
    cy.contains("button", "查看学习结果").click();
    cy.wait("@complete");
    cy.wait("@detail");

    cy.get('section[aria-label="学习结果"]').within(() => {
      cy.contains("已完成 1 个词").should("be.visible");
      cy.contains("用时 1 分 24 秒").should("be.visible");
      cy.contains("独立答对").parent().should("contain.text", "0");
      cy.contains("提示后答对").parent().should("contain.text", "1");
      cy.contains("仍需加强").parent().should("contain.text", "0");
      cy.contains("待处理").parent().should("contain.text", "0");
      cy.contains("等级变化 1 个词").should("be.visible");
      cy.contains("inspect").should("be.visible");
      cy.contains("掌握度 1 → 2").should("be.visible");
      cy.contains("推荐方式：听音记忆").should("be.visible");
      cy.get('time[datetime="2026-08-06T00:00:00.000Z"]').should(
        "be.visible",
      );
    });

    cy.go("back");
    cy.location("pathname").should("eq", "/englishWorld/words");
    cy.get('button[aria-label="开始记忆"]').should("be.visible");
  });
});
