describe("context lab compact search toolbar layout", () => {
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
      data: { list: [], total: 0, page: 1, pageSize: 10 },
    }).as("contextHistory");
  });

  it("keeps the input content inside its fixed-height wrapper", () => {
    cy.viewport(1600, 900);
    cy.visit("/englishWorld/context-lab");
    cy.wait("@currentUser");
    cy.wait("@contextHistory");

    cy.get(".context-lab-history-search-input").then(($wrapper) => {
      const wrapper = $wrapper[0];
      const input = wrapper.querySelector("input");
      const wrapperRect = wrapper.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const wrapperStyle = getComputedStyle(wrapper);
      const verticalChrome =
        Number.parseFloat(wrapperStyle.paddingTop) +
        Number.parseFloat(wrapperStyle.paddingBottom) +
        Number.parseFloat(wrapperStyle.borderTopWidth) +
        Number.parseFloat(wrapperStyle.borderBottomWidth);

      expect(inputRect.height).to.be.at.most(
        wrapperRect.height - verticalChrome,
      );
    });
  });
});
