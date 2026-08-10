# Five-mode usable learning MVP implementation plan

> **For Codex:** Use subagent-driven development task by task. Preserve existing listening sessions and keep public prompts free of private answer contracts.

**Goal:** Make root-family, micro-scene, confusion, listening, and output selectable and usable in one mixed learning session, with deterministic grading and mastery evidence, then deploy both services.

**Architecture:** Reuse the existing learning-session tables and JSON envelopes; no new schema is needed. Keep `listening-hardened-v2` readable and add strict activity-specific contracts for the other modes. The server remains authoritative for ordering, grading, and evidence; the client only renders the current public item and submits a typed answer.

**Tech Stack:** NestJS, Sequelize/MySQL, React, TypeScript, Vitest, pnpm, GitHub Actions.

---

### Task 1: Implement the four backend activities and mixed orchestration

**Files:**
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/contracts/activity-contract.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/domain/orchestration-policy.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/services/learning-session.service.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/services/attempt-finalization.service.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/repositories/learning-session.repository.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/dto/submit-learning-attempt.dto.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/domain/stored-attempt-result.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-session/domain/learning-session-result.ts`
- Modify: `nestjs/.worktrees/multi-mode-learning-foundation-listening/src/interface/learning-mastery/mastery-projection.service.ts`
- Add: mode activity adapters/registry under `src/interface/learning-session/activities/`
- Test: focused learning-session activity, policy, creation, finalization, and result specs

1. Add failing tests for all four public/private contracts, mixed blocks, typed output answers, mode-specific dimensions, and old-listening compatibility.
2. Add strict activity adapters with deterministic, auditable grading: root/scene/confusion use choice or spelling; output uses guided target-word production. Never expose correct values in public payloads.
3. Enable all five capabilities, build stable blocks in selected mode order, and persist every block/item through the current schema.
4. Dispatch detail and finalization through the adapter registry; record the real mode/dimension and preserve idempotency.
5. Run only the focused learning-session specs and backend build.

### Task 2: Implement the four frontend learning activities

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/learning/contracts/activity-contract.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/contracts/learning-session.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/session/activityRegistry.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/session/learningSessionReducer.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/session/useLearningSession.ts`
- Modify: `apps/english-world/src/page/englishWorld/learning/setup/LearningSetupDrawer.tsx`
- Modify: `apps/english-world/src/page/englishWorld/learning/learning.css`
- Add: `RootFamilyActivity.tsx`, `MicroSceneActivity.tsx`, `ConfusionActivity.tsx`, `OutputActivity.tsx`
- Test: focused contracts, reducer, registry/page, setup drawer, and four activity specs

1. Add failing tests proving every mode renders a real activity and submits its correct answer kind.
2. Generalize public-item unions, drafts, result dimensions, and registry dispatch without `any`-based mode mixing.
3. Add accessible, controlled renderers for the four activities and remove the output-to-skip conversion.
4. Make capability loading gate preview, allow multi-select, and normalize selections against enabled modes.
5. Run only focused learning UI specs and frontend build.

### Task 3: Integrate and release

1. Run backend and frontend builds plus the minimal mixed-session contract smoke checks.
2. Review the diff for answer leakage, stale-item handling, old listening compatibility, and unrelated edits.
3. Commit each repository, push backend to `context-lab-learning-loop-mvp` and frontend to `yifeng/docker-compose`.
4. Wait for both production workflows and verify the deployed page and API capabilities on `https://124.223.157.129/englishWorld/recite`.

