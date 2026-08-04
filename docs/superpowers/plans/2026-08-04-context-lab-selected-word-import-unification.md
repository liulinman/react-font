# Context Lab Selected Word Import Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Context Lab's single selected-word save action use the same safe lemmatization, editable preview, duplicate handling, and import contract as marked-word batch import.

**Architecture:** Replace the `word-agent -> EditAddModal -> addEnglishWord` save path with a shared preview launcher that accepts one or many `MarkedVocabularyItem` values and calls `wordImportMissingEnrichPreview`. Track whether the preview came from a single selection or the marked-word collection so a successful single import never clears unrelated marked words. Translation remains on `wordAgentQuery`.

**Tech Stack:** React 18, TypeScript, Ant Design, Vitest, Testing Library, Cypress, existing English World request helpers.

## Global Constraints

- Desktop Context Lab only; do not change the mobile flow.
- Reuse `BulkImportPreviewModal`, `BulkImportConflictModal`, `wordImportMissingEnrichPreview`, `wordImportMissingPreview`, and `wordImportMissing`.
- Open the preview immediately before AI enrichment completes.
- Preserve user edits against late AI responses and preserve the current Context Lab reference.
- Ignore enrichment responses belonging to a preview the user already closed or replaced.
- Do not change the independent “翻译” action.
- Do not add a new lemmatization algorithm or backend endpoint.
- A single-word import must not mutate or clear the existing marked-word collection.

---

### Task 1: Unify single and marked-word preview entry points

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`

**Interfaces:**
- Consumes: `buildMarkedVocabularyItem`, `mergeImportPreviewWithEnrichment`, and the existing bulk-import request helpers.
- Produces: one local `openImportPreviewWithAi(words, source)` entry point where `source` is `"single" | "marked"`; both UI actions call it.

- [ ] **Step 1: Replace the old single-add test with a failing unified-preview test**

Change `adds selected article text to the word library through AI completion` so the selected text is `insects`. Mock `/english/importMissingWords/enrich-preview` to return:

```ts
{
  received: 1,
  aiEnhanced: true,
  items: [{
    englishWord: "insect",
    englishPhonetic: "/ˈɪnsekt/",
    englishChinese: "昆虫",
    englishPartSpeech: [2],
    englishLevel: 0,
    englishType: 0,
    englishNote: "原始词形：insects（复数形式）",
    englishReference: "AI 批量导入",
  }],
}
```

Assert that clicking “一键添加到词库” immediately opens the `导入预览` region, later displays `insect`, retains the original-form note, and never opens `添加单词`. Confirm import and assert the final request contains:

```ts
expect.objectContaining({
  englishWord: "insect",
  englishNote: "原始词形：insects（复数形式）",
  englishReference:
    "/englishWorld/context-lab?taskId=12&articleExerciseId=88&word=insects",
})
```

Also assert no request uses `/word-agent/query`, `/english/existEnglishWord`, or `/english/AddEnglishWord` during this save path.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/contextLab/ContextLabPage.test.tsx \
  -t "adds selected article text to the word library through AI completion"
```

Expected: FAIL because the current handler renders `EditAddModal` rather than the unified preview.

- [ ] **Step 3: Add failing isolation and error-retention tests**

```ts
it("keeps marked words after importing one directly selected word", async () => {
  // Mark "urban farming", directly import "insects", then assert the Marked
  // panel still contains "urban farming" after the single import succeeds.
});

it("keeps the selected word editable when AI enrichment fails", async () => {
  // Reject enrich-preview, then assert the preview remains open with
  // "insects" in the word input and no EditAddModal.
});

it("ignores enrichment after the selected-word preview is closed", async () => {
  // Keep enrich-preview pending, close the preview, resolve the request, and
  // assert no preview content or AI loading state is restored.
});
```

The first test must exercise both entry points in one render. The second must assert UI state, not only a mocked message.

- [ ] **Step 4: Run the new tests and verify RED**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/contextLab/ContextLabPage.test.tsx \
  -t "keeps marked words after importing one directly selected word|keeps the selected word editable when AI enrichment fails"
```

Expected: FAIL because the single action still uses the old modal and has no preview-source isolation.

- [ ] **Step 5: Implement one shared preview launcher**

Add:

```ts
type ImportPreviewSource = "single" | "marked";
```

Add state for the active preview source plus an `importPreviewRequestIdRef`. Each new preview increments the ref and captures its own request ID. Replace the duplicated batch launcher body with:

```ts
const openImportPreviewWithAi = async (
  wordsSnapshot: MarkedVocabularyItem[],
  source: ImportPreviewSource,
) => {
  const requestId = ++importPreviewRequestIdRef.current;
  setImportPreviewSource(source);
  setImportPreviewWords(wordsSnapshot);
  setImportOverwriteExisting(false);
  setImportConflict(null);
  setImportPreviewOpen(true);
  setImportingMarkedWords(true);
  try {
    const response = await request<ImportMissingWordsEnrichPreviewResult>(
      wordImportMissingEnrichPreview({
        words: wordsSnapshot.map(toImportWordPayload),
        defaultLevel: 0,
        useAi: true,
      }),
    );
    if (requestId !== importPreviewRequestIdRef.current) return;
    setImportPreviewWords((current) =>
      mergeImportPreviewWithEnrichment(
        current.length ? current : wordsSnapshot,
        wordsSnapshot,
        response.items ?? [],
      ),
    );
  } catch (error: unknown) {
    if (requestId !== importPreviewRequestIdRef.current) return;
    message.error(
      error instanceof Error ? error.message : "AI 补全标记词失败",
    );
  } finally {
    if (requestId === importPreviewRequestIdRef.current) {
      setImportingMarkedWords(false);
    }
  }
};
```

`handleImportMarkedVocabulary` calls `openImportPreviewWithAi(markedVocabulary, "marked")`.

`handleAddSelectedVocabulary` builds one item with `buildMarkedVocabularyItem`, closes the menu, clears the browser selection, and calls `openImportPreviewWithAi([item], "single")`. It must not call `querySelectedVocabulary`.

- [ ] **Step 6: Isolate cleanup and remove the legacy add path**

Create a preview-only reset helper that increments `importPreviewRequestIdRef` and clears preview open state, words, overwrite, conflict, source, and loading without touching `markedVocabulary`.

After successful import:

```ts
if (importPreviewSource === "marked") {
  setMarkedVocabulary([]);
}
resetImportPreview();
```

Remove `wordAdd`, `wordExist`, `EditAddModal`, `AddInitialValues`, `wordAgentItemToAddInitial`, `addingSelectedWord`, `addModalVisible`, `addInitialValues`, `handleAddModalOk`, `handleAddModalCancel`, and the rendered `EditAddModal`.

Keep `wordAgentQuery`, `WordAgentItem`, and `querySelectedVocabulary` for “翻译”. Remove the loading prop from “一键添加到词库” because the preview opens synchronously and owns the AI loading indicator.

- [ ] **Step 7: Run focused tests and verify GREEN**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/contextLab/ContextLabPage.test.tsx \
  -t "adds selected article text to the word library through AI completion|keeps marked words after importing one directly selected word|keeps the selected word editable when AI enrichment fails|ignores enrichment after the selected-word preview is closed|opens the import preview immediately while AI completion is still loading|opens editable AI-completed word preview before importing marked words|warns about existing marked words before importing when overwrite is off"
```

Expected: all selected tests PASS.

- [ ] **Step 8: Run the whole Context Lab suite**

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/contextLab/ContextLabPage.test.tsx \
  --testTimeout=60000
```

Expected: all Context Lab tests PASS; only existing Ant Design/jsdom warnings may remain.

- [ ] **Step 9: Commit the component flow**

```bash
git add apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx \
  apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
git diff --cached --check
git commit -m "fix(context-lab): unify selected word import preview" \
  -m "Co-Authored-By-AI: true"
```

---

### Task 2: Add browser-level selected-word lemma coverage

**Files:**
- Create: `apps/english-world/cypress/e2e/context-lab-selected-word-import.cy.ts`

**Interfaces:**
- Consumes: the production Context Lab route and the three import endpoints used in Task 1.
- Produces: one Cypress scenario from article selection to imported lemma.

- [ ] **Step 1: Write the Cypress scenario**

Mock authentication, config, notifications, and Context Lab history with one succeeded task whose article contains `insects`. Select the exact text via a DOM range and right-click:

```ts
cy.contains(".context-lab-article-paragraph", "insects").then(($paragraph) => {
  const paragraph = $paragraph[0];
  const textNode = [...paragraph.childNodes].find((node) =>
    node.textContent?.includes("insects"),
  );
  expect(textNode).to.exist;
  const start = textNode!.textContent!.indexOf("insects");
  const range = document.createRange();
  range.setStart(textNode!, start);
  range.setEnd(textNode!, start + "insects".length);
  const selection = paragraph.ownerDocument.defaultView!.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  cy.wrap($paragraph).rightclick();
});
```

Mock enrichment to return `insect` and the original-form note. Mock import preview with no conflicts. Assert the final import request contains the lemma and Context Lab reference, the unified preview is visible, and no `添加单词` title appears.

- [ ] **Step 2: Run Cypress**

```bash
pnpm --filter @font/english-world exec start-server-and-test \
  "vite --host 127.0.0.1 --port 5175 --strictPort" \
  http://127.0.0.1:5175 \
  "cypress run --spec cypress/e2e/context-lab-selected-word-import.cy.ts"
```

Expected: 1 spec, 1 test, 1 passing.

- [ ] **Step 3: Commit browser coverage**

```bash
git add apps/english-world/cypress/e2e/context-lab-selected-word-import.cy.ts
git diff --cached --check
git commit -m "test(context-lab): cover selected word lemma import" \
  -m "Co-Authored-By-AI: true"
```

---

### Task 3: Final verification and delivery

**Files:**
- Verify only; no planned production changes.

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: a verified, pushed branch and successful production deployment.

- [ ] **Step 1: Run changed-file lint**

```bash
pnpm --filter @font/english-world exec eslint \
  src/page/englishWorld/contextLab/ContextLabPage.tsx \
  src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: 0 errors; report existing warnings.

- [ ] **Step 2: Run full tests and build**

```bash
pnpm --filter @font/english-world exec vitest run \
  --no-file-parallelism --testTimeout=60000
pnpm --filter @font/english-world build
```

Expected: all tests PASS and production build succeeds.

- [ ] **Step 3: Re-run the Cypress spec**

Run the Task 2 Cypress command again. Expected: 1 passing.

- [ ] **Step 4: Run final repository checks**

```bash
git diff --check origin/yifeng/docker-compose...HEAD
git status --short
git log --oneline --decorate -6
```

Expected: no whitespace errors, no uncommitted files, and all planned commits present.

- [ ] **Step 5: Review and push**

Use `pre-push-mr-review` against `origin/yifeng/docker-compose...HEAD`. Push only with no Critical or Warning findings:

```bash
git push origin yifeng/docker-compose
```

Fetch and verify local `HEAD` equals `origin/yifeng/docker-compose`.

- [ ] **Step 6: Verify deployment**

Monitor the `Verify and deploy frontend` GitHub Actions run until success. Fetch production HTML and its JavaScript asset from `http://124.223.157.129/` with cache busting and verify the deployed bundle contains the unified selected-word preview behavior.
