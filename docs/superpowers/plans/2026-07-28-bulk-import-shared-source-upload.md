# Batch Import Shared Source Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one authenticated web/file source to a batch import and persist uploaded PDF/image files across production deployments.

**Architecture:** NestJS writes validated source files to a Docker volume and streams them through an authenticated owner-only endpoint. React stores the returned same-origin URL as every imported word's existing `englishReference`, preserving current preview, conflict, and import contracts.

**Tech Stack:** NestJS 10, Multer, Node.js filesystem streams, Jest, React 18, Ant Design 5, Vitest/Testing Library, Docker Compose, GitHub Actions.

## Global Constraints

- One batch import has at most one shared source.
- Source modes are none, external web URL, or uploaded PDF/image.
- Accepted uploads are PDF, PNG, JPEG, and WebP up to 20 MB.
- Uploaded files require the existing login cookie and are readable only by their owner.
- Uploaded files survive backend container rebuilds through a named Docker volume.
- Continue storing the final URL in the existing `englishReference` field; do not add a database column.
- Existing Context Lab references and OSS image uploads remain compatible.

---

### Task 1: Authenticated Persistent Source Storage

**Files:**
- Create: `../nestjs/src/interface/upload/source-file-storage.service.ts`
- Create: `../nestjs/src/interface/upload/source-file-storage.service.spec.ts`
- Modify: `../nestjs/src/interface/upload/upload.controller.ts`
- Modify: `../nestjs/src/interface/upload/upload.module.ts`
- Modify: `../nestjs/src/common/interceptors/transform.interceptor.ts`

**Interfaces:**
- Consumes: authenticated user objects shaped as `{ id: number }`.
- Produces: `saveSourceFile(file, ownerId): Promise<SourceFileUploadResult>` and `openSourceFile(ownerId, storageName): Promise<SourceFileDownload>`.
- Produces: `POST /upload/source-file` and `GET /upload/source-file/:ownerId/:storageName`.

- [ ] **Step 1: Write failing storage-service tests**

Cover a PDF save, an invalid MIME/extension pair, an owner path, a missing
file, and a traversal-style filename. Assert the saved result shape:

```ts
{
  url: "/api/upload/source-file/7/<uuid>.pdf",
  originalName: "lesson.pdf",
  mimeType: "application/pdf",
  size: 123
}
```

- [ ] **Step 2: Run the storage tests and verify failure**

Run:

```bash
cd ../nestjs
pnpm test --runInBand source-file-storage.service.spec.ts
```

Expected: FAIL because `SourceFileStorageService` does not exist.

- [ ] **Step 3: Implement validated local storage**

Use `SOURCE_UPLOAD_DIR || "/app/uploads/sources"`, `crypto.randomUUID()`,
`fs/promises.mkdir`, `fs/promises.writeFile`, and a fixed MIME-to-extension
map. Keep all filesystem paths below `<root>/<ownerId>/`.

- [ ] **Step 4: Add authenticated upload and streaming routes**

Apply `@UseGuards(AuthGuard)` to `UploadController`, use
`FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } })`, and
obtain the current user through `@CurrentUser()`. Return `StreamableFile` with
`Content-Type` and `Content-Disposition: inline`; reject a route whose
`ownerId !== user.id`.

- [ ] **Step 5: Preserve binary responses in the global interceptor**

Return `StreamableFile` instances directly rather than wrapping them in
`{ code, data, message }`.

- [ ] **Step 6: Run focused and full backend verification**

Run:

```bash
cd ../nestjs
pnpm test --runInBand source-file-storage.service.spec.ts
pnpm test --runInBand
pnpm build
```

Expected: all tests and the build pass.

- [ ] **Step 7: Commit backend storage**

```bash
cd ../nestjs
git add src/interface/upload src/common/interceptors/transform.interceptor.ts
git commit -m "feat: store authenticated learning sources"
```

### Task 2: Shared Source Form And Upload Client

**Files:**
- Create: `apps/english-world/src/page/englishWorld/bulkImport/BulkImportSourceField.tsx`
- Create: `apps/english-world/src/page/englishWorld/bulkImport/BulkImportSourceField.test.tsx`
- Modify: `apps/english-world/src/server/word/word.ts`
- Modify: `apps/english-world/src/server/word/word.type.ts`
- Modify: `apps/english-world/src/page/englishWorld/bulkImport/BulkImportPage.tsx`

**Interfaces:**
- Consumes: `sourceFileUpload(FormData)` request descriptor.
- Produces: `SharedImportSource = { mode: "none" | "url" | "file"; url: string; name?: string }`.
- Produces: `onChange(source)` whenever mode, URL, or upload result changes.

- [ ] **Step 1: Write failing component tests**

Assert that the component:

```tsx
<BulkImportSourceField
  value={{ mode: "none", url: "" }}
  onChange={onChange}
/>
```

switches between three source modes, rejects an invalid web URL, uploads one
accepted file, shows its name, and clears the previous source when modes
change.

- [ ] **Step 2: Run the component test and verify failure**

Run:

```bash
pnpm --filter english-world test -- BulkImportSourceField.test.tsx
```

Expected: FAIL because the component and API request do not exist.

- [ ] **Step 3: Add the typed upload request**

Add:

```ts
export type SourceFileUploadResult = {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export const sourceFileUpload = (
  data: FormData,
): YTRequest<SourceFileUploadResult> => ({
  url: "/upload/source-file",
  method: "POST",
  data,
  __responseType: undefined as unknown as SourceFileUploadResult,
});
```

- [ ] **Step 4: Implement the compact shared-source control**

Use an Ant Design segmented control for `无来源 / 网页链接 / 上传文件`, an URL
input for web mode, and `Upload` with `customRequest` for file mode. Accept
`.pdf,.png,.jpg,.jpeg,.webp` and show upload progress/error without putting a
card inside the existing form card.

- [ ] **Step 5: Mount the control on the batch-import page**

Keep `sharedSource` in page state below the AI completion switch. Before a
preview request, validate URL mode and keep file mode disabled until upload
finishes.

- [ ] **Step 6: Run focused frontend verification**

Run:

```bash
pnpm --filter english-world test -- BulkImportSourceField.test.tsx
pnpm --filter english-world typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 7: Commit the shared-source form**

```bash
git add apps/english-world/src/page/englishWorld/bulkImport apps/english-world/src/server/word
git commit -m "feat: add shared source to batch import"
```

### Task 3: Apply And Display Shared Source References

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/bulkImport/BulkImportPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/bulkImport/BulkImportPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/bulkImport/BulkImportPreviewModal.tsx`
- Modify: `apps/english-world/src/page/englishWorld/utils/contextLabReference.ts`
- Modify: `apps/english-world/src/page/englishWorld/utils/contextLabReference.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/useColumns.tsx`

**Interfaces:**
- Consumes: `SharedImportSource.url`.
- Produces: every preview/import item has the common URL in
  `englishReference`.
- Produces: `isNavigableReference(reference)` for external and protected
  same-origin source URLs.

- [ ] **Step 1: Write failing integration tests**

For URL and uploaded-file sources, assert:

```ts
expect(importRequest.words.every(
  (word) => word.englishReference === selectedSourceUrl,
)).toBe(true);
```

Also assert the preview modal displays the selected source once and that a
`/api/upload/source-file/...` reference renders as a new-tab link.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
pnpm --filter english-world test -- BulkImportPage.test.tsx contextLabReference.test.ts
```

Expected: FAIL because shared sources are not applied or recognized.

- [ ] **Step 3: Apply the source before preview and import**

Map preview responses through:

```ts
const applySharedSource = (items: BulkImportWordPreview[]) =>
  items.map((item) => ({
    ...item,
    ...(sharedSource.url
      ? { englishReference: sharedSource.url }
      : { englishReference: undefined }),
  }));
```

Use the mapped items for the preview modal, conflict preview, overwrite
confirmation, and final import payload.

- [ ] **Step 4: Show the source once in the preview modal**

Add a read-only shared-source row with an external-link icon and filename/URL.
Do not repeat the URL in every word editor.

- [ ] **Step 5: Recognize protected file references**

Replace the external-only check with:

```ts
export function isNavigableReference(reference?: string | null) {
  return Boolean(
    reference?.startsWith("http://") ||
      reference?.startsWith("https://") ||
      reference?.startsWith("/api/upload/source-file/"),
  );
}
```

Keep Context Lab references on their existing internal navigation path.

- [ ] **Step 6: Run full frontend verification**

Run:

```bash
pnpm --filter english-world test
pnpm --filter english-world typecheck
pnpm build
```

Expected: all tests, typecheck, and build pass.

- [ ] **Step 7: Commit source application and display**

```bash
git add apps/english-world/src/page/englishWorld
git commit -m "feat: apply shared references to imported words"
```

### Task 4: Persistent Production Deployment And Online Verification

**Files:**
- Create: `../nestjs/deploy/docker-compose.override.yml`
- Modify: `../nestjs/.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `SOURCE_UPLOAD_DIR=/app/uploads/sources`.
- Produces: Docker named volume `source-upload-data` mounted at
  `/app/uploads` for the backend service.

- [ ] **Step 1: Add the Compose override**

Create:

```yaml
services:
  backend:
    environment:
      SOURCE_UPLOAD_DIR: /app/uploads/sources
    volumes:
      - source-upload-data:/app/uploads

volumes:
  source-upload-data:
```

- [ ] **Step 2: Make CI install and validate the override**

After source rsync, copy the override to
`/opt/english-world/deploy/docker-compose.override.yml`, run
`docker compose config --quiet`, then retain the existing targeted
`build backend` and `up -d --no-deps backend` commands.

- [ ] **Step 3: Run workflow syntax and repository checks**

Run:

```bash
cd ../nestjs
pnpm test --runInBand
pnpm build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 4: Commit and push backend deployment changes**

```bash
git add deploy/docker-compose.override.yml .github/workflows/deploy.yml
git commit -m "ci: persist uploaded learning sources"
git push origin context-lab-learning-loop-mvp
```

- [ ] **Step 5: Push frontend commits**

```bash
git push origin yifeng/docker-compose
```

- [ ] **Step 6: Wait for both GitHub Actions deployments**

Verify the backend and frontend workflow runs complete successfully before
testing production.

- [ ] **Step 7: Verify production behavior**

Check:

```bash
sudo docker compose config --quiet
sudo docker volume inspect deploy_source-upload-data
sudo docker inspect english-world-redis --format '{{.Id}} {{.RestartCount}}'
```

Then use an authenticated browser session to upload a small PDF, open its
returned URL, confirm an unauthenticated request returns `401`, recreate only
the backend service, and confirm the authenticated URL still opens.

- [ ] **Step 8: Record final commit IDs and deployment results**

Report backend/frontend commit SHAs, Action URLs, test counts, production
container restart counts, Redis continuity, and the persistent upload-volume
name.
