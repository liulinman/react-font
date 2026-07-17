# Word Library Query and Pagination Consistency Design

## Goal

Make the desktop word library keep filters, pagination, loading state, and mutation results consistent under rapid queries, page changes, page-size changes, deletes, edits, and mastery updates.

## Chosen approach

The frontend hook owns one query state object containing `page`, `pageSize`, `filters`, and a refresh revision. Query, reset, page change, page-size change, and refresh only update that state; one effect is the sole list-request trigger. Every request receives a monotonically increasing sequence number, and only the latest response may update list, total, error, or loading state.

When a response shows that the requested page is beyond the new last page, the hook moves to the last valid page and lets the single effect request that page. Changing `pageSize` always resets to page 1. Successful mastery mutations trigger a refresh so active mastery filters and totals are reapplied by the server.

The backend keeps offset pagination but makes ordering deterministic with `englishCreateTime DESC, id DESC`. `page` must be an integer of at least 1; `pageSize` must be an integer from 1 through 500.

## Error handling

An obsolete request may finish but cannot overwrite current data or clear loading for the latest request. Only the latest failed request clears the visible list and total. Existing API error presentation remains unchanged.

## Verification

- Hook tests cover stale-response rejection, single-request query transitions, page-size reset, and last-page fallback.
- Component tests cover mastery-update refresh behavior.
- Backend tests cover deterministic ordering and pagination DTO bounds.
- Existing focused frontend and backend suites must remain green.
