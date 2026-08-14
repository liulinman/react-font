describe("english-world login input layout", () => {
  it("keeps the focused input border visible while typing", () => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 4001,
      message: "未登录",
      data: null,
    });

    cy.visit("/login");
    cy.get('[data-cy="login-username"]').type("tester");

    cy.get('[data-cy="login-username"]').should(($username) => {
      const styles = window.getComputedStyle($username[0]);
      expect(styles.borderStyle).to.equal("none");
      expect(styles.backgroundColor).to.equal("rgba(0, 0, 0, 0)");
    });

    cy.get('[data-cy="login-username"]').then(($username) => {
      cy.get('[data-cy="login-password"]').then(($password) => {
        const usernameRect = $username[0].getBoundingClientRect();
        const passwordRect = $password[0].getBoundingClientRect();
        expect(passwordRect.top).to.be.greaterThan(usernameRect.bottom);
      });
    });
  });
});
