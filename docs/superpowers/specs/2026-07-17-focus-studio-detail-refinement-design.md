# Focus Studio Detail Refinement Design

## Goal

Refine the two visually weak areas identified in the desktop Today page while preserving all existing routes, data, and actions.

## Task route

- Render every suggested action as the same rounded step card.
- Keep every step on the same surface with the same border, radius, height, and hover behavior.
- Mark the first step only with a solid index and primary action; render later steps with outlined indexes and visible outlined actions.
- Group each step into a content cluster and an action cluster so title, duration, and button remain aligned at 1440px.
- Add a restrained hover state and a semantic leading icon for every step action.

## Memory summary

- Split the card footer into mastery, recent weak-word clues, and a map entry.
- Hide the progress component's duplicate percentage and keep one tabular percentage in the header.
- Replace saturated Ant Design mistake tags with low-saturation semantic clue pills.
- Preserve the existing four-item limit and memory-map navigation handler.
- Provide a calm empty clue state when no recent mistakes exist.

## Motion and accessibility

- Use 180–220ms transitions and disable them under `prefers-reduced-motion`.
- Use ordered-list semantics for the learning route.
- Expose mastery and clue sections as named regions.

## Acceptance criteria

1. Both actions use visually identical rounded card containers at rest.
2. The later action uses a visible outlined button and a context-practice icon without competing with the primary action.
3. The memory summary displays the mastery percentage exactly once.
4. Recent mistakes use low-saturation custom pills and include a section heading.
5. Existing review, Context Lab, and memory-map navigation behavior remains unchanged.
6. The 1440px Today page has no horizontal overflow.
