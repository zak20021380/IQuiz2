# Questions API review mode

- `GET /api/questions` and `GET /api/questions/search` accept `reviewMode=all`.
- The caller must be authenticated as an admin; otherwise the server responds with `403`.
- When `reviewMode=all` is active the `status/active` gate is removed but structural validation still filters broken records. Each item includes a `moderation` payload with `{ status, active }` for UI badges.
- Set `ALLOW_REVIEW_MODE_ALL=false` in the environment to disable the override entirely (default is `true`).
