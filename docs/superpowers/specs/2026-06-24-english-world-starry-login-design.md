# English World Starry Login Design

Date: 2026-06-24

## Problem

The current login page looks like a default Ant Design card on a blue-purple gradient.
It works, but it does not communicate the product: an AI-assisted English vocabulary learning world with review, context practice, and memory mapping.

## Goals

- Turn `/login` into a memorable "vocabulary starfield" entry screen.
- Use a GPT Image 2 generated hero background as the main visual asset.
- Add lightweight interaction so the page feels alive before login.
- Preserve the existing login, registration, redirects, validation, and `data-cy` selectors.
- Keep the implementation scoped to the English World frontend.

## Non-Goals

- No authentication API changes.
- No backend changes.
- No route changes.
- No redesign of the authenticated English World screens.
- No heavy 3D engine in this slice.

## Visual Direction

The login page becomes a deep-space vocabulary map.
The generated background should show a refined starfield with nebula depth, subtle blue-purple and cyan-green light, floating English word fragments, and thin constellation-like memory links.
The feeling should be premium and intelligent, not a game lobby.

The page foreground should include:

- A glass-style login panel with a soft luminous edge.
- A compact product mark: "英语世界 · AI 单词".
- A short supporting line that connects login to review and memory.
- Small ambient word chips such as `memory`, `context`, `review`, `fluent`, and `listen`.
- A tiny learning-status strip that suggests the product after login without adding new data dependencies.

## Interaction Design

The page should feel interactive while staying simple and reliable:

- The starfield layer shifts subtly with pointer movement.
- Ambient word chips drift slowly and brighten on hover.
- Form inputs gain a focused glow that matches the starfield palette.
- The primary submit button gets a light-sweep hover effect.
- Register and login tabs keep the same behavior but use the new visual treatment.

Animations must respect `prefers-reduced-motion` by disabling drift, parallax, and long-running transitions.

## Asset Plan

Generate one background image with GPT Image 2 and store it in the app source assets, for example:

```text
apps/english-world/src/assets/login-starry-vocabulary.png
```

Prompt intent:

```text
Create a premium deep-space vocabulary learning background for an AI English learning web app login page. Vast starry sky, elegant nebula depth, subtle blue violet and cyan green lighting, floating English word fragments, constellation-like memory nodes connected by thin luminous lines, intelligent and calm, high-end education technology, no UI panels, no readable brand names, wide 16:9 composition, enough dark negative space near the center-right for a glass login panel.
```

The implementation should provide a CSS gradient fallback so the login page remains usable if the image fails to load.

## Frontend Scope

Update:

- `apps/english-world/src/page/login/Login.tsx`
- `apps/english-world/src/page/login/Login.css`
- Add the generated asset under `apps/english-world/src/assets/`

`Login.tsx` should remain responsible for auth form behavior.
It may add presentational wrappers, ambient chips, and a pointer-position style variable.
It must keep these selectors:

- `data-cy="login-username"`
- `data-cy="login-password"`
- `data-cy="login-submit"`
- `data-cy="register-username"`
- `data-cy="register-password"`
- `data-cy="register-confirm-password"`
- `data-cy="register-avatar"`
- `data-cy="register-submit"`

## Responsive Behavior

Desktop:

- Use a full-viewport hero layout.
- Keep the login card readable and not overly wide.
- Let the starfield and ambient chips provide depth around the form.

Mobile:

- Keep the form first and readable.
- Reduce or hide nonessential ambient chips.
- Avoid text overlap and oversized hero typography.

## Error Handling

Auth errors remain handled by the current auth context and Ant Design messages.
The new visual layers should not block pointer events for form controls.
If image loading fails, the CSS fallback background remains legible.

## Testing

Run:

```bash
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
```

If time permits, run the login E2E because the page keeps the same `data-cy` contract:

```bash
pnpm e2e:english-world
```

Manual visual QA should inspect `/login` at desktop and mobile widths and confirm:

- The generated starfield renders.
- The form remains readable.
- The submit and tab interactions still work.
- Motion is subtle and does not obscure inputs.
