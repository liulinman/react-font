# English World Interactive Starry Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live interactive constellation Canvas layer to the starry login page.

**Architecture:** Keep auth and form logic in `Login.tsx`. Add `LoginStarfieldCanvas.tsx` as a decorative rendering component that owns animation, pointer state, resize handling, and cleanup.

**Tech Stack:** React 18, TypeScript, Canvas 2D API, Vitest, Testing Library, Ant Design 5.

## Global Constraints

- Keep login and registration behavior unchanged.
- Preserve all existing `data-cy` selectors.
- Do not add Three.js or another heavy rendering dependency.
- The Canvas must use `aria-hidden="true"` and must not capture form pointer events.
- Respect `prefers-reduced-motion: reduce` by avoiding long-running animation.
- Clean up `requestAnimationFrame`, resize listeners, and pointer listeners on unmount.

---

## File Structure

- Create: `apps/english-world/src/page/login/LoginStarfieldCanvas.tsx`
  - Decorative Canvas starfield rendering and pointer interaction.
- Create: `apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx`
  - Component tests for rendering, pointer safety, and reduced-motion setup.
- Modify: `apps/english-world/src/page/login/Login.tsx`
  - Import and render `LoginStarfieldCanvas` inside `.login-container`.
- Modify: `apps/english-world/src/page/login/Login.css`
  - Add `.login-interactive-starfield` layer styles and tune existing overlay z-index.

### Task 1: Test the Decorative Canvas Contract

**Files:**
- Create: `apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx`

**Interfaces:**
- Consumes: future `LoginStarfieldCanvas` default export.
- Produces: failing tests that define the component contract.

- [ ] **Step 1: Write the failing test file**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import LoginStarfieldCanvas from "./LoginStarfieldCanvas";

describe("LoginStarfieldCanvas", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
    })) as unknown as HTMLCanvasElement["getContext"];

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("renders a decorative canvas layer", () => {
    render(<LoginStarfieldCanvas />);

    const canvas = screen.getByTestId("login-starfield-canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveClass("login-interactive-starfield");
  });

  it("accepts pointer movement without throwing", () => {
    render(<LoginStarfieldCanvas />);

    expect(() => {
      fireEvent.pointerMove(screen.getByTestId("login-starfield-canvas"), {
        clientX: 120,
        clientY: 90,
      });
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run from `/Users/liulin/Desktop/font/english/react-font`:

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
```

Expected: fail because `LoginStarfieldCanvas` does not exist.

### Task 2: Implement the Canvas Component

**Files:**
- Create: `apps/english-world/src/page/login/LoginStarfieldCanvas.tsx`

**Interfaces:**
- Produces: default React component `LoginStarfieldCanvas(): JSX.Element`.

- [ ] **Step 1: Create the component**

Implement a Canvas component that:

- Creates deterministic stars from the viewport size.
- Tracks pointer movement and click ripples.
- Draws stars, nearby lines, and ripples with Canvas 2D.
- Uses fewer stars on mobile.
- Stops continuous animation when reduced motion is enabled.
- Cleans listeners and animation frames.

- [ ] **Step 2: Run the focused test to verify GREEN**

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
```

Expected: pass.

### Task 3: Integrate the Canvas Into Login

**Files:**
- Modify: `apps/english-world/src/page/login/Login.tsx`
- Modify: `apps/english-world/src/page/login/Login.css`

**Interfaces:**
- Consumes: `LoginStarfieldCanvas` default export.

- [ ] **Step 1: Render the Canvas layer**

In `Login.tsx`, import:

```tsx
import LoginStarfieldCanvas from "./LoginStarfieldCanvas";
```

Render it after `.login-orbit`:

```tsx
<LoginStarfieldCanvas />
```

- [ ] **Step 2: Style the Canvas layer**

In `Login.css`, add:

```css
.login-interactive-starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}
```

Ensure `.login-hero` stays above the canvas with `z-index: 1`.

- [ ] **Step 3: Run the focused test again**

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
```

Expected: pass.

### Task 4: Verify Full Behavior

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: completed interactive login.

- [ ] **Step 1: Run frontend tests**

```bash
pnpm --filter @font/english-world exec vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Run frontend build**

```bash
pnpm --filter @font/english-world build
```

Expected: build exits 0.

- [ ] **Step 3: Run login E2E**

```bash
pnpm cypress:ensure && pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/login.cy.ts --browser chrome"
```

Expected: login spec passes.

- [ ] **Step 4: Manual visual QA**

Start Vite:

```bash
pnpm --filter @font/english-world dev -- --host 127.0.0.1 --port 5173
```

Inspect `/login` in Chrome:

- Moving the pointer brightens stars and constellation lines.
- Clicking creates a subtle ripple.
- The form remains clickable.
- Mobile width has no horizontal overflow.

- [ ] **Step 5: Commit implementation**

```bash
git add apps/english-world/src/page/login/LoginStarfieldCanvas.tsx apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx apps/english-world/src/page/login/Login.tsx apps/english-world/src/page/login/Login.css docs/superpowers/plans/2026-06-24-english-world-interactive-starry-login.md
git commit -m "feat: add interactive starry login background"
```
