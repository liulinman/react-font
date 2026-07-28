describe("bulk import conflict confirmation", () => {
  it("does not import skipped words until the learner confirms", () => {
    let importRequests = 0;

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

    cy.intercept("POST", "**/bulkImportWords/preview", {
      code: 200,
      message: "ok",
      data: {
        receivedTextLength: 27,
        extracted: 3,
        aiEnhanced: false,
        items: [
          { englishWord: "mitigate" },
          { englishWord: "resilient" },
          { englishWord: "Mitigate" },
        ],
      },
    }).as("bulkPreview");

    cy.intercept("POST", "**/importMissingWords/preview", {
      code: 200,
      message: "ok",
      data: {
        received: 3,
        normalized: 2,
        importable: 1,
        skippedExisting: 1,
        skippedDuplicate: 1,
        existingWords: ["resilient"],
        duplicateWords: ["mitigate"],
      },
    }).as("conflictPreview");

    cy.intercept("POST", "**/importMissingWords", (request) => {
      importRequests += 1;
      request.reply({
        code: 200,
        message: "ok",
        data: {
          received: 3,
          normalized: 2,
          inserted: 1,
          skippedExisting: 1,
          skippedDuplicate: 1,
          insertedWords: ["mitigate"],
          skippedWords: ["resilient"],
          updated: 0,
          updatedWords: [],
        },
      });
    }).as("importWords");

    cy.visit("/englishWorld/bulk-import");
    cy.wait("@currentUser");
    cy.get(
      'textarea[placeholder="支持换行、逗号、序号、英文 + 中文释义混合粘贴"]',
    ).type("mitigate\nresilient\nMitigate", {
      parseSpecialCharSequences: false,
    });
    cy.contains("button", "解析预览").click();
    cy.wait("@bulkPreview");
    cy.contains("button", "确认导入").click();
    cy.wait("@conflictPreview");

    cy.contains("发现已有或重复词条，是否继续？").should("be.visible");
    cy.contains("继续后将新增 1 个词条").should("be.visible");
    cy.then(() => expect(importRequests).to.equal(0));

    cy.contains("button", "继续导入").click();
    cy.wait("@importWords");
    cy.then(() => expect(importRequests).to.equal(1));
    cy.contains("已导入 1 个词条").should("be.visible");
  });
});
