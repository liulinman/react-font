export {};
// Disposable test accounts only. Bearer secrets stay out of command logs and DOM.
const permissions = ["notes:read", "notes:create", "notes:update", "notes:folders:create"];
const origin = "http://127.0.0.1:13318";
const unwrap = (body: any) => body?.code === 200 ? body.data : body;
const uuid = () => crypto.randomUUID();
const management = (path: string, body?: unknown) => cy.request({
  url: `/api/mcp-access${path}`, method: body === undefined ? "GET" : "POST",
  headers: body === undefined ? undefined : { Origin: origin }, body, log: false,
}).then(r => unwrap(r.body));
const token = (scopes = permissions, name = "笔记隔离验收") => management("/tokens", { name, scopes, expiresInDays: 30 });
const noteApi = (path: string, method = "GET", body?: unknown) => cy.request({
  url: `/api/knowledge-notes${path}`, method, body, log: false,
}).then(r => unwrap(r.body));
let rpcId = 0;
const rpc = (secret: string, method: string, params: unknown = {}) => cy.request({
  url: "/api/mcp", method: "POST", log: false, failOnStatusCode: false,
  headers: { Authorization: `Bearer ${secret}`, Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-03-26" },
  body: { jsonrpc: "2.0", id: ++rpcId, method, params },
});
const call = (secret: string, name: string, args: unknown = {}) => rpc(secret, "tools/call", { name, arguments: args }).then(r => {
  expect(r.status).to.eq(200);
  expect(r.body.result, "tool result").to.exist;
  return r.body.result;
});
const value = (r: any) => r.structuredContent ?? JSON.parse(r.content.find((c: any) => c.type === "text").text);
const success = (r: any) => { expect(r.isError, "successful tool execution").not.to.eq(true); return value(r); };
const failure = (r: any, code?: string) => { expect(r.isError, "rejected tool execution").to.eq(true); if (code) expect(value(r).code).to.eq(code); };
const login = (account: { username: string; password: string }) => cy.request({ method: "POST", url: "/api/user/captcha", body: {}, log: false }).then(({ body }) =>
  cy.request({ method: "POST", url: "http://127.0.0.1:13317/__automation/account/captcha", body: { captchaId: body.data.captchaId }, log: false }).then(() =>
    cy.request({ method: "POST", url: "/api/user/login", body: { ...account, captchaId: body.data.captchaId, captchaCode: "ABCDE" }, log: false })));
const seedFolder = (name = "阅读技巧") => noteApi("/folders", "POST", { name, parentId: null });
const create = (secret: string, folderId: number, extra = {}) => call(secret, "create_note", {
  requestId: uuid(), folderId, note: { title: "定位与改写", body: "保留中文、English 和换行\n**粗体原文**", category: "阅读技巧", ...extra },
}).then(r => success(r).note);
const confirm = (secret: string, name: string, preview: any, requestId = uuid()) => call(secret, name, { confirmationToken: preview.confirmationToken, confirmed: true, requestId });

describe("MCP real knowledge notes", () => {
  let fixture: any;
  beforeEach(() => cy.task("resetDatabase", null, { timeout: 60000 }).then((seed: any) => { fixture = seed; return login(seed.account); }));

  it("NOTE-MCP-01 advertises note tools and preserves vocabulary protocol", () => {
    token().then(({ token: secret }) => {
      rpc(secret, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "notes-acceptance", version: "1" } }).then(r => {
        expect(r.status).to.eq(200); expect(r.body.result.serverInfo.name).to.eq("english-world");
      });
      rpc(secret, "tools/list").then(r => {
        const tools = r.body.result.tools;
        expect(tools.map((t: any) => t.name)).to.include.members(["query_notes", "get_note", "list_note_folders", "create_note", "preview_update_note", "confirm_update_note", "preview_create_note_folder", "confirm_create_note_folder", "query_words", "get_word", "create_word", "preview_update_word", "confirm_update_word", "preview_delete_word", "confirm_delete_word"]);
        for (const name of ["query_notes", "get_note", "list_note_folders", "preview_update_note", "preview_create_note_folder"])
          expect(tools.find((t: any) => t.name === name).annotations.readOnlyHint, name).to.eq(true);
      });
      call(secret, "query_notes", { q: "no-match-acceptance" }).then(r => { expect(success(r).list).to.deep.eq([]); expect(success(r).total).to.eq(0); });
    });
    token(["words:read"]).then(({ token: secret }) => call(secret, "get_word", { wordId: fixture.wordId }).then(r => expect(success(r).englishWord).to.eq("resilient")));
  });

  it("NOTE-MCP-02 lists existing hierarchy and saves original content into an existing folder", () => {
    seedFolder("雅思阅读").then(parent => noteApi("/folders", "POST", { name: "定位技巧", parentId: parent.id }).then(child => token().then(({ token: secret }) => {
      call(secret, "list_note_folders").then(r => expect(success(r).list).to.deep.include.members([{ id: child.id, name: "定位技巧", parentId: parent.id, noteCount: 0 }]));
      const content = { examples: "Example: locate the paraphrase.\n第二行", source: "聊天整理", wordIds: [fixture.wordId] };
      create(secret, child.id, content).then(note => {
        expect(note.folderId).to.eq(child.id); expect(note.body).to.eq("保留中文、English 和换行\n**粗体原文**");
        call(secret, "get_note", { noteId: note.id }).then(r => { const saved = success(r); expect(saved.examples).to.eq(content.examples); expect(saved.source).to.eq(content.source); expect(saved.words.map((w: any) => w.id)).to.deep.eq([fixture.wordId]); });
        noteApi(`/${note.id}`).then(saved => { expect(saved.folderId).to.eq(child.id); expect(saved.body).to.eq(note.body); });
        call(secret, "query_notes", { q: "改写", folderId: parent.id, category: "阅读技巧", wordId: fixture.wordId, page: 1 }).then(r => { expect(success(r).list.map((n: any) => n.id)).to.deep.eq([note.id]); expect(success(r).pageSize).to.eq(20); });
        call(secret, "query_notes", { q: "改写", page: 2 }).then(r => expect(success(r).list).to.deep.eq([]));
      });
      noteApi("/folders").then(r => expect(r.list).to.have.length(2));
    })));
  });

  it("NOTE-MCP-03 creates a proposed folder only after confirmation and retries once", () => {
    token().then(({ token: secret }) => {
      call(secret, "list_note_folders").then(r => expect(success(r).list).to.have.length(0));
      call(secret, "preview_create_note_folder", { name: "学术句型", parentId: null }).then(r => {
        const preview = success(r); expect(preview.folder.name).to.eq("学术句型"); expect(new Date(preview.expiresAt).getTime() - Date.now()).to.be.within(590000, 610000);
        noteApi("/folders").then(f => expect(f.list).to.have.length(0));
        call(secret, "confirm_create_note_folder", { confirmationToken: preview.confirmationToken, confirmed: false, requestId: uuid() }).then(r => failure(r));
        noteApi("/folders").then(f => expect(f.list).to.have.length(0));
        const requestId = uuid();
        confirm(secret, "confirm_create_note_folder", preview, requestId).then(r => {
          const folder = success(r).folder; expect(folder.name).to.eq("学术句型");
          confirm(secret, "confirm_create_note_folder", preview, requestId).then(r => expect(success(r).folder.id).to.eq(folder.id));
          confirm(secret, "confirm_create_note_folder", preview).then(r => expect(success(r).folder.id).to.eq(folder.id));
          create(secret, folder.id).then(note => expect(note.folderId).to.eq(folder.id));
          noteApi("/folders").then(f => expect(f.list).to.have.length(1));
        });
      });
    });
  });

  it("NOTE-MCP-04 previews full edits without saving and confirms one version increment", () => {
    seedFolder().then(folder => token().then(({ token: secret }) => create(secret, folder.id, { source: "原来源", wordIds: [fixture.wordId] }).then(note => {
      call(secret, "preview_update_note", { noteId: note.id, changes: { title: "新的标题", body: "新正文\n逐行保留", examples: "" } }).then(r => {
        const preview = success(r); expect(preview.before.title).to.eq(note.title); expect(preview.before.body).to.eq(note.body); expect(preview.after.body).to.eq("新正文\n逐行保留"); expect(preview.after.source).to.eq("原来源"); expect(preview.changedFields).to.include.members(["title", "body"]);
        noteApi(`/${note.id}`).then(saved => { expect(saved.body).to.eq(note.body); expect(saved.version).to.eq(note.version); });
        call(secret, "confirm_update_note", { confirmationToken: preview.confirmationToken, confirmed: false, requestId: uuid() }).then(r => failure(r));
        const requestId = uuid();
        confirm(secret, "confirm_update_note", preview, requestId).then(r => { const saved = success(r).note; expect(saved.title).to.eq("新的标题"); expect(saved.body).to.eq("新正文\n逐行保留"); expect(saved.source).to.eq("原来源"); expect(saved.folderId).to.eq(folder.id); expect(saved.words.map((w: any) => w.id)).to.deep.eq([fixture.wordId]); expect(saved.version).to.eq(note.version + 1); });
        confirm(secret, "confirm_update_note", preview, requestId).then(r => expect(success(r).note.version).to.eq(note.version + 1));
        confirm(secret, "confirm_update_note", preview).then(r => expect(success(r).note.version).to.eq(note.version + 1));
        noteApi(`/${note.id}`).then(saved => expect(saved.version).to.eq(note.version + 1));
      });
    })));
  });

  it("NOTE-MCP-05 rejects stale versions and binds previews to token and action", () => {
    seedFolder().then(folder => token().then(({ token: secret }) => token(permissions, "第二笔记授权").then(({ token: second }) => create(secret, folder.id).then(note => {
      call(secret, "preview_update_note", { noteId: note.id, changes: { body: "候选正文" } }).then(r => {
        const preview = success(r);
        confirm(second, "confirm_update_note", preview).then(r => failure(r));
        confirm(secret, "confirm_create_note_folder", preview).then(r => failure(r));
        noteApi(`/${note.id}`, "PUT", { ...note, body: "网页已经修改", version: note.version, wordIds: [] }).then(saved => expect(saved.version).to.eq(note.version + 1));
        confirm(secret, "confirm_update_note", preview).then(r => failure(r));
        noteApi(`/${note.id}`).then(saved => expect(saved.body).to.eq("网页已经修改"));
      });
    }))));
  });

  it("NOTE-MCP-06 requires owned folders and validates note fields without hidden writes", () => {
    token().then(({ token: secret }) => {
      const requestId = uuid(), note = { title: "不能未归档", body: "正文" };
      call(secret, "create_note", { requestId, note }).then(r => failure(r));
      call(secret, "create_note", { requestId, note, folderId: 2147483647 }).then(r => failure(r));
      seedFolder().then(folder => {
        for (const invalid of [{ title: " " }, { body: " " }, { body: "a".repeat(30001) }, { title: "a".repeat(121) }, { category: "非法分类" }, { wordIds: [fixture.wordId, fixture.wordId] }, { wordIds: [2147483647] }])
          call(secret, "create_note", { requestId: uuid(), note: { ...note, ...invalid }, folderId: folder.id }).then(r => failure(r));
        for (const name of [" ", "a".repeat(41), "全部笔记", "未归档", "bad\nname"]) call(secret, "preview_create_note_folder", { name }).then(r => failure(r));
        call(secret, "preview_create_note_folder", { name: "无效父级", parentId: 2147483647 }).then(r => failure(r));
      });
      noteApi("").then(r => expect(r.total).to.eq(0));
    });
  });

  it("NOTE-MCP-07 isolates owners and prevents folder and note access across accounts", () => {
    seedFolder().then(folder => token().then(({ token: owner }) => create(owner, folder.id).then(note => {
      call(owner, "preview_update_note", { noteId: note.id, changes: { body: "仅本人能确认" } }).then(r => {
        const preview = success(r);
        login({ username: "automation_other", password: fixture.account.password });
        token().then(({ token: other }) => {
          call(other, "query_notes").then(r => expect(success(r).total).to.eq(0));
          call(other, "list_note_folders").then(r => expect(success(r).list).to.deep.eq([]));
          call(other, "get_note", { noteId: note.id }).then(r => failure(r));
          call(other, "preview_update_note", { noteId: note.id, changes: { body: "越权" } }).then(r => failure(r));
          call(other, "create_note", { requestId: uuid(), folderId: folder.id, note: { title: "越权归类", body: "拒绝" } }).then(r => failure(r));
          call(other, "preview_create_note_folder", { name: "越权子目录", parentId: folder.id }).then(r => failure(r));
          confirm(other, "confirm_update_note", preview).then(r => failure(r));
          call(owner, "get_note", { noteId: note.id }).then(r => expect(success(r).body).to.eq(note.body));
        });
      });
    })));
  });

  it("NOTE-MCP-08 keeps note permissions independent and denies revoked tokens", () => {
    seedFolder().then(folder => token(["words:read", "words:create", "words:update", "words:delete"]).then(({ token: words }) => {
      call(words, "query_notes").then(r => failure(r, "forbidden"));
      call(words, "create_note", { requestId: uuid(), folderId: folder.id, note: { title: "无权限", body: "拒绝" } }).then(r => failure(r, "forbidden"));
      call(words, "preview_create_note_folder", { name: "无权限" }).then(r => failure(r, "forbidden"));
      call(words, "preview_update_note", { noteId: 1, changes: { body: "无权限" } }).then(r => failure(r, "forbidden"));
      token(["notes:read"]).then(({ token: readonly, item }) => {
        call(readonly, "list_note_folders").then(success);
        call(readonly, "create_note", { requestId: uuid(), folderId: folder.id, note: { title: "只读", body: "拒绝" } }).then(r => failure(r, "forbidden"));
        management(`/tokens/${item.id}/revoke`, {});
        rpc(readonly, "tools/call", { name: "query_notes", arguments: {} }).its("status").should("eq", 401);
      });
      noteApi("").then(r => expect(r.total).to.eq(0));
    }));
  });

  it("NOTE-MCP-09 replays create request safely and keeps audit summaries free of note content", () => {
    seedFolder().then(folder => token().then(({ token: secret }) => {
      const requestId = uuid(), note = { title: "唯一请求标题", body: "private-note-body-acceptance", category: "阅读技巧" };
      const args = { requestId, folderId: folder.id, note };
      call(secret, "create_note", args).then(r => {
        const saved = success(r).note;
        call(secret, "create_note", args).then(r => expect(success(r).note.id).to.eq(saved.id));
        call(secret, "create_note", { ...args, note: { ...note, body: "conflicting retry" } }).then(r => failure(r));
        call(secret, "preview_update_note", { noteId: saved.id, changes: { title: note.title } }).then(r => failure(r));
        call(secret, "query_notes", { q: note.title }).then(r => expect(success(r).total).to.eq(1));
        management("/audit").then(log => { const text = JSON.stringify(log); expect(text).not.to.include(note.body); expect(text).not.to.include(note.title); expect(text).not.to.include(secret); expect(log.items).to.have.length.at.most(50); expect(log.items.some((a: any) => a.action === "create_note" && a.outcome === "success")).to.eq(true); });
      });
    }));
  });

  it("NOTE-MCP-11 confirms optional-field clearing, associations and folder changes exactly", () => {
    seedFolder("原目录").then(first => seedFolder("新目录").then(second => token().then(({ token: secret }) => create(secret, first.id, { examples: "旧例句", source: "旧来源", wordIds: [fixture.wordId] }).then(note => {
      const changes = { category: "语法", examples: "", source: "", wordIds: [] as number[], folderId: second.id };
      call(secret, "preview_update_note", { noteId: note.id, changes }).then(r => {
        const preview = success(r);
        expect(preview.after.folderId).to.eq(second.id); expect(preview.after.wordIds).to.deep.eq([]);
        expect(preview.changedFields).to.include.members(["category", "examples", "source", "wordIds", "folderId"]);
        noteApi(`/${note.id}`).then(saved => { expect(saved.folderId).to.eq(first.id); expect(saved.source).to.eq("旧来源"); });
        confirm(secret, "confirm_update_note", preview).then(r => {
          const saved = success(r).note; expect(saved.id).to.eq(note.id); expect(saved.folderId).to.eq(second.id); expect(saved.category).to.eq("语法"); expect(saved.examples).to.eq(""); expect(saved.source).to.eq(""); expect(saved.words).to.deep.eq([]);
        });
        noteApi(`/${note.id}`).then(saved => { expect(saved.folderId).to.eq(second.id); expect(saved.version).to.eq(note.version + 1); });
      });
    }))));
  });

  it("NOTE-MCP-12 rejects deleted or moved targets and deleted proposed parents", () => {
    seedFolder("原目录").then(first => seedFolder("移动目标").then(second => token().then(({ token: secret }) => {
      create(secret, first.id).then(note => call(secret, "preview_update_note", { noteId: note.id, changes: { body: "不应覆盖" } }).then(r => {
        const preview = success(r);
        noteApi("/move", "POST", { folderId: second.id, notes: [{ id: note.id, version: note.version }] });
        confirm(secret, "confirm_update_note", preview).then(r => failure(r));
        noteApi(`/${note.id}`).then(saved => { expect(saved.folderId).to.eq(second.id); expect(saved.body).to.eq(note.body); });
      }));
      create(secret, first.id, { title: "待删笔记" }).then(note => call(secret, "preview_update_note", { noteId: note.id, changes: { body: "不应重建" } }).then(r => {
        const preview = success(r); noteApi(`/${note.id}`, "DELETE");
        confirm(secret, "confirm_update_note", preview).then(r => failure(r));
        call(secret, "query_notes", { q: "待删笔记" }).then(r => expect(success(r).total).to.eq(0));
      }));
      call(secret, "preview_create_note_folder", { name: "失效子目录", parentId: first.id }).then(r => {
        const preview = success(r); noteApi(`/folders/${first.id}`, "DELETE");
        confirm(secret, "confirm_create_note_folder", preview).then(r => failure(r));
        noteApi("/folders").then(f => expect(f.list.map((x: any) => x.name)).not.to.include("失效子目录"));
      });
    })));
  });

  it("NOTE-MCP-13 recovers after a folder is created but note validation fails", () => {
    token().then(({ token: secret }) => call(secret, "preview_create_note_folder", { name: "恢复目录" }).then(r => {
      const preview = success(r);
      confirm(secret, "confirm_create_note_folder", preview).then(r => {
        const folder = success(r).folder;
        call(secret, "create_note", { requestId: uuid(), folderId: folder.id, note: { title: "", body: "恢复正文" } }).then(r => failure(r));
        call(secret, "query_notes").then(r => expect(success(r).total).to.eq(0));
        call(secret, "list_note_folders").then(r => expect(success(r).list.filter((f: any) => f.id === folder.id)).to.have.length(1));
        create(secret, folder.id, { title: "恢复成功" }).then(note => expect(note.folderId).to.eq(folder.id));
        noteApi("/folders").then(f => expect(f.list).to.have.length(1));
      });
    }));
  });

  it("NOTE-MCP-14 enforces duplicate, depth and quantity limits before folder creation", () => {
    token().then(({ token: secret }) => {
      seedFolder("同名目录").then(folder => {
        call(secret, "preview_create_note_folder", { name: "同名目录", parentId: null }).then(r => failure(r));
        const descend = (parentId: number, depth: number): Cypress.Chainable<any> =>
          depth > 5 ? cy.wrap(parentId, { log: false }) : noteApi("/folders", "POST", { name: `层级${depth}`, parentId }).then(child => descend(child.id, depth + 1));
        descend(folder.id, 2).then(last => call(secret, "preview_create_note_folder", { name: "第六层", parentId: last }).then(r => failure(r)));
        cy.wrap(Array.from({ length: 195 }, (_, index) => index), { log: false }).each((index: any) =>
          noteApi("/folders", "POST", { name: `数量边界${index}`, parentId: null }));
        noteApi("/folders").then(r => expect(r.list).to.have.length(200));
        call(secret, "preview_create_note_folder", { name: "第201个" }).then(r => failure(r));
        noteApi("/folders").then(r => expect(r.list).to.have.length(200));
      });
    });
  });

  it("NOTE-MCP-10 exposes separate note permissions in desktop settings without revealing secrets", () => {
    cy.viewport(1280, 900);
    token(permissions, "只供笔记使用").then(() => {
      cy.visit("/englishWorld/settings");
      cy.get(".mcp-access-card").scrollIntoView().should("be.visible");
      cy.get(".mcp-access-token").contains("只供笔记使用").parents(".mcp-access-token").within(() => {
        cy.contains("查询笔记").should("be.visible"); cy.contains("新增笔记").should("be.visible"); cy.contains("修改笔记").should("be.visible"); cy.contains("创建文件夹").should("be.visible");
      });
      cy.get(".mcp-access-card").contains("button", "创建授权").click();
      cy.get(".ant-modal:visible").within(() => {
        for (const label of ["查询笔记", "新增笔记", "修改笔记", "创建文件夹"]) cy.contains("label", label).should("be.visible");
        cy.get("input[type=checkbox]:checked").should("have.length", 1);
        cy.contains("修改").should("exist");
        cy.screenshot("mcp-note-permissions-desktop", { capture: "viewport" });

      });
      cy.get(".ant-modal:visible .ant-modal-close").click();
      cy.get(".ant-modal:visible").should("not.exist");
      cy.get("body").should("not.contain.text", "ew_mcp_");
      cy.document().then(doc => { expect(doc.documentElement.scrollWidth).to.be.at.most(1280); });
    });
  });
});
