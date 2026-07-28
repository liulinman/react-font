# Source File Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete uncommitted uploaded learning sources while protecting files already referenced by vocabulary.

**Architecture:** The authenticated upload controller exposes an owner-scoped delete endpoint. A reference guard checks the vocabulary table before the storage service removes the file and metadata; the batch-import source field calls this endpoint behind a confirmation interaction and clears committed source state after a successful import.

**Tech Stack:** NestJS, Sequelize, Jest, React, Ant Design, Vitest, GitHub Actions, Docker Compose.

## Global Constraints

- Only the authenticated owner can delete an uploaded source.
- Files referenced by vocabulary must not be deleted.
- Missing and cross-owner files must be returned as not found.
- Deployment must happen through the existing GitHub Actions workflows after push.

---

### Task 1: Authenticated Source Deletion API

**Files:**
- Modify: `nestjs/src/interface/upload/source-file-storage.service.ts`
- Modify: `nestjs/src/interface/upload/source-file-storage.service.spec.ts`
- Modify: `nestjs/src/interface/upload/upload.controller.ts`
- Modify: `nestjs/src/interface/upload/upload.controller.spec.ts`

**Interfaces:**
- Produces: `SourceFileStorageService.deleteSourceFile(ownerId: number, storageName: string): Promise<void>`
- Produces: `DELETE /upload/source-file/:storageName`

- [ ] **Step 1: Write failing storage and controller tests**

Add tests that save a PDF, call `deleteSourceFile`, and assert both the PDF and
JSON sidecar are absent. Add controller tests that verify the authenticated
user ID is passed to deletion and a referenced URL raises `ConflictException`.

- [ ] **Step 2: Run focused backend tests and verify failure**

Run:

```bash
pnpm exec jest src/interface/upload/source-file-storage.service.spec.ts src/interface/upload/upload.controller.spec.ts --runInBand
```

Expected: failure because `deleteSourceFile` and the controller route do not
exist.

- [ ] **Step 3: Implement deletion and reference protection**

Validate `storageName` with the existing storage-name pattern, verify the file
exists under the authenticated owner directory, and remove the file plus its
metadata. Before deletion, query the current user's vocabulary for:

```ts
{
  userId,
  englishReference: `/api/upload/source-file/${userId}/${storageName}`,
}
```

Return HTTP 409 when the reference count is non-zero.

- [ ] **Step 4: Run focused and full backend verification**

Run:

```bash
pnpm exec jest src/interface/upload/source-file-storage.service.spec.ts src/interface/upload/upload.controller.spec.ts --runInBand
pnpm exec jest --runInBand
pnpm build
```

Expected: all commands pass.

- [ ] **Step 5: Commit backend**

```bash
git add src/interface/upload
git commit -m "feat: delete unused uploaded sources"
```

### Task 2: Batch Import Delete Interaction

**Files:**
- Modify: `react-font/apps/english-world/src/server/word/word.ts`
- Modify: `react-font/apps/english-world/src/server/word/word.type.ts`
- Modify: `react-font/apps/english-world/src/page/englishWorld/bulkImport/bulkImportSource.ts`
- Modify: `react-font/apps/english-world/src/page/englishWorld/bulkImport/BulkImportSourceField.tsx`
- Modify: `react-font/apps/english-world/src/page/englishWorld/bulkImport/BulkImportSourceField.test.tsx`
- Modify: `react-font/apps/english-world/src/page/englishWorld/bulkImport/BulkImportPage.tsx`
- Modify: `react-font/apps/english-world/src/page/englishWorld/bulkImport/BulkImportPage.test.tsx`

**Interfaces:**
- Consumes: `DELETE /upload/source-file/:storageName`
- Produces: `sourceFileDelete(storageName: string)`
- Produces: `SharedImportSource.storageName?: string`

- [ ] **Step 1: Write failing frontend tests**

Test that confirming the trash action sends:

```ts
{
  url: "/upload/source-file/11111111-1111-4111-8111-111111111111.pdf",
  method: "DELETE",
}
```

and then clears the source. Test that a failed request keeps the source visible.
Test that a successful import clears the source control without calling the
delete endpoint.

- [ ] **Step 2: Run focused frontend tests and verify failure**

Run:

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/bulkImport/BulkImportSourceField.test.tsx \
  src/page/englishWorld/bulkImport/BulkImportPage.test.tsx \
  --no-file-parallelism
```

Expected: failure because deleting currently only clears React state.

- [ ] **Step 3: Implement the delete request and UI state**

Keep the upload response `storageName`, show confirmation on the trash button,
call `sourceFileDelete`, and clear state only after success. Keep the selected
file visible on request failure. When inserted or updated words reference the
file, reset the source field locally after import without deleting the file.

- [ ] **Step 4: Run focused and full frontend verification**

Run:

```bash
pnpm --filter @font/english-world exec vitest run \
  src/page/englishWorld/bulkImport/BulkImportSourceField.test.tsx \
  src/page/englishWorld/bulkImport/BulkImportPage.test.tsx \
  --no-file-parallelism
pnpm --filter @font/english-world exec vitest run --no-file-parallelism
pnpm --filter @font/english-world build
```

Expected: all commands pass.

- [ ] **Step 5: Commit frontend**

```bash
git add apps/english-world/src
git commit -m "feat: delete unused batch source files"
```

### Task 3: Push and Production Verification

**Files:**
- Verify: `nestjs/.github/workflows/deploy.yml`
- Verify: `react-font/.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: existing push-triggered deployment workflows.
- Produces: deployed frontend and backend revisions.

- [ ] **Step 1: Push backend and frontend branches**

Run:

```bash
git push origin context-lab-learning-loop-mvp
git push origin yifeng/docker-compose
```

- [ ] **Step 2: Wait for both GitHub Actions runs**

Expected: backend and frontend verification and deployment jobs conclude with
`success`.

- [ ] **Step 3: Verify production deletion**

Upload a small authenticated source, delete it, and verify authenticated GET
returns 404. Confirm unauthenticated DELETE returns 401 and Redis retains the
same container ID with restart count zero.
