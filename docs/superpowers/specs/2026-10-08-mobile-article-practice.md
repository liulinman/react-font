# Mobile article practice

User explicitly requests missing article/question practice in the installed iPhone app. Continue user's delegated design/implementation preference; implement and reinstall without intermediate approvals. Preserve all existing dirty changes.

## Delivery
Visible homepage and tools entry, existing generated articles/history, paginated library, generation from weak/random/custom vocabulary and pasted article (automatic/parse-existing/generate-new question mode), reading, sentence/paragraph translation on demand, question answering, server scoring, explanations, historical attempts. Word-library selection can seed custom vocabulary generation. Personal data stays on existing service.

Dedicated routed mobile pages share current warm-paper/green design. Article and questions use reading/answer tabs and clear progress, 44px controls, 16px inputs, readable English paragraphs. Pending generation polls via authenticated native HTTP (no EventSource). Empty/error/offline/generating/failed states are actionable.

Answers and pending submission status persist per account/task. No automatic mutation retries; guard double taps/navigation. Historical results never overwrite ongoing answers. Only complete valid choices can submit; articleExerciseId is mandatory (never substitute task ID). On uncertain submission, direct user to history before explicit retry. No automated real production generations/submissions or deletions in testing.

Reuse existing context-lab APIs and article parsing/question type helpers. Build focused tests, mobile Cypress flow, native fixture exercise, full suite, signed build, overwrite install and launch on connected iPhone.
