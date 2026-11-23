# IELTS listening diversity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. User requested autonomous implementation; no repeat approval or commits.

**Goal:** Generate meaningfully different IELTS-style listening materials with verifiable maps and stable retry behavior.
**Architecture:** Persist per-part blueprints, select least-recently-used scene/layout/strategy/combination, validate content and novelty before speech. Server map facts remain authoritative.
**Tech Stack:** existing NestJS/Sequelize/MySQL/TypeScript, React/Vitest, Jest and Cypress.
**Spec:** docs/design/review/ielts-listening-diversity/design.md; specs/005-ielts-listening/spec.md.

## Global Constraints
- Four Parts, ten scoring slots per Part, continuous IDs; original simulation only, no official Band/time claims.
- Eight genuine map topologies across street/park/corridor/exhibition; route/landmark/relative expression strategies.
- At least three curated mixed blueprints per Part, specialty selection preserved; usable form/note/table/flow/summary presentation.
- Own last 20 material documents only; persist blueprint before paid generation. Stable request/retry; legacy ready materials unchanged.
- Duplicate candidates fail before speech and consume existing bounded generation attempts; no automatic paid retries.
- No production writes, secrets, git commit, push or deploy. Existing unrelated dirty files preserved via scoped baselines.

## Review Focus
- Explicit theme conflicting with layout family: preserve user's theme; instruct names and framing to fit both, reject incoherent outputs.
- Concurrent create or same request: serialize using existing user row lock; do not hold DB transaction around AI calls.
- Legacy pending verified/audio: finish without replacing material; apply new plan only to unfinished content with no pending candidate.
- Normal topic/instruction overlap must not be rejected as duplicates; compare substantive structure and anonymized question/evidence patterns.
- Public projection must strip internal blueprint/history and all new answer-bearing fields.

## Task 1: Map facts and variation
Files: nestjs/src/interface/ielts-listening/map-plan.ts, map-layouts.ts, map-plan.spec.ts, map-layouts.spec.ts.
Interfaces: export mapLayoutIds (eight IDs), MapStrategy=route|landmark|relative; buildMapSection(input,part,mixed,conversational=false,options?:{layoutId?:string,strategy?:MapStrategy,mapCount?:number,tailKind?:matching|single}) returns existing Section. Keep old callers valid. mapContentPrompt(part,topic,options?) uses framing appropriate to Part and chosen layout. validatePlannedMapRoutes(section) checks generated diagram/route/evidence consistency including mutated nodes, entrance, route/answer/reference. plannedMapReview includes all actual transcript plus trusted spatial facts.
- [x] Write failing diversity and mutation tests, run Jest and retain red result.
- [x] Implement four families/two topologies each, reachable nodes, unique facts, natural varying controlled English, no answer letters spoken, consecutive evidence order, single/matching tail groups summing to ten.
- [x] Verify all layouts x strategies x Parts; ten unique answers in specialty, mixed counts supported; legacy caller tests remain valid.

## Task 2: Curated blueprint and question structure
Files: nestjs/src/interface/ielts-listening/blueprints.ts, blueprints.spec.ts, material.ts, material.spec.ts; react-font/apps/english-world/src/ieltsListening/{types.ts,IeltsQuestions.tsx,IeltsQuestions.test.tsx} and local CSS.
Interfaces: SectionBlueprint={version:1,id:string,groups:{kind:string,count:number,format?:string}[],focus:string,map?:{layoutId:string,strategy:MapStrategy,mapCount:number,tailKind?:matching|single}}. export blueprintCandidates(part,kind):SectionBlueprint[]; chooseBlueprint(part,kind,recent:SectionBlueprint[],pick?):SectionBlueprint. generationPrompt(part,topic,kind,withTurns=false,blueprint?) consumes exact groups and adds coherence/Part/ordering requirements. validateBlueprint(section,blueprint) rejects drift and out-of-order support (multi-slots share evidence). New optional question metadata category (table) and stage (flow) must be whitelisted in publicMaterial and frontend and checked for real grouping. Preserve old shapes.
- [x] Failing tests for 3+ mixed catalogs/10 marks/even multiple counts, LRU exhaustion, specialty preservation, table/flow semantics, safe projection.
- [x] Implement catalogs including Part2 map6+matching4, map5+single5, single4+matching6; remaining Parts use coherent supported candidates.
- [x] Implement semantic table and ordered flow presentation with existing answer input behavior, legacy fallback; test with keyboard/input preservation and no duplicate DOM IDs.
- [x] Run relevant Jest/Vitest.

## Task 3: Service planning, deduplication and bounded recovery
Files: nestjs/src/interface/ielts-listening/{ielts-listening.service.ts,ielts-listening.topic.spec.ts,novelty.ts,novelty.spec.ts}; integration fixtures and relevant tests.
Interfaces: root integrates tasks 1/2; persisted sectionPlans keyed by Part. recent documents queried only for owner, excluding current id; created_at/id order. Existing user row lock protects creation, check idempotency before provider config. Topic selection uses chosen plan's map presence. novelty helper returns duplicate|review|distinct plus bounded diagnostic; annotate semantic review for suspicious candidates, reject obvious repeats before speech. No public exposure of plans or history.
- [x] Write and watch fail tests for repeated-only name/number text, legitimate same-topic examples, missing history and common instruction overlap.
- [x] Add user-lock transaction, stable create/legacy plan materialization, newest-first LRU excluding recently used exact combinations. Same request returns saved document without reallocation.
- [x] Wire blueprint and map options through creation/preparation, validate actual group plan and evidence order, reject/review novelty before audio; retry retains plan and feedback without refunding attempts.
- [x] Integration assertions for actual MySQL concurrency/idempotency/privacy/duplicate-no-speech and fixtures matching supplied templates.

## Task 4: Verification, docs and delivery
Files: formal PRD and decision log, existing Spec/traceability, docs testing cases, Cypress relevant suite, public ai/listening-flow.md and changelog, delivery records.
- [x] Preserve FR01-16/AC01-14 and explicitly revise historical fixed Part2 rule; add FR17+ and AC15+ for approved design.
- [x] Verify Jest full backend suite, scoped frontend tests/type/build, PRD catalog and docs checks/build; run isolated IELTS Cypress with Cloud through project runner and inspect evidence. Record blockers, no fake passes.
- [x] Review final changed files against baselines with independent reviewer, fix defects and rerun affected checks.
- [x] Archive run manifest, requirement/Spec mapping, source hashes, report and actual Cloud URL; real-provider/real-audio quality stays unverified unless actually tested within authorized limits.


2026-11-04执行说明：任务勾选表示代码、审查与验证动作已执行，不代表全部质量门禁已通过。真实文本Part1/2/4样本通过，Part3三次生成仍被信息顺序门禁拒绝；真实新音频未验，PRD复合覆盖缺口及全套既有失败见本轮delivery.md。最近历史按每个Part分别查询本人20份相关材料，created_at/planningOrder/id稳定排序。
