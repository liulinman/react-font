export {};
// Real NestJS / disposable MySQL only. Never render or log a live MCP token.
type TokenResult = {
  token: string;
  item: { id: string; scopes: string[]; createdAt: string; expiresAt: string };
};
const scopes = ["words:read", "words:create", "words:update", "words:delete"];
let rpcId = 0;
const unwrap = (body: any) => (body?.code === 200 ? body.data : body);
const management = (path: string, body?: unknown) =>
  cy
    .request({
      url: `/api/mcp-access${path}`,
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { Origin: "http://127.0.0.1:13318" },
      body,
      log: false,
    })
    .then((r) => unwrap(r.body));
const token = (name = "隔离 MCP 验收", permissions = scopes) =>
  management("/tokens", {
    name,
    scopes: permissions,
    expiresInDays: 30,
  }) as Cypress.Chainable<TokenResult>;
const rpc = (secret: string, method: string, params: unknown = {}) =>
  cy.request({
    method: "POST",
    url: "/api/mcp",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-03-26",
    },
    body: { jsonrpc: "2.0", id: ++rpcId, method, params },
    log: false,
    failOnStatusCode: false,
  });
const call = (secret: string, name: string, args: unknown) =>
  rpc(secret, "tools/call", { name, arguments: args }).then((r) => {
    expect(r.status).to.eq(200);
    return r.body.result;
  });
const value = (result: any) =>
  result.structuredContent ??
  JSON.parse(result.content.find((c: any) => c.type === "text").text);
const success = (result: any) => {
  expect(result.isError).not.to.eq(true);
  return value(result);
};

describe("MCP real authorization and vocabulary", () => {
  let fixture: {
    account: { username: string; password: string };
    wordId: number;
  };
  beforeEach(() =>
    cy.task("resetDatabase", null, { timeout: 60000 }).then((seed: any) => {
      fixture = seed;
      return cy.request({
        method: "POST",
        url: "/api/user/login",
        body: fixture.account,
        log: false,
      });
    }),
  );

  it("MCP-01 initializes official protocol and pages real account vocabulary", () => {
    token().then(({ token: secret }) => {
      rpc(secret, "initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "isolated-acceptance", version: "1.0" },
      }).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body.result.serverInfo.name).to.be.a("string");
      });
      rpc(secret, "tools/list").then((r) =>
        expect(r.body.result.tools.map((t: any) => t.name)).to.include.members([
          "query_words",
          "get_word",
          "create_word",
          "preview_update_word",
          "confirm_update_word",
          "preview_delete_word",
          "confirm_delete_word",
        ]),
      );
      call(secret, "query_words", { limit: 1, offset: 0 }).then((result) => {
        const data = success(result);
        expect(data.items).to.have.length(1);
        expect(data.limit).to.eq(1);
        expect(data.offset).to.eq(0);
        call(secret, "get_word", { wordId: data.items[0].id }).then((r) =>
          expect(success(r).englishWord).to.eq(data.items[0].englishWord),
        );
      });
      call(secret, "query_words", { limit: 1, offset: 1 }).then((r) => {
        expect(success(r).offset).to.eq(1);
        expect(success(r).items).to.have.length(0);
      });
      call(secret, "query_words", {
        keyword: "zzzz-no-match-acceptance",
        limit: 1,
      }).then((r) => {
        expect(success(r).items).to.have.length(0);
        expect(success(r).total).to.eq(0);
      });
    });
  });

  it("MCP-02 creates normalized words and rejects duplicate or conflicting retries", () => {
    token().then(({ token: secret }) => {
      call(secret, "create_word", {
        requestId: "invalid-word",
        word: { englishWord: "  " },
      }).then((r) => expect(r.isError).to.eq(true));
      const args = {
        requestId: "create-acceptance-1",
        word: { englishWord: "  Test   Phrase  ", englishChinese: "验收短语" },
      };
      call(secret, "create_word", args).then((result) => {
        const created = success(result).word;
        expect(created.englishWord).to.eq("test phrase");
        call(secret, "create_word", args).then((r) =>
          expect(success(r).word.id).to.eq(created.id),
        );
        call(secret, "create_word", {
          ...args,
          word: { englishWord: "different" },
        }).then((r) => expect(r.isError).to.eq(true));
        call(secret, "create_word", {
          requestId: "create-acceptance-2",
          word: { englishWord: "TEST PHRASE" },
        }).then((r) => {
          expect(r.isError).to.eq(true);
          expect(JSON.stringify(value(r))).to.include("duplicate_word");
        });
        call(secret, "query_words", { keyword: "test phrase" }).then((r) =>
          expect(success(r).total).to.eq(1),
        );
      });
    });
  });

  it("MCP-03 previews safe overwrite and consumes explicit confirmation once", () => {
    token().then(({ token: secret }) =>
      call(secret, "create_word", {
        requestId: "overwrite-create",
        word: {
          englishWord: "overwritecase",
          englishChinese: "旧释义",
          englishNote: "保留笔记",
        },
      }).then((r) => {
        const before = success(r).word;
        call(secret, "preview_update_word", {
          wordId: before.id,
          changes: { englishChinese: "旧释义" },
        }).then((result) => expect(value(result).code).to.eq("no_changes"));
        call(secret, "preview_update_word", {
          wordId: before.id,
          changes: { englishWord: "illegal-new-head", englishChinese: "拒绝" },
        }).then((r) => expect(r.isError).to.eq(true));
        call(secret, "preview_update_word", {
          wordId: before.id,
          changes: { englishChinese: "新释义", englishNote: "  " },
        }).then((r) => {
          const preview = success(r);
          expect(preview.changedFields).to.deep.eq(["englishChinese"]);
          expect(preview.before.englishChinese).to.eq("旧释义");
          expect(preview.after.englishNote).to.eq("保留笔记");
          const args = {
            requestId: "overwrite-confirm",
            confirmationToken: preview.confirmationToken,
            confirmed: true,
          };
          call(secret, "confirm_update_word", {
            ...args,
            requestId: "not-confirmed",
            confirmed: false,
          }).then((r) => expect(r.isError).to.eq(true));
          call(secret, "get_word", { wordId: before.id }).then((r) =>
            expect(success(r).englishChinese).to.eq("旧释义"),
          );
          call(secret, "confirm_update_word", args).then((r) => {
            const after = success(r).word;
            expect(after.id).to.eq(before.id);
            expect(after.englishChinese).to.eq("新释义");
            expect(after.englishNote).to.eq("保留笔记");
            expect(after.englishOverwriteCount).to.eq(1);
          });
          call(secret, "confirm_update_word", args).then((r) =>
            expect(success(r).word.englishOverwriteCount).to.eq(1),
          );
          call(secret, "confirm_update_word", {
            ...args,
            requestId: "overwrite-retry-new-id",
          }).then((r) =>
            expect(success(r).word.englishOverwriteCount).to.eq(1),
          );
        });
      }),
    );
  });

  it("MCP-04 binds previews to authorization and rejects stale changes before deletion", () => {
    token().then(({ token: secret }) =>
      token("第二独立授权").then(({ token: second }) =>
        call(secret, "create_word", {
          requestId: "delete-create",
          word: { englishWord: "deletecase", englishChinese: "原值" },
        }).then((r) => {
          const word = success(r).word;
          call(secret, "preview_delete_word", { wordId: word.id }).then((r) => {
            const stale = success(r);
            call(second, "confirm_delete_word", {
              requestId: "wrong-token",
              confirmationToken: stale.confirmationToken,
              confirmed: true,
            }).then((r) => expect(r.isError).to.eq(true));
            call(secret, "preview_update_word", {
              wordId: word.id,
              changes: { englishChinese: "已变化" },
            }).then((r) =>
              call(secret, "confirm_update_word", {
                requestId: "change-before-delete",
                confirmationToken: success(r).confirmationToken,
                confirmed: true,
              }).then(success),
            );
            call(secret, "confirm_delete_word", {
              requestId: "stale-delete",
              confirmationToken: stale.confirmationToken,
              confirmed: true,
            }).then((r) => expect(r.isError).to.eq(true));
            call(secret, "preview_delete_word", { wordId: word.id }).then(
              (r) => {
                const args = {
                  requestId: "delete-confirm",
                  confirmationToken: success(r).confirmationToken,
                  confirmed: true,
                };
                call(secret, "confirm_delete_word", {
                  ...args,
                  confirmed: false,
                }).then((r) => expect(r.isError).to.eq(true));
                call(secret, "confirm_delete_word", args).then((r) =>
                  expect(success(r)).to.deep.eq({
                    deleted: true,
                    wordId: word.id,
                  }),
                );
                call(secret, "confirm_delete_word", args).then((r) =>
                  expect(success(r)).to.deep.eq({
                    deleted: true,
                    wordId: word.id,
                  }),
                );
                call(secret, "get_word", { wordId: word.id }).then((r) =>
                  expect(r.isError).to.eq(true),
                );
              },
            );
          });
        }),
      ),
    );
  });

  it("MCP-05 denies cookie-only access, missing scope and revoked authorization without leaking secrets", () => {
    cy.request({
      method: "POST",
      url: "/api/mcp",
      body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
      failOnStatusCode: false,
      log: false,
    })
      .its("status")
      .should("eq", 401);
    token("只读授权", ["words:read"]).then(({ token: secret, item }) => {
      call(secret, "create_word", {
        requestId: "forbidden-create",
        word: { englishWord: "forbiddenwordcontent" },
      }).then((r) => expect(r.isError).to.eq(true));
      call(secret, "preview_delete_word", { wordId: 1 }).then((r) =>
        expect(r.isError).to.eq(true),
      );
      management("/tokens").then((data) => {
        expect(JSON.stringify(data)).not.to.include(secret);
        expect(data.items.find((i: any) => i.id === item.id).scopes).to.deep.eq(
          ["words:read"],
        );
      });
      management(`/tokens/${item.id}/revoke`, {}).then((data) =>
        expect(data.revoked).to.eq(true),
      );
      rpc(secret, "tools/list").its("status").should("eq", 401);
      management("/audit").then((data) => {
        expect(JSON.stringify(data)).not.to.include(secret);
        expect(JSON.stringify(data)).not.to.include("forbiddenwordcontent");
        expect(data.items.length).to.be.at.most(50);
      });
    });
  });

  it("MCP-06 enforces real management login, same-origin mutations and cross-account boundaries", () => {
    const data = {
      name: "受保护授权",
      scopes: ["words:read"],
      expiresInDays: 30,
    };
    cy.clearCookies();
    cy.request({
      url: "/api/mcp-access/tokens",
      failOnStatusCode: false,
      log: false,
    })
      .its("status")
      .should("eq", 401);
    cy.request({
      method: "POST",
      url: "/api/user/login",
      body: fixture.account,
      log: false,
    });
    cy.request({
      method: "POST",
      url: "/api/mcp-access/tokens",
      body: data,
      failOnStatusCode: false,
      log: false,
    })
      .its("status")
      .should("eq", 403);
    cy.request({
      method: "POST",
      url: "/api/mcp-access/tokens",
      headers: { Origin: "https://untrusted.example" },
      body: data,
      failOnStatusCode: false,
      log: false,
    })
      .its("status")
      .should("eq", 403);
    management("/tokens").then((result) =>
      expect(result.items).to.have.length(0),
    );
    token("主账号授权").then(({ token: ownerSecret, item }) => {
      call(ownerSecret, "preview_delete_word", { wordId: fixture.wordId }).then(
        (result) => {
          const preview = success(result);
          cy.request({
            method: "POST",
            url: "/api/user/login",
            body: {
              username: "automation_other",
              password: fixture.account.password,
            },
            log: false,
          });
          management("/tokens").then((result) =>
            expect(result.items).to.have.length(0),
          );
          cy.request({
            method: "POST",
            url: `/api/mcp-access/tokens/${item.id}/revoke`,
            headers: { Origin: "http://127.0.0.1:13318" },
            body: {},
            failOnStatusCode: false,
            log: false,
          })
            .its("status")
            .should("eq", 404);
          token("第二账号授权").then(({ token: otherSecret }) => {
            call(otherSecret, "query_words", {}).then((result) =>
              expect(success(result).items).to.have.length(0),
            );
            call(otherSecret, "get_word", { wordId: fixture.wordId }).then(
              (result) => expect(value(result).code).to.eq("not_found"),
            );
            call(otherSecret, "get_word", { wordId: 2147483647 }).then(
              (result) => expect(value(result).code).to.eq("not_found"),
            );
            call(otherSecret, "preview_update_word", {
              wordId: fixture.wordId,
              changes: { englishChinese: "越权修改" },
            }).then((result) => expect(result.isError).to.eq(true));
            call(otherSecret, "preview_delete_word", {
              wordId: fixture.wordId,
            }).then((result) => expect(result.isError).to.eq(true));
            call(otherSecret, "confirm_delete_word", {
              requestId: "cross-account-confirm",
              confirmationToken: preview.confirmationToken,
              confirmed: true,
            }).then((result) => expect(result.isError).to.eq(true));
            call(ownerSecret, "get_word", { wordId: fixture.wordId }).then(
              (result) =>
                expect(success(result).englishWord).to.eq("resilient"),
            );
          });
        },
      );
    });
  });

  for (const width of [1280, 390])
    it(`MCP-UI-${width} shows safe defaults, refreshes persisted list and revokes with spaced controls`, () => {
      cy.viewport(width, 900);
      token("界面验收授权", ["words:read"]).then(({ item }) => {
        cy.visit("/englishWorld/settings");
        cy.get(".mcp-access-card").scrollIntoView().should("be.visible");
        cy.get(".mcp-access-connection")
          .should("contain.text", "Streamable HTTP")
          .and("contain.text", "Bearer");
        cy.get(".mcp-access-connection code").should(
          "have.text",
          "http://127.0.0.1:13318/api/mcp",
        );
        cy.get(".mcp-access-connection summary").click();
        cy.get(".mcp-access-connection pre")
          .should("contain.text", "Bearer <填入创建时保存的密钥>")
          .and("not.contain.text", "ew_mcp_");
        cy.get(".mcp-access-connection").should(
          "contain.text",
          "支持手动 Bearer",
        );
        cy.window().then((win) =>
          cy
            .stub(win.navigator.clipboard, "writeText")
            .resolves()
            .as("copyTemplate"),
        );
        cy.get(".mcp-access-connection")
          .contains("button", "复制配置模板")
          .click();
        cy.get("@copyTemplate").should("have.been.calledOnce");
        cy.get(".mcp-access-card").contains("已复制").should("be.visible");

        cy.get(".mcp-access-card").contains("button", "创建授权").click();
        cy.get(".ant-modal:visible").within(() => {
          cy.get("input[type=checkbox]:checked").should("have.length", 1);
          cy.get("input[type=checkbox]:checked")
            .parent()
            .parent()
            .should("contain.text", "查询单词");
          cy.get("input[role=spinbutton]").should("have.value", "30");
          cy.contains("button", /^取\s*消$/).click();
        });
        cy.reload();
        cy.get(".mcp-access-connection code").should("be.visible");
        cy.window().then((win) =>
          cy
            .stub(win.navigator.clipboard, "writeText")
            .rejects(new Error("isolated clipboard denied")),
        );
        cy.get(".mcp-access-connection").contains("button", "复制地址").click();
        cy.get(".mcp-access-card")
          .contains("复制失败，请选中文本手动复制。")
          .should("be.visible");
        cy.get(".mcp-access-card .ant-alert-success").should("not.exist");
        cy.get(".mcp-access-token")
          .contains("界面验收授权")
          .parents(".mcp-access-token")
          .within(() => {
            cy.contains("有效").should("be.visible");
            cy.contains("button", "撤销授权").click();
          });
        cy.get(".ant-modal:visible")
          .contains("button", /^取\s*消$/)
          .click();
        cy.get(".mcp-access-token")
          .contains("界面验收授权")
          .parents(".mcp-access-token")
          .contains("button", "撤销授权")
          .click();
        cy.get(".ant-modal:visible").contains("button", "确认撤销").click();
        cy.get(".mcp-access-token")
          .contains("界面验收授权")
          .parents(".mcp-access-token")
          .should("contain.text", "已撤销");
        management("/tokens").then((data) =>
          expect(
            data.items.find((i: any) => i.id === item.id).revokedAt,
          ).to.be.a("string"),
        );
        cy.document().then((doc) =>
          expect(doc.documentElement.scrollWidth).to.be.at.most(width),
        );
        cy.get(".mcp-access-actions").then((el) => {
          const buttons = el[0].querySelectorAll("button");
          expect(
            buttons[1].getBoundingClientRect().left -
              buttons[0].getBoundingClientRect().right,
          ).to.be.at.least(8);
        });
        cy.screenshot(`mcp-authorization-${width}`, { capture: "viewport" });
      });
    });
});
