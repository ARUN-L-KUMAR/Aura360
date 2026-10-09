# Notifications and reminders

Aura360 sends alerts and reminders to **in-app** (the bell), **email**, and **phone push** (Expo). Everything is
opt-in per category and per channel in **Settings > Notifications**.

## What gets sent

| Alert | When | Needs |
|---|---|---|
| Budget threshold / over budget | Right after a transaction is saved (web form, bulk import, AI chat), plus a daily safety check for edits and imports | A budget for that category and month |
| Subscription renewal | Between 09:00 and 21:00 local time, once when it enters the subscription's reminder window, again the day before and on the day | An active subscription with a next billing date |
| Workout reminder | At your chosen time on your chosen days, skipped if you already logged a workout | Scheduler |
| Meal reminders | At your chosen breakfast/lunch/dinner times, skipped if that meal is logged | Scheduler |
| Skincare routine | At your morning and evening times, lists the products in that routine | Scheduler, products with a routine time |
| Unworn clothes | Weekly, on your chosen day and time | Scheduler, wardrobe items |

"Bills due" are the subscriptions above. Real recurring bills will be added with recurring transactions.

Every alert is sent **once**: a dedupe key (for example `budget:<id>:2026-10:over`) is stored in `notification_log`, so the
scheduler can run as often as you like.

## One-time setup

1. Create the tables (safe to run again, never touches existing data):
   ```
   npm run db:create-notifications
   ```
2. Set a secret for the scheduled run in `.env.local` (and in your hosting provider's environment):
   ```
   CRON_SECRET=<a long random string, e.g. openssl rand -hex 32>
   ```
3. Make something call the endpoint on a schedule (below).

Until step 1 is done the Settings card shows an error, budget alerts still work without de-duplication, and the cron
endpoint answers 503 with the command to run.

## Scheduling

Endpoint: `GET` or `POST /api/cron/notifications` with the header `Authorization: Bearer <CRON_SECRET>`.
Add `?dryRun=1` to see what *would* be sent without sending or remembering anything.

Call it **every 5 to 15 minutes**. Reminders have a 90-minute grace window (change with `NOTIFICATION_WINDOW_MINUTES`),
so a delayed run still delivers them; a once-a-day run would miss time-of-day reminders.

Pick one:

- **Server crontab** (a good fit for your home server):
  ```
  */10 * * * * curl -s -H "Authorization: Bearer YOUR_SECRET" https://YOUR-APP-URL/api/cron/notifications > /dev/null
  ```
- **Vercel Cron** (every-few-minutes schedules need the Pro plan; the Hobby plan only allows once a day): add a
  `vercel.json` with `{"crons":[{"path":"/api/cron/notifications","schedule":"*/10 * * * *"}]}`. Vercel sends the
  `Authorization` header automatically when `CRON_SECRET` is set.
- **cron-job.org** or **GitHub Actions** (a `schedule:` workflow that runs `curl`): free options.

Check it works:
```
curl -s -H "Authorization: Bearer YOUR_SECRET" "https://YOUR-APP-URL/api/cron/notifications?dryRun=1"
```

## Email

Uses the Gmail SMTP you already configured (`SMTP_EMAIL`, `SMTP_PASSWORD`). To use Resend instead, set both
`RESEND_API_KEY` and `NOTIFY_EMAIL_FROM` (a sender on a domain you verified in Resend).

## Phone push

The server side is ready: it sends through Expo's push service (`EXPO_ACCESS_TOKEN` is optional).
The mobile app must register its token after the user allows notifications:

```
POST /api/notifications/push-token   { "token": "ExponentPushToken[...]", "platform": "ios" | "android", "deviceName": "..." }
DELETE /api/notifications/push-token { "token": "..." }     (on sign-out)
```

Both accept the mobile Bearer token. In the Expo app that means `expo-notifications`:
ask permission, call `getExpoPushTokenAsync({ projectId })`, then POST the token. Phones that uninstall the app are
removed automatically the next time a push to them fails.

## Settings API

`GET/PUT /api/notifications/preferences` and `POST /api/notifications/test` (sends a test on every channel you have on).

## On the phone app

The mobile app is a client of this same engine:

- **Notifications screen** (bell on the home screen, with an unread badge): the in-app list, tap one to open the matching
  screen, "Mark all read".
- **Alerts & reminders** (Settings > Alerts & reminders, or the gear in Notifications): the same settings as the web
  Settings > Notifications. Phone push and email switches, time zone (defaults to the phone's), quiet hours, budget and
  subscription alerts, workout, meal, skincare and unworn-clothes reminders with their times and days. It also shows how
  many phones are connected, a **Connect this phone** button that explains any problem (no EAS project id, notifications
  not allowed, Expo Go, emulator), and **Send a test notification** (goes through the server on every channel that is on).
- **Push**: the phone registers its Expo token after sign-in (`src/lib/push.ts`); tapping a push opens the right screen.

### Phone reminders vs server reminders
The app also schedules its **own local reminders** (Settings > Daily Habit Reminders: skincare 8:00 and 22:00, daily review,
water). Skincare exists on both sides, so **when the server is sending skincare reminders to this phone** (push on, a phone
connected, skincare reminders on), the phone's own skincare ones pause automatically. Water and the daily review have no
server twin and keep working offline. The old local "Budget Threshold Alerts" switch isn't connected to anything; budget
alerts now come from the server.
