const ok = (data: unknown) => ({ code: 200, message: "success", data });
const silentWav = (() => {
  const sampleRate = 8_000;
  const dataLength = 1_600;
  const wav = Cypress.Buffer.alloc(44 + dataLength);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataLength, 40);
  return wav;
})();
const silentWavBody = silentWav.buffer.slice(
  silentWav.byteOffset,
  silentWav.byteOffset + silentWav.byteLength,
) as ArrayBuffer;

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
                    "/learning-audio/8f14e45fceea167a5a36dedd4bea2543.mp3",
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
                      "/learning-audio/c9f0f895fb98ab9159f51fd0297e236d.mp3",
                  },
                },
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
    const audioResponse = {
      statusCode: 200,
      headers: { "content-type": "audio/wav", "cache-control": "no-store" },
      body: silentWavBody,
    };
    cy.intercept(
      "GET",
      "/learning-audio/8f14e45fceea167a5a36dedd4bea2543.mp3",
      audioResponse,
    ).as("meaningAudio");
    cy.intercept(
      "GET",
      "/learning-audio/c9f0f895fb98ab9159f51fd0297e236d.mp3",
      audioResponse,
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

    cy.on("window:before:load", (appWindow) => {
      appWindow.HTMLMediaElement.prototype.play = function play() {
        this.dispatchEvent(new appWindow.Event("play"));
        return Promise.resolve();
      };
    });
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
    cy.contains("button", "播放英式发音")
      .should("have.attr", "aria-pressed", "false")
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
      cy.contains("2 次作答").should("be.visible");
      cy.contains("答对 2 次").should("be.visible");
      cy.contains("答错 0 次").should("be.visible");
      cy.contains("跳过 0 次").should("be.visible");
      cy.contains("单词完成数、提示使用和等级变化暂无统计").should(
        "be.visible",
      );
      cy.contains("独立答对").should("not.exist");
      cy.contains("提示后答对").should("not.exist");
      cy.contains("已完成 1 个词").should("not.exist");
    });

    cy.go("back");
    cy.location("pathname").should("eq", "/englishWorld/words");
    cy.get('button[aria-label="开始记忆"]').should("be.visible");
  });
});
