# Offline mode and phone push

## Web app: offline mode

The service worker (`public/sw.js`) is registered in **production builds only** (`next build && next start`, or your
deployed site). It is off in `next dev` so development isn't confusing; set `NEXT_PUBLIC_ENABLE_SW=1` to try it there.

### What works with no connection
| | Offline behavior |
|---|---|
| App shell, scripts, styles | Cached, the app opens |
| Pages you opened before | Shown from the last copy (`/dashboard/...`), with the data as it was then |
| Lists the pages load (finance, fitness, food, time, notes, skincare, saved, fashion) | Last copy you saw |
| **Logging**: an expense or income, workout, meal, time log, note, skincare product | **Saved on the device and sent automatically when you're back online** |
| Anything else (edits, deletes, bulk import, AI chat, photo upload, link import) | Needs a connection, and fails as it did before |
| A page you never opened | A friendly "You're offline" page |

Data is always fetched fresh when online. The cached copy is only used when the network fails or takes over 4 seconds.

### How the offline queue works
1. You add an expense while offline. The page gets an instant "Saved offline" reply, so forms close normally.
2. The entry is stored in IndexedDB on that device, tagged with your user id.
3. A banner under the top bar shows "You're offline · 1 entry waiting to sync" and **Review** lists them.
4. When the connection returns, entries are sent in the order you made them. Chrome and Android can send them even if the
   tab is closed (Background Sync); other browsers send on the next visit, when the connection returns, and every
   45 seconds while the app is open.
5. A toast says how many synced and the page refreshes.

What happens to an entry the server doesn't accept:
- **Network or server error (5xx, 429):** kept and retried, up to 10 times, then moved to "couldn't be saved".
- **Rejected (other 4xx):** moved straight to "couldn't be saved" with the server's message. Review them in the banner, then **retry** or **discard**.
- **Signed out (401/403):** kept untouched until you sign in again as the same user.

### Privacy on shared devices
- Cached pages and data are stored **per user** and deleted on sign-out.
- If a different user signs in on the same device, the previous user's cached data is dropped and their unsent entries
  are **not** sent under the new account (they wait until the original user signs in again).
- Unsent entries stay on the device after sign-out so nothing you typed is lost. Discard them from the banner if the device is shared.

### Known limits
- A request that reached the server but whose reply was lost while going offline can be sent twice on replay. The APIs
  don't yet accept an idempotency key. It is rare, and an extra entry is easy to delete.
- Entries made offline show a temporary id until the next refresh. Editing one before it syncs isn't possible.
- Only these creates are queued: `POST /api/finance/transactions`, `/api/fitness`, `/api/food`, `/api/time`, `/api/notes`,
  `/api/skincare`. Add more in `QUEUEABLE` in `public/sw.js`.
- To ship a change to the worker, bump `VERSION` in `public/sw.js`; old caches are removed on the next visit.

### Testing it yourself
`npm run build && npm start`, open the app in Chrome, sign in, visit a few pages. Then DevTools > Network > **Offline**
(or Application > Service Workers > Offline), add an expense, and switch back to Online.

## Phone app: offline mode

The phone app (`mobile/`) has its own offline support, built differently from the web one (no service worker).

| | Offline behavior |
|---|---|
| Screens you have opened | Still readable. Their data is saved on the phone **per user** (React Query cache in AsyncStorage, 7 days) and restored on the next launch, even with no signal |
| **Logging**: expense or income, workout, meal, time log, note, skincare product | **Saved on the phone and sent automatically when you're back online** |
| Edits, deletes, AI chat, photo upload, link import | Need a connection and fail with the usual "Can't reach the server" error (they no longer hang) |

How the queue works (`src/lib/offline/queue.ts`, hooked into the one `api()` helper in `src/lib/api.ts`):
1. A create that can't reach the server is stored, tagged with the signed-in user, and the screen gets an immediate reply
   shaped like the real one, so it closes normally.
2. A small pill at the top shows **"Offline · 2 entries waiting"**. Tap it to review, discard or retry entries.
3. Entries are sent in order when the connection returns, when the app comes to the foreground, after sign-in, and every
   45 seconds while something waits. An entry the server rejects (4xx) moves to "couldn't be saved" with the server's
   message. Server errors (5xx, 429) are retried up to 10 times. A signed-out session keeps entries until you sign in again.
4. Another user signing in on the same phone never sends your entries, and never sees them.

**A request that times out is never queued** (the server may have processed it), only a real "couldn't connect". A request
that reached the server but whose answer was lost as the connection dropped can still be sent twice on replay; the APIs
have no idempotency key yet.

Needs the native module `@react-native-community/netinfo`, so install it with a **new development build** (`eas build`).
Entries made offline show a temporary id until the next refresh, and don't appear in lists until they sync.

## Phone: push notifications (Expo)

The server side is in `docs/NOTIFICATIONS.md`. The app side is `mobile/src/lib/push.ts`: after sign-in it asks for
permission, gets the phone's Expo push token and registers it (`POST /api/notifications/push-token`); on sign-out it
removes it. Tapping a push opens the matching screen (`data.route`).

To actually receive pushes you need, once:
1. **An EAS project id.** Run `eas init` in `mobile/`. It writes `extra.eas.projectId` into `app.json`. Without it the app
   logs nothing and quietly skips registration.
2. **A development or production build, not Expo Go.** Push tokens don't work in Expo Go on current SDKs.
3. **Push credentials**: Android needs Firebase (FCM) set up and uploaded to EAS (`eas credentials`); iOS needs an Apple
   developer account (EAS manages the APNs key).
4. A **real phone**. Simulators can't receive push.

Then in the web app: Settings > Notifications > turn on **Phone push**. The card shows how many phones are connected and
**Send a test** pushes to them.

### Avoid doubles
`mobile/src/lib/notifications.ts` already schedules its **own local reminders on the phone** (skincare 8:00 and 22:00, daily
review, water). If you also turn on the server's skincare reminders in Settings > Notifications, the phone gets both.
Turn off one of them. (The server's workout, meal, budget, subscription and unworn-clothes alerts have no local twin.)
