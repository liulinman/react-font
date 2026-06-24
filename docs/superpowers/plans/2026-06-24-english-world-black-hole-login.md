# English World Black Hole Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the interactive login background into a cinematic black-hole gravity field.

**Architecture:** Keep the existing login form and Canvas component boundaries. Replace the background asset, export a testable gravity-well configuration from `LoginStarfieldCanvas.tsx`, and use Canvas 2D to draw accretion glow, gravity-bent star motion, and elliptical click waves.

**Tech Stack:** React 18, TypeScript, Canvas 2D API, Vitest, Testing Library, GPT Image 2 generated PNG.

## Global Constraints

- Preserve existing login/register behavior and `data-cy` selectors.
- Do not add Three.js or a heavy 3D engine.
- Do not change backend, routes, or auth.
- Do not directly recreate any movie frame.
- Keep the login card readable on desktop and mobile.
- Avoid touching unrelated dirty files in the repo.

---

## File Structure

- Create: `apps/english-world/src/assets/login-black-hole-vocabulary.png`
  - GPT Image 2 generated black-hole background.
- Modify: `apps/english-world/src/page/login/Login.tsx`
  - Import the black-hole asset instead of the old starry background.
- Modify: `apps/english-world/src/page/login/LoginStarfieldCanvas.tsx`
  - Export `BLACK_HOLE_GRAVITY`.
  - Draw accretion glow and gravity waves.
  - Bend star movement toward the black-hole center.
- Modify: `apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx`
  - Add a failing test for `BLACK_HOLE_GRAVITY`.
- Modify: `apps/english-world/src/page/login/Login.css`
  - Tune overlay contrast and warm black-hole lighting.

### Task 1: Generate the Black-Hole Background

**Files:**
- Create: `apps/english-world/src/assets/login-black-hole-vocabulary.png`

**Interfaces:**
- Produces: `@/assets/login-black-hole-vocabulary.png` for `Login.tsx`.

- [ ] **Step 1: Generate the image**

Run:

```bash
bash /Users/liulin/.codex/skills/gpt-image-2/scripts/gen.sh \
  --prompt "Create a cinematic deep-space login background for an AI English vocabulary learning web app. A dramatic black hole with luminous accretion disk and gravitational lensing arcs, inspired by real astrophotography, not copied from any movie. Center-left composition, dark negative space on the right for a glass login panel, subtle floating letter fragments and memory-map constellation lines, premium education technology mood, blue violet space with warm amber gold light around the black hole, wide 16:9, no UI panels, no readable brand names." \
  --out /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/assets/login-black-hole-vocabulary.png \
  --timeout-sec 300
```

Expected: PNG file is written.

- [ ] **Step 2: Inspect the asset**

```bash
file /Users/liulin/Desktop/font/english/react-font/apps/english-world/src/assets/login-black-hole-vocabulary.png
```

Expected: output includes `PNG image data`.

### Task 2: Test the Gravity-Well Configuration

**Files:**
- Modify: `apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx`

**Interfaces:**
- Consumes: future named export `BLACK_HOLE_GRAVITY`.

- [ ] **Step 1: Add the failing test**

Add:

```tsx
import { BLACK_HOLE_GRAVITY } from "./LoginStarfieldCanvas";
```

Add test:

```tsx
it("exposes a center-left black-hole gravity well", () => {
  expect(BLACK_HOLE_GRAVITY.xRatio).toBeLessThan(0.5);
  expect(BLACK_HOLE_GRAVITY.yRatio).toBeGreaterThan(0.28);
  expect(BLACK_HOLE_GRAVITY.yRatio).toBeLessThan(0.62);
  expect(BLACK_HOLE_GRAVITY.radius).toBeGreaterThan(220);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
```

Expected: fail because `BLACK_HOLE_GRAVITY` is not exported.

### Task 3: Implement the Black-Hole Gravity Field

**Files:**
- Modify: `apps/english-world/src/page/login/LoginStarfieldCanvas.tsx`

**Interfaces:**
- Produces: named export `BLACK_HOLE_GRAVITY`.

- [ ] **Step 1: Export gravity config**

Add:

```tsx
export const BLACK_HOLE_GRAVITY = {
  xRatio: 0.36,
  yRatio: 0.48,
  radius: 310,
  pull: 0.24,
};
```

- [ ] **Step 2: Add accretion glow and gravity bending**

Use the gravity center in `draw()`:

- Draw a warm radial glow around the gravity center before stars.
- Pull stars slightly toward the gravity center.
- Increase line alpha near the gravity center.
- Draw click ripples as flattened ellipses around the gravity center and pointer.

- [ ] **Step 3: Run focused test to verify GREEN**

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
```

Expected: pass.

### Task 4: Integrate the New Asset and Styling

**Files:**
- Modify: `apps/english-world/src/page/login/Login.tsx`
- Modify: `apps/english-world/src/page/login/Login.css`

**Interfaces:**
- Consumes: `loginBlackHoleVocabulary`.

- [ ] **Step 1: Swap asset import**

Change:

```tsx
import loginStarryVocabulary from "@/assets/login-starry-vocabulary.png";
```

To:

```tsx
import loginBlackHoleVocabulary from "@/assets/login-black-hole-vocabulary.png";
```

Use `loginBlackHoleVocabulary` in `loginContainerStyle`.

- [ ] **Step 2: Tune overlay contrast**

Adjust `.login-container::after` and `.login-starfield` so warm black-hole light remains visible while the form stays readable.

### Task 5: Verify Full Behavior

**Files:**
- No additional source files.

- [ ] **Step 1: Run focused test**

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
```

- [ ] **Step 2: Run full tests**

```bash
pnpm --filter @font/english-world exec vitest run
```

- [ ] **Step 3: Run build**

```bash
pnpm --filter @font/english-world build
```

- [ ] **Step 4: Run login E2E**

```bash
pnpm cypress:ensure && pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/login.cy.ts --browser chrome"
```

- [ ] **Step 5: Manual visual QA**

Start Vite and inspect `/login`:

```bash
pnpm --filter @font/english-world dev -- --host 127.0.0.1 --port 5173
```

Confirm:

- Black-hole background renders.
- Pointer movement changes Canvas pixels around the gravity well.
- Clicking creates a gravity-wave effect.
- Login and register inputs remain usable.
- Mobile has no horizontal overflow.

- [ ] **Step 6: Commit implementation**

```bash
git add apps/english-world/src/assets/login-black-hole-vocabulary.png apps/english-world/src/page/login/Login.tsx apps/english-world/src/page/login/Login.css apps/english-world/src/page/login/LoginStarfieldCanvas.tsx apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx docs/superpowers/plans/2026-06-24-english-world-black-hole-login.md
git commit -m "feat: add black hole login background"
```
