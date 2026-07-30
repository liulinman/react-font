# English World UX Product Audit Skill Design

Date: 2026-07-30
Status: Approved in conversation

## Objective

Install a project-local UX/UI skill stack that finds real usability problems in
English World and converts them into evidence-backed product requirements.
The first version is read-only: it may inspect code, screenshots, browser flows,
tests, product documents, and public references, but it must not modify product
code or deploy changes while running an audit.

## Decision

Use a small routed stack instead of one large generic UI skill:

- `impeccable`: primary UX planning, critique, onboarding, layout, copy,
  responsive adaptation, hardening, and polish.
- `web-design-guidelines`: deterministic second-pass checks for accessibility,
  forms, navigation, focus, touch, responsiveness, performance, and i18n.
- `ui-ux-pro-max`: design-system and visual-reference lookup only. It must not
  replace the existing product identity with a generic template.
- `english-world-ux-product-audit`: project-specific orchestrator that controls
  scope, evidence, severity, requirement format, and stopping rules.
- Existing `bmad-ux`: optional downstream tool for turning approved findings
  into a detailed UX specification. It is not required to run an audit.

Install all vendored skills under `.agents/skills/` in the `react-font`
repository so they are versioned with the project.

## Product Scope

The orchestrator covers these task journeys:

1. Login and account recovery
2. Today's learning plan and cockpit
3. Word library, search, filtering, and bulk import
4. Recite flow, completion, mistakes, and recovery
5. Context Lab generation, waiting, practice, failure, retry, and history
6. IELTS core vocabulary review
7. Memory Map and Word Journey
8. Notifications and account controls
9. Mobile navigation and parity
10. Admin workflows only when explicitly requested

The skill reads the sibling backend repository at `../nestjs` when an observed
experience depends on API state, error handling, persistence, or permissions.

## Audit Workflow

1. Select one user goal and define the start and success state.
2. Read the relevant existing specs, code, tests, and recent commits.
3. Walk the real flow in a browser at desktop and mobile widths.
4. Capture evidence for every finding: screenshot, route, interaction, source
   location, test, or reproducible observation.
5. Run UX critique first, then technical UI checks.
6. Deduplicate symptoms that share one root product problem.
7. Rate severity and confidence.
8. Produce requirements, not implementation.
9. Stop for product approval before editing code or opening implementation work.

## Finding Contract

Every finding must include:

- `ID` and short problem title
- Affected user and user goal
- Reproduction path
- Evidence
- Root problem, separated from visible symptoms
- Severity: P0 blocker, P1 major, P2 moderate, or P3 polish
- Confidence: high, medium, or low
- User and business impact
- Recommended requirement
- Acceptance criteria
- Desktop/mobile applicability
- Dependencies and explicit non-goals

The final report contains a Top 10 backlog. Ordering uses severity, affected
journey frequency, learning-flow impact, confidence, and implementation scope.
Visual taste alone cannot create a P0 or P1 requirement.

## Evidence Rules

- Mark statements as product fact, observed behavior, user evidence, external
  reference, or inference.
- Do not claim user frustration without user evidence; describe observable
  friction instead.
- Do not report an issue from a static screenshot when interaction is required
  to verify it.
- Do not propose a feature already covered by an existing specification without
  explaining the remaining gap.
- Keep learning correctness and recoverability above decorative polish.

## Files

```text
.agents/skills/
  impeccable/
  ui-ux-pro-max/
  web-design-guidelines/
  english-world-ux-product-audit/
    SKILL.md
    agents/openai.yaml
    references/
      product-map.md
      audit-rubric.md
      requirement-template.md
```

No extra README or installation guide is added.

## Validation

Use skill TDD:

1. Run a representative audit prompt without the project skill and record
   omissions.
2. Create the minimum project skill that addresses those omissions.
3. Validate frontmatter and file structure with `quick_validate.py`.
4. Run the same prompt with the skill in a fresh agent context.
5. Confirm it reads project facts, traces a real journey, separates evidence
   from inference, assigns severity, and emits testable requirements.
6. Run a first real browser audit across desktop and mobile and save the report
   under `docs/superpowers/research/`.

## Success Criteria

- The installed skills are project-local and version controlled.
- One command can audit a specified English World journey.
- Findings are reproducible and evidence-backed.
- The output is a prioritized product backlog rather than a style wishlist.
- No audit run changes production code without a separate approved task.
