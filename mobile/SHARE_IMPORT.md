# Share-to-import payments (Android)

Share a payment screenshot from Google Pay, PhonePe, Paytm (or any app) to **Aura360** from Android's share sheet. The app
reads the screenshot, opens the Finance transaction form filled in, and saves only after the person has checked it and
pressed Save. The share sheet is Android's own: Aura360 appears in it for JPEG, PNG and WebP images and for text (product links), nothing else.

> The web app's **Import from GPay** button (`ShareTransactionModal`) takes pasted text. The mobile equivalent of that
> flow is **Scan receipt** (`ReceiptScanSheet`); this feature reuses its server endpoint, form and save call.

## Flow

```
GPay / PhonePe / Paytm  --Share-->  Android share sheet  -->  Aura360 (MainActivity, SEND / SEND_MULTIPLE image/*)
  expo-sharing keeps the intent natively and tells Expo Router about the link  aura360://expo-sharing
  src/app/+native-intent.ts            -> captureNativeShare(): read once, clear the native copy, queue the items
  features/share-import/inbox.ts       -> copies each image into the app's own cache (random name), checks it
  features/share-import/share-intake   -> opens /finance/share-import when signed in, unlocked, router ready
  app/(app)/finance/share-import.tsx   -> reads it (POST /api/finance/receipt-scan {kind:"payment"}), duplicate check
  app/(app)/finance/transaction.tsx    -> the existing form, pre-filled, with warnings; Save = existing ledger call
  success state                        -> "View in ledger" (Finance > Ledger)
```

Cold start and warm start use the same path: the launch link (`initial: true`) or the new-link event both reach
`redirectSystemPath`; a cold launch also checks once on mount in case the router's 150 ms launch-link wait dropped the link.

## Where things are

| Piece | File |
|---|---|
| Android intent filters + scheme string | `app.json` -> `expo-sharing` plugin (`android.enabled`, `image/*` single and multiple) |
| Link -> inbox | `src/app/+native-intent.ts` |
| Inbox (live state, staging, cleanup) | `src/features/share-import/inbox.ts`, reducer in `queue.ts` |
| Which shared items are accepted | `accept.ts` (content:// only, not our own providers, JPEG/PNG/WebP, max 10 per share) |
| Safe copy into app storage | `stage.ts` (random file name, 8 MB cap, magic-byte check, md5) |
| File-type sniffing | `sniff.ts` |
| Scan result -> form draft, warnings | `draft.ts` (unknown stays unknown) |
| Duplicate lookup | `duplicates.ts`, `ledger-check.ts` (uses `GET /api/finance/transactions`) |
| "Already handled" memory | `handled-logic.ts`, `handled.ts` (hash of the picture, 7 days) |
| When the import screen may open | `share-intake.tsx` (mounted in `src/app/_layout.tsx`), `providers/biometrics.tsx` `isReady` |
| Screen | `src/app/(app)/finance/share-import.tsx` |
| Form changes | `src/app/(app)/finance/transaction.tsx`, `components/finance/share-draft-notice.tsx`, `components/finance/receipt.ts` (`TransactionDraft`) |
| Strings | `src/i18n/locales/en/finance.json` (`shareImport`), `common.json` (`screens.shareImport`) |
| Server | `app/api/finance/receipt-scan/route.ts`, `lib/ai/services/payment-scanner.ts` |

## Sharing a product link (Amazon, Flipkart, Myntra, Ajio, Meesho ...)

Tap Share on a product in a shopping app and pick **Aura360**. The app opens **Save a link** with the link already read; the person
checks it and presses Save.

```
shopping app --Share (text/plain)--> captureNativeShare(): features/share-import/links.ts takes the link out of the text
  link-inbox.ts                      -> keeps it (and the words shared with it) until the screen can open
  share-intake.tsx                   -> opens /saved/add when signed in, unlocked, router ready (same rules as screenshots)
  app/(app)/saved/add.tsx            -> takes the link over, POST /api/ingest-link {autoSave:false, hintTitle}, shows the card
  Save                               -> POST /api/ingest-link {autoSave:true}: Fashion wishlist, or Saved with a category
```

- **Fashion** (clothes, footwear, bags, watches, jewellery ...) goes to the **Fashion wishlist** with its price, brand, colour and
  buying link. **Everything else** goes to **Saved** as a *product* with a category (Electronics, Appliances, Home & Kitchen,
  Furniture, Books, Beauty & Care, Health & Fitness, Toys & Baby, Grocery, Sports & Outdoors, Automotive, Stationery, Other),
  stored as a tag and in `metadata.category`, with the price in `metadata.price`. The person can still pick Saved / Notes /
  Fashion by hand on the screen. The rules are in `lib/services/product-category.ts` (the noun at the end of the title wins:
  a "Table Tennis T-shirt" is a shirt, a "Shoe Rack" is furniture).
- The server reads the shop with `lib/services/product-scraper.ts` (it knows the shops' share links, e.g. `amzn.in`, `fkrt.it`,
  Ajio's OneLink). Shops often block servers; when the read fails, the words the app was shared with ("Check out ... on
  Flipkart") become the title (`hintTitle`) and the card simply has no picture or price.
- Any web link is accepted, not only these shops: a shared article or video is filed the way **Save a link** always did.
- A share with a link in it is never treated as a payment screenshot, even if a picture came with it. Text with no link in it
  opens Save a link with a message saying so.
- Links are only `http`/`https`; nothing is logged about the link or its text.

## Native changes and rebuilding

`expo-sharing` is a native module and the intent filters live in `AndroidManifest.xml`, so this needs a **new native build**:

```
cd mobile
npx expo prebuild --platform android --no-install     # regenerates android/ from app.json (git-ignored)
cd android && ./gradlew :app:assembleDebug            # or scripts/build-release.ps1 for a signed release
```

`prebuild` adds exactly: a `SEND` and a `SEND_MULTIPLE` intent filter (`image/*`; `SEND` also `text/plain`, for product links; `DEFAULT` category) on `MainActivity`, and the
string `share_into_scheme` (`aura360`). Existing filters, permissions and plugins are untouched, and no storage
permission is added (Android's URI grant is enough). It does not work in Expo Go. iOS is not enabled (it would need a share
extension and an App Group).

JavaScript that is newer than the installed APK is safe: `expo-sharing` is loaded lazily, so a build without it just ignores shares.

## Server contract

`POST /api/finance/receipt-scan` accepts `kind: "payment"` (JSON or multipart). The default receipt behaviour is unchanged.
For payments the reply is `{ success, kind: "payment", data }` where `data` has `isPayment, app, status, direction, amount,
currency, counterparty, date, referenceId, note, category, paymentMethod, confidence (0..1)` and every field that is not
visible is `null`. The server validates the model's output (`sanitizePayment`) and drops phone numbers and UPI IDs.
The mobile app also accepts the old receipt-shaped reply, so it works before the server is redeployed (without direction,
status or transaction ID). **Redeploy the server to get the payment reading.**

There is no transaction-reference column, so the UPI reference is saved in the entry's **notes** (`Google Pay · Ref 1234…`)
and matched there by the duplicate check.

## Safety decisions

- Only `content://` addresses are accepted; `file://` and addresses of Aura360's own providers are refused.
- The sender's file name is never used: `expo-sharing`'s own "resolved payload" helper names the copy after the sender's
  display name (path traversal, collisions, stale files), so it is not used. Copies are named by a random id in
  `cache/share-import/` and deleted when saved, skipped, discarded, on sign-out, and (if stale) at launch.
- The file's real type is checked from its first bytes; a text or database file claiming to be `image/png` is refused.
- Nothing is read or uploaded while the app is locked; a share that arrives signed out waits for sign-in; sign-out wipes it.
- Nothing is logged about the image. The server logs only an error name on failure.
- A screenshot is a claim, not proof: failed or pending payments and probable duplicates need an explicit "Save anyway".

## Limits

JPEG, PNG and WebP only (no HEIC, GIF, PDF or text); 8 MB per image; 10 images per share; Android only.

## When a share does nothing

The app leaves counts-only breadcrumbs tagged `[share-import]`: no addresses, file names or screenshot content. With the
phone on USB debugging:

```
adb logcat -c
# share the screenshot to Aura360
adb logcat -d | findstr "share-import"
```

| Line | Meaning |
|---|---|
| `share read: 1 item(s), 1 accepted, ...` | Android handed over the file and it passed the intake rules. |
| `share link arrived but no items came with it` | Android announced a share but sent no readable file (the import screen then says so). Some apps put the image only in the intent's clip data, which expo-sharing does not read. |
| `copied a shared image (image/png, N bytes)` | The image was copied into the app's cache and checked. |
| `could not copy a shared image: <reason>` | unreadable, tooLarge or unsupportedType. |
| `opening the import screen (try N)` | The inbox has something and the app is signed in, unlocked and showing the signed-in screens. It repeats every 1.5 s, up to 10 times, until the screen reports that it opened. |
| no `[share-import]` line at all | The share never reached the JavaScript. Check the installed build has the share filters: `adb shell pm query-activities --brief -a android.intent.action.SEND -t image/png`. |

## Tests

- `npm run verify` (typecheck, ESLint, contrast, tokens, i18n, unit tests). The share logic is covered by
  `tests/share-accept.test.ts` (intake rules, file sniffing), `share-queue.test.ts` (state machine, handled memory),
  `share-draft.test.ts` (scan -> draft, warnings, confirmations, error mapping), `share-duplicates.test.ts`.
- Is Aura360 offered for the right types? `adb shell pm query-activities --brief -a android.intent.action.SEND -t image/png`
  lists it (and not for `text/plain`, `application/pdf`, `video/mp4`).
- By hand on a device, after the rebuild: share a payment screenshot from GPay, PhonePe and Paytm; do it with the app
  closed (cold) and open (warm); share several images at once; share while signed out, then sign in; share with the
  biometric lock on; share a non-image and an oversized image; close the form without saving ("Not saved yet");
  save, then share the same screenshot again ("imported before"); save a payment that is already in the ledger
  (duplicate confirmation); turn on airplane mode and try again.
- Looking at the screens without a phone (`npm run preview:web`): `/finance/share-import?share=<state>` renders the import
  screen in `reading`, `receiving`, `multi`, `seen-before`, `failed-network`, `failed-large`, `not-payment`, `review`, `done`, `rejected` or `empty`; `?share=push` on `/` fills the
  inbox like a real share and lets ShareIntake open the screen over Home; `/dev/share-draft?name=failed|unknown|income` opens the transaction form as a shared screenshot would
  (`src/preview/seed-share.ts`, `src/app/(app)/dev/share-draft.tsx`).
- Preview builds (`EXPO_PUBLIC_PREVIEW=1`) answer the scan with samples chosen by image type: PNG = a payment that is already in
  the sample ledger, JPEG = a failed payment, WebP = not a payment (`src/preview/mock-api.ts`).
