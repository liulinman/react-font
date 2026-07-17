# Word Card Visual Hierarchy Design

## Goal

Improve the visual separation between the word-card grid and its surrounding panel without changing card content, layout, or interactions.

## Current Problem

The card grid, the surrounding panel, and each card all use nearly the same white background. The card border is light while the shadow is broad, so adjacent surfaces visually blend together instead of forming a clear hierarchy.

## Approved Direction

Use a lightweight layered treatment:

- Give the card-view content area a very light blue-gray background and subtle inner border.
- Keep individual cards white so they read as the foreground layer.
- Slightly strengthen the card border while reducing the shadow spread and opacity.
- Increase card radius from 8px to 10px to match the surrounding panels.
- Add a restrained hover state using a small upward translation, clearer border, and compact shadow.
- Preserve the existing blue selected-card state and ensure it remains visually stronger than hover.
- Keep the grid columns, spacing, card height, information structure, and actions unchanged.

## Interaction States

- Default: white card, clear neutral border, compact shadow.
- Hover: 1px upward movement, blue-gray border, slightly stronger compact shadow.
- Selected: existing blue emphasis remains authoritative; hover must not replace or weaken it.
- Keyboard focus and reduced-motion behavior must remain usable.

## Responsive Behavior

The background treatment follows the existing card-view container at all breakpoints. Existing grid column and mobile rules remain unchanged.

## Verification

- Inspect the card view at desktop and narrow viewport widths.
- Confirm default, hover, selected, and pagination areas remain visually distinct.
- Run targeted frontend lint and build checks.
- Confirm no layout shift, horizontal overflow, or card-content clipping is introduced.
