// UI regression with API fixtures; does not claim real service/content acceptance.
const task = {
  id: 37, taskId: 37, articleExerciseId: 37, status: "succeeded", sourceType: "custom",
  words: ["community", "gardens"], article: "Community Gardens\n\nGardens help local communities share food and knowledge.",
  questions: [{ id: "q1", stem: "What do gardens help communities share?", options: ["Food and knowledge", "Cars", "Oil"] }],
};
describe("Reading workspace usability", () => {
  beforeEach(() => {
    cy.intercept("POST", "**/user/getCurrentUser", { code: 200, data: { id: 1, username: "tester", avatar: "" } });
    cy.intercept("GET", "**/notifications?*", { code: 200, data: { list: [], total: 0 } });
    cy.intercept("GET", "**/notifications/unread-count", { code: 200, data: { count: 0 } });
    for (const path of ["notifications/events", "context-lab/task-events"]) cy.intercept("GET", `**/${path}`, { statusCode: 200, headers: { "content-type": "text/event-stream" }, body: "" });
    cy.intercept("POST", "**/context-lab/history", { code: 200, data: { list: [task], total: 1 } });
    cy.intercept("POST", "**/context-lab/detail", { code: 200, data: task });
    cy.intercept("GET", "**/api/reading-practices?*", { code: 200, data: { list: [], total: 0 } });
    cy.intercept("POST", "**/english/filterWordList", { code: 200, data: { list: [], total: 0, totalPages: 0 } }).as("words");
  });
  it("uses a neutral theme and submits search on Enter with preserved collapsed filters", () => {
    cy.viewport(1440, 900);
    cy.visit("/englishWorld/words");
    cy.wait("@words");
    cy.get(".english-world-shell").should("have.css", "background-color", "rgb(245, 247, 251)");
    cy.get('input[placeholder="搜索单词或短语"]').type("  apple  {enter}");
    cy.get("@words.all").should((requests: any) => expect(requests.some((r: any) => r.request.body.englishWord === "apple")).to.equal(true));
    cy.contains("button", "更多筛选").click();
    cy.get("#englishType").click();
    cy.get(".ant-select-item-option-content").contains("短语").click();
    cy.contains("button", "收起筛选").click();
    cy.get('button[type="submit"]').click();
    cy.get("@words.all").should((requests: any) => expect(requests.some((r: any) => r.request.body.englishType === 1)).to.equal(true));
    cy.get(".english-world-search-row").should($row => expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth));
    cy.screenshot("search-neutral-theme", { capture: "viewport" });
  });
  it("unifies the legacy entry, restores exam after refresh and exits without a source popup", () => {
    cy.viewport(1440, 900);
    cy.visit("/englishWorld/context-lab");
    cy.location("pathname").should("eq", "/englishWorld/reading-practices");
    cy.get('[role="tab"]').contains("雅思考试").click();
    cy.contains("button", "进入考试").should("be.visible");
    cy.screenshot("reading-workspace-desktop", { capture: "viewport" });
    cy.contains("button", "进入考试").click();
    cy.location("search").should("contain", "taskId=37");
    cy.contains("button", "开始考试").click();
    cy.get('.ielts-exam-questions input[type="radio"]').first().check();
    cy.reload();
    cy.get('.ielts-exam-questions input[type="radio"]').first().should("be.checked");
    cy.get('.ant-modal').should("not.exist");
    cy.screenshot("reading-exam-restored", { capture: "viewport" });
  });
  it("keeps reading modes accessible on narrow screens", () => {
    cy.viewport(390, 844);
    cy.visit("/mobile/reading-practices");
    cy.get('[role="tab"]').contains("自主练习").should("have.attr", "aria-selected", "true");
    cy.get('[role="tab"]').contains("自己出题").click();
    cy.contains("h2", "自己出题").should("be.visible");
    cy.get("body").then($body => expect($body[0].scrollWidth).to.be.at.most(390));
    cy.screenshot("reading-workspace-narrow", { capture: "viewport" });
  });
});

describe("Admin refresh position", () => {
  it("retains the selected section across refresh and browser navigation", () => {
    cy.viewport(1440, 900);
    cy.intercept("GET", "**/api/admin/me", { code: 200, data: { username: "admin" } });
    for (const path of ["users", "notifications", "notification-schedules"]) cy.intercept("GET", `**/api/admin/${path}*`, { code: 200, data: { list: [], total: 0 } });
    cy.visit("http://127.0.0.1:5188/admin/?section=schedules");
    cy.contains("h1", "定时任务").should("be.visible");
    cy.get("nav button").contains("历史记录").click();
    cy.location("search").should("contain", "section=history");
    cy.reload();
    cy.contains("h1", "历史记录").should("be.visible");
    cy.get("nav button").contains("用户管理").click();
    cy.go("back");
    cy.contains("h1", "历史记录").should("be.visible");
    cy.screenshot("admin-refreshed-position", { capture: "viewport" });
  });
});
