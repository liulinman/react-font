# Single-word exercise sources

## Decision

Every exercise vocabulary source supports a requested size of 1–20 words:

- custom input accepts 1–20 non-empty words;
- random selection accepts a count of 1–20;
- proficiency/weak-word selection accepts a count of 1–20.

Only an empty custom list or a database selection that returns zero words is rejected. A request that returns one or two words remains valid.

## Scope

The rule is applied consistently in the NestJS exercise service, the desktop exercise entry, and the mobile Context Lab entry. The desktop Context Lab already passes one-word custom requests through and therefore needs only regression coverage where appropriate.

The existing micro exercise limit remains 1–3 words. The standard exercise prompt, article length, question count, and output validation are unchanged.

## Request flow

1. The client normalizes the requested count to 1–20 or splits custom input into non-empty words.
2. The backend rejects an empty custom request.
3. For random or proficiency sources, the backend queries up to the requested count and rejects only when no words are available.
4. One or more resolved words proceed through the existing standard or micro generation flow.

## User feedback

- Empty custom input: tell the user to enter at least one word.
- Empty random/proficiency result: tell the user that the current conditions contain no usable words and suggest changing the filter or adding words.
- One or two words: no warning; generation starts normally.

## Verification

- Backend tests cover one-word custom, random, and proficiency source resolution and zero-word rejection.
- Desktop tests cover one-word custom submission.
- Mobile tests cover a requested count of one and one-word custom submission.
- Run the affected suites, full backend/frontend tests, lint on changed files, and production builds.
