# English World Black Hole Login Design

Date: 2026-06-24

## Problem

The current starry login page is interactive, but the visual center is still a calm starfield.
The user wants a more cinematic black-hole feeling with the weight and drama of gravitational lensing, while keeping the page usable as a login screen.

## Goals

- Replace the static starfield background with a GPT Image 2 generated black-hole deep-space image.
- Keep the visual inspired by real black-hole imagery and gravitational lensing, not a direct copy of any film frame.
- Upgrade the Canvas layer so stars, constellation lines, and click ripples feel pulled by a gravity well.
- Keep the login card readable and all form controls usable.
- Preserve existing login/register behavior and `data-cy` selectors.

## Non-Goals

- No Three.js or heavy 3D engine.
- No backend, route, or authentication changes.
- No direct movie-frame recreation.
- No fullscreen game interaction.

## Visual Direction

The background should show a dramatic black hole with a luminous accretion disk and gravitational-lensing arc.
The black hole should sit left-of-center or center-left so the login card can remain readable on the right.
The color palette can introduce warm amber/gold around the accretion disk while retaining the existing blue-violet educational tech atmosphere.

## Interaction Direction

The Canvas layer should treat the black hole as a gravity well:

- Stars drift and slowly bend toward the black hole.
- Lines near the black hole curve or brighten as if distorted by gravity.
- Pointer movement still brightens nearby star connections.
- Clicking creates a gravity-wave ripple instead of a plain circular ripple.
- Reduced motion renders a static frame and avoids continuous animation.

## Asset Plan

Generate:

```text
apps/english-world/src/assets/login-black-hole-vocabulary.png
```

Prompt intent:

```text
Create a cinematic deep-space login background for an AI English vocabulary learning web app. A dramatic black hole with luminous accretion disk and gravitational lensing arcs, inspired by real astrophotography, not copied from any movie. Center-left composition, dark negative space on the right for a glass login panel, subtle floating letter fragments and memory-map constellation lines, premium education technology mood, blue violet space with warm amber gold light around the black hole, wide 16:9, no UI panels, no readable brand names.
```

## Testing

Add or update tests for the Canvas component so it proves the black-hole gravity configuration exists without relying on screenshot matching.

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/page/login/LoginStarfieldCanvas.test.tsx
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
pnpm cypress:ensure && pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/login.cy.ts --browser chrome"
```

Manual visual QA should confirm:

- The black hole background renders.
- The login card is readable.
- Stars and gravity waves respond to pointer movement and clicks.
- Mobile has no horizontal overflow.
