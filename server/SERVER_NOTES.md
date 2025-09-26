# Questions API review mode

- `GET /api/questions` and `GET /api/questions/search` accept `reviewMode=all`.
- The caller must be authenticated as an admin; otherwise the server responds with `403`.
- When `reviewMode=all` is active the `status/active` gate is removed but structural validation still filters broken records. Each item includes a `moderation` payload with `{ status, active }` for UI badges.
- Set `ALLOW_REVIEW_MODE_ALL=false` in the environment to disable the override entirely (default is `true`).

## Telegram bot helper

- Run `npm run bot:telegram` to launch the long-polling helper that powers the basic `/start`, `/config`, `/categories`, `/play` and `/answer` commands for the quiz bot.
- Required env variables:
  - `TELEGRAM_BOT_TOKEN`: token issued by BotFather.
  - `TELEGRAM_API_BASE_URL` *(اختیاری)*: سفارشی‌سازی آدرس پایه‌ی سرور؛ درصورت عدم تنظیم، از `APP_BASE_URL` یا به‌صورت پیش‌فرض `http://localhost:PORT` استفاده می‌شود.
  - `TELEGRAM_BOT_DEFAULT_JWT` *(اختیاری)*: توکن JWT پیش‌فرض جهت دسترسی به مسیرهای محافظت‌شده؛ همچنین می‌توان از دستور `/config token <JWT>` برای ثبت توکن جدید در نشست تلگرام استفاده کرد.
- ربات در هر درخواست شناسه‌ی تلگرام کاربر را به‌عنوان `guestId` (در querystring و هدر `x-guest-id`) ارسال می‌کند و پاسخ‌ها را به `/api/public/answers` گزارش می‌دهد.
- برای استفاده از وبهوک می‌توانید از سرویس‌های معکوس یا [setWebhook](https://core.telegram.org/bots/api#setwebhook) بهره ببرید؛ در حالت توسعه‌ای `npm run bot:telegram` از لانگ‌پولینگ (`getUpdates`) استفاده می‌کند.
