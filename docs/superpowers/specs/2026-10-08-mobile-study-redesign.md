# Mobile study redesign

User approved completing the personal iPhone study experience after rejecting the packaged placeholder UI. User delegates design/technical choices and asks to see results; no intermediate approval gates. Current repo, preserve all earlier and user changes; no unsolicited commit.

## Outcome
A coherent phone app: study dashboard → choose own vocabulary scope → reveal word meaning and pronounce → explicitly rate mastery, persisted to existing server → completion → dictation review → authoritative result → wrong-word retry. Vocabulary selection flows into learning. Review drafts survive navigation/relaunch per user; never auto-submit mutations. Stats/history reflect server data, with no invented streaks or due counts.

## UI
Quiet warm paper background, dark ink, forest-green primary actions, serif English words, restrained coral highlights, clear typography and ample spacing. Four icon tabs: 学习 / 词库 / 工具 / 我的. Home prioritizes study and review, real recent performance, recent words. Large rounded word cards, single dominant bottom action, progress counter, accessible focus, 44px touch targets and 16px inputs; phone keyboard/safe areas respected. Restyle login, word list/detail/form and account to the same system.

## Implementation
Reuse existing word queries, wordUpdateLevel, recite start/submit/history/stats/result and pronunciation. A dedicated mobile flashcard flow uses server mastery updates, never claims algorithmic scheduling. Recite uses the existing server scoring contract and supports both directions. Use user-keyed versioned localStorage for only study/review drafts with guarded reads/writes; no credentials. On network errors retain the current answer and show retry; no background mutation replay. Only explicitly supported tools appear in navigation. Existing desktop code remains functional; mixed-learning session deep link can reuse existing engine with mobile-specific navigation.

## Acceptance
Study selection, reveal, mastery success/failure, resume, review all questions including skipped answers, submit-once guard, result recovery, wrong-word retry, history and stats, user isolation and empty/error/offline states. Automated flow at 390px and narrow viewport, screenshot review, full app tests and builds. Rebuild and install over current iPhone app without uninstalling; do not alter user's learning data during automated tests.
