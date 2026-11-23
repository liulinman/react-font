describe("english-world login input layout", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/user/captcha", {
      code: 200,
      data: {
        captchaId: "mock-captcha",
        imageDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP/QAAAAASUVORK5CYII=",
        expiresIn: 120,
      },
    });
  });
  it("keeps the focused input border visible while typing", () => {
    cy.intercept("POST", "/api/user/getCurrentUser", {
      code: 4001,
      message: "未登录",
      data: null,
    });

    cy.visit("/login");
    cy.get(".brand-art").should(
      "have.attr",
      "src",
      "/brand/freewing-logo-transparent.png",
    );
    cy.get(".companion").should("be.visible");
    cy.get(".companion").then(($brand) => {
      cy.get(".form-column").then(($form) => {
        expect($brand[0].getBoundingClientRect().right).to.be.lessThan(
          $form[0].getBoundingClientRect().left,
        );
      });
    });
    cy.get('[data-cy="login-username"]').type("tester");

    cy.get('[data-cy="login-username"]').should(($username) => {
      const styles = window.getComputedStyle($username[0]);
      expect(styles.borderStyle).to.equal("solid");
      expect(styles.borderColor).to.equal("rgb(25, 121, 172)");
      expect(styles.backgroundColor).not.to.equal("rgba(0, 0, 0, 0)");
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
