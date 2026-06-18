# AI Exercise Webhook History Design Spec

Date: 2026-06-18

## Why

The current AI article exercise flow keeps the user waiting on a streaming request and only exposes the latest generated pack in-page. Users need a ToC-quality workflow where generation runs asynchronously, survives page changes, persists results in the database, exposes generation history, and provides a PDF practice template download.

## Capabilities

- Async generation task creation: authenticated users submit an AI article exercise request and immediately receive a task id, status, selected words, source settings, and timestamps.
- Webhook-driven completion: generation results update the persisted task through a webhook-compatible service path, marking tasks `succeeded` with article/questions or `failed` with an error message.
- Generation history: users can view only their own AI article exercise history, newest first, across `pending`, `processing`, `succeeded`, and `failed`.
- Practice from history: succeeded history items render article, words, and questions without correct answers; answer submission reuses the existing grading flow.
- PDF template download: Context Lab exposes a PDF template download backed by an `application/pdf` backend response.

## Constraints

- Use webhook as the completion mechanism. Internal async worker code must complete through the same service path as webhook callbacks.
- Add `article_exercise_task` for task lifecycle; successful tasks still create `article_exercise` rows for answer submission.
- Keep the primary route under `/englishWorld/context-lab`.
- Do not expose `correctIndex` before answer submission.
- Keep source words between 3 and 20.
- Keep PDF generation dependency-free for MVP.
- Use task statuses `pending`, `processing`, `succeeded`, and `failed`.

## Data Model

New backend table: `article_exercise_task`.

Key fields: `task_uid`, `user_id`, `source_type`, `words_json`, `request_json`, `status`, `article_exercise_id`, `article_text`, `questions_json`, `error_message`, `webhook_event_id`, `callback_count`, `create_time`, `update_time`, `complete_time`.

Successful webhook completion creates an `article_exercise` row and links it through `article_exercise_id`.

## API Contract

- `POST /context-lab/generate-task`: create an async generation task.
- `POST /context-lab/history`: list current user's generation history.
- `POST /context-lab/detail`: fetch one current-user task.
- `POST /context-lab/webhook`: signed external callback endpoint.
- `GET /context-lab/pdf-template`: download `ai-article-exercise-template.pdf`.
- `POST /context-lab/submit`: existing answer submission path remains.

## UI Contract

`/englishWorld/context-lab` keeps the existing two-column Context Lab layout:

- Left: source controls, `生成练习包`, and `下载 PDF 模板`.
- Right: current task status, refresh action, generation history, completed exercise renderer, and answer submission.
- The UI polls history every 2 seconds only while visible tasks are `pending` or `processing`.

## Success Signal

From `/englishWorld/context-lab`, a user can submit a generation request, see a new pending task, refresh or wait until webhook completion updates it, open the completed exercise, submit answers, and download the PDF template. Backend and frontend tests cover task creation, webhook completion, history, answer submission, and the async UI flow.
