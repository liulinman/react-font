# English World Interactive Starry Login Design

Date: 2026-06-24

## Problem

The starry login page now looks premium, but the background still behaves mostly like a static hero image.
The next improvement should make the background feel alive and interactive without distracting from login.

## Goals

- Add an interactive Canvas starfield layer above the generated background image.
- Make nearby stars and constellation lines react to pointer movement.
- Add a subtle click ripple that feels like touching a memory map.
- Keep login and registration behavior unchanged.
- Preserve all existing `data-cy` selectors.
- Avoid adding Three.js or another heavy rendering dependency.

## Non-Goals

- No authentication changes.
- No new API calls.
- No route changes.
- No replacement of the generated GPT Image 2 background.
- No full-screen game-like interaction.

## Interaction Model

The login page should render a Canvas layer behind the hero copy and glass login card.
The Canvas owns a small constellation system:

- Stars drift slowly.
- Stars within pointer range brighten.
- Lines between nearby stars become more visible near the pointer.
- Pointer movement gently pulls nearby stars.
- Pointer click creates a fading ripple.

The effect should feel like an interactive vocabulary memory map, not a particle demo.

## Accessibility and Performance

- The Canvas is decorative and must use `aria-hidden="true"`.
- The Canvas must not capture form pointer events.
- When `prefers-reduced-motion: reduce` matches, the Canvas should render a static frame and stop animation.
- Mobile should use fewer stars than desktop.
- The component must clean up `requestAnimationFrame`, resize listeners, and pointer listeners on unmount.

## Frontend Scope

Add:

- `apps/english-world/src/page/login/LoginStarfieldCanvas.tsx`
- `apps/english-world/src/page/login/LoginStarfieldCanvas.test.tsx`

Modify:

- `apps/english-world/src/page/login/Login.tsx`
- `apps/english-world/src/page/login/Login.css`

`LoginStarfieldCanvas` should not depend on auth state.
`Login.tsx` only imports and places the component inside `.login-container`.

## Testing

Add tests that prove:

- The Canvas renders with `aria-hidden="true"` and the expected class.
- Pointer movement over the Canvas host does not throw.
- Reduced-motion media query is accepted by the component setup.

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
pnpm cypress:ensure && pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/login.cy.ts --browser chrome"
```

Manual visual QA:

- Desktop `/login`: moving the pointer brightens stars and constellation lines.
- Desktop `/login`: clicking creates a subtle ripple.
- Mobile `/login`: form remains readable and no horizontal overflow appears.
- Reduced motion does not keep long-running animation active.
