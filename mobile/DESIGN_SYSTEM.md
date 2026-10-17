# Aura360 Mobile Design System

Single source of truth for how the mobile app looks and moves. Tokens live in [`src/theme/`](src/theme/); components
import them from `@/theme` and never hard-code a colour, font, size or spacing value.

```ts
import { spacing, radius, layout, useTheme } from '@/theme';
const { colors, accent, elevation, scheme, reduceMotion } = useTheme();
```

Checks (run before committing):

| Command | What it does |
|---|---|
| `npm run check:contrast` | Verifies WCAG AA for every semantic colour pair in both schemes (228 pairs). |
| `npm run lint:tokens` | Fails if any file has more hard-coded colours / fonts / off-scale spacing than `scripts/design-tokens-baseline.json`. |
| `npm run lint:tokens -- --report` | Lists every remaining violation. |
| `npm run lint:tokens -- --update` | Re-baselines after migrating files. The total may only go down. |
| `npm run lint:i18n` | Fails on user-visible English written straight into a component (JSX text, label props, `notify.*` messages). `-- --report` lists them. |
| `npm test` | Unit tests (`node:test`, no extra dependencies) for pure logic: toast queue, offline queue, telemetry consent, search matching, UI helpers, catalog completeness. |
| `npm run verify` | Everything: typecheck, ESLint, contrast, tokens (incl. right-to-left), i18n and tests. Run it before every commit. |

## Color

Defined in [`src/theme/colors.ts`](src/theme/colors.ts) in three layers.

1. **Ramps (50-900).** `primary` (indigo) and `secondary` (sky) are hand-picked. `tertiary` (magenta, hue 330), the
   semantic ramps (`success`, `warning`, `error`) and every category ramp are generated in OKLCH with one lightness
   profile, so shade 600 reads at least 4.5:1 on white and shade 400 at least 4.5:1 on the dark backgrounds, whatever the
   hue. `neutral` is the grey scale (50-950).
2. **Semantic palette** (`useTheme().colors`), light and dark. Use roles, not ramps:

   | Role | Tokens |
   |---|---|
   | Surface | `background`, `card`, `cardMuted`, `surfaceRaised`, `overlay` |
   | Border | `border`, `borderSubtle`, `borderStrong` (controls, 3:1), `focusRing` |
   | Text | `text`, `textSecondary`, `textMuted`, `textDisabled`, `textInverse` |
   | Brand | `primary` + `primaryText`, `primaryAccent` (links / icons on a surface), `primaryContainer` + `onPrimaryContainer`; same for `secondary` and `tertiary` |
   | Status | `success` / `warning` / `error` / `info`, each with `on…`, `…Container`, `on…Container`, `…Border`, `…Text` |
   | Glass | `glass`, `glassBorder`, `glassSolid` (no-blur fallback) |
   | Loading | `skeletonBase`, `skeletonHighlight` |

   `danger` is a legacy alias of `error`. Filled controls pair `X` with `onX`; coloured text on a surface uses `XText`.
3. **Category accents.** `useTheme().accent('fitness')` returns `{ solid, onSolid, soft, text, border }` for the current
   scheme. Each module is the tertiary profile rotated to its own hue (fashion uses the tertiary hue itself), so every
   accent has the same contrast guarantees. `moduleColors[key]` is the static shade-500 for places with no theme.

Status is never colour alone: pair it with an icon or label.

**Theme switch:** `mode` is `'system' | 'light' | 'dark'`, persisted; change it with `setMode`.

## Typography

One family, Inter, weights 400 / 500 / 600 / 700 only ([`typography.ts`](src/theme/typography.ts)). Always use
`<Text variant weight>`; never set `fontSize`, `fontFamily` or `fontWeight` in a style.

| Variant | Size / line | Default weight | Use |
|---|---|---|---|
| `display` | 32 / 38 | bold | Hero numbers, splash |
| `headline` | 26 / 32 | bold | Screen titles |
| `title` | 18 / 24 | semiBold | Card and section titles |
| `body` | 15 / 22 | regular | Paragraphs, list text |
| `label` | 14 / 20 | medium | Buttons, form labels |
| `caption` | 12 / 16 | regular | Metadata, helper text |

`<Text numeric>` turns on tabular digits for amounts and timers. Text follows the system font size up to 1.4x
(`MAX_FONT_SCALE`); lay out with `minHeight` and flexible containers, not fixed heights.

## Spacing, shape, elevation

- **Spacing** (4pt grid): `xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48`.
- **Layout:** `layout.screenPadding` 16 (20 wide), `cardPadding` 16, `sectionGap` 24, `itemGap` 12, `minTouchTarget` 44.
- **Radius:** `sm 8, md 12, lg 16, xl 24, pill`.
- **Elevation:** `elevation(0-4)`: 1 card, 2 raised card, 3 floating (FAB, tab bar), 4 sheet / modal. Prefer a border plus
  level 1-2 over heavy shadows.

## Motion

[`motion.ts`](src/theme/motion.ts): `duration` fast 150 / base 250 / slow 400 ms; `easing` standard / decelerate /
accelerate (cubic-bezier points for `Easing.bezier`); `spring` gentle / bouncy; `pressScale` 0.97.

**Rules:** animate only `transform` and `opacity`, on the UI thread (Reanimated); never animate width, height, position or
colour (layer two views and cross-fade, or scale a full-size view instead). Honour `useTheme().reduceMotion` (or
`useReducedMotion()`): replace movement with an instant or fade-only change. Use skeleton shimmer, not spinners, for
content loading. Shadows come only from `useTheme().elevation(level)`.

**Shared motion kit** ([`components/ui/motion.ts`](src/components/ui/motion.ts) and friends), use these instead of writing
new `FadeInDown` code:

| Piece | Use |
|---|---|
| `useListMotion(index)` | Spread `{...useListMotion(i)}` on an `Animated.View` row: staggered fade-and-rise for the first 8 rows, quick fade-out when removed, and the rows below close the gap. Single-column lists only. In a FlatList the cell moves, not the row, so use the list's `itemLayoutAnimation` for reflow. In grids use the `exiting` fade only. |
| `useBlockMotion(delay)` | One block (a summary card, an empty state) fades in once. |
| `usePop(active)` | A small scale pop when a control becomes selected or deselected (chips, tab icons). |
| `SuccessCheck` | Disc pops in, tick fades in. Trigger on a state change only, and pair it with `haptics.success()` unless a success toast already fires one. |
| `Toggle` | The app switch (spring thumb, cross-fading track, selection haptic, 44pt hit area). Replaces the native `Switch`. |
| `Button success` | Optional prop that swaps the label for a check briefly. |
| `Gradient` / `Card gradient="module"` | A soft accent wash for one hero card per screen. Never on rows, buttons or behind long text. |

**Page transitions** are set in the layouts: pushes use the platform default, modals slide up from the bottom (Android) or
use the iOS sheet, tabs cross-fade, and the signed-in / signed-out switch fades. All become a fade or nothing with reduce
motion. Shared-element transitions are not used: they are experimental in this Reanimated version.

## Glass

Blur + translucent `glass` + `glassBorder` is for overlays only: tab bar, top app bar, sheets and dialogs (opt-in `glass`), the
floating widget. It renders the system glass effect on iOS 26+ (`useGlassSupported()`); Android and older iOS get the opaque
`glassSolid` surface with the same hairline border, as does any device with "Reduce transparency" on. Real blur on those
platforms would need `expo-blur` (a native module, so a rebuild). Contrast is checked against `glassSolid`. Never use glass on
content cards.

## Components

All live in [`src/components/ui/`](src/components/ui/) and are built on tokens. Import each from its own file
(`@/components/ui/button`). **Open the gallery to review every component, state and theme in one place:** in a dev build
go to `aura360://dev/components` (route `src/app/(app)/dev/components.tsx`, development builds only).

| Group | Components | Notes |
|---|---|---|
| Base | `Text`, `PressableScale`, `GlassSurface` | `PressableScale` is the base touchable (scale + opacity feedback on the UI thread, focus ring, optional haptic, reduce-motion aware). `GlassSurface` is for overlays only and falls back to a solid surface when blur is unavailable or "reduce transparency" is on. |
| Actions | `Button` (primary, secondary, tertiary, ghost, destructive; sm / md / lg; icons; loading), `IconButton` (label required) | Legacy `outline` maps to `tertiary` and `danger` to `destructive`. |
| Inputs | `Input` (label, helper, error, adornments, clear, count), `PasswordField`, `SearchBar` (optional debounce), `OtpInput` | Errors are announced and carry an icon. Inputs pass keyboard, autofill and `textContentType` props straight through. |
| Content | `Card` (flat, outlined, elevated, tinted, pressable), `ListItem`, `Chip` / `Tag` / `ChipRow`, `Badge`, `Avatar`, `ProgressBar`, `StatCard`, `SectionHeader`, `Divider` | Pass `accent="fitness"` (a module key) instead of a colour. |
| Loading and state | `Skeleton` (+ `SkeletonText`, `SkeletonCard`, `SkeletonListItem`, `SkeletonList`), `EmptyState` (empty, noResults, offline), `ErrorState` (generic, network, timeout, sessionExpired, notFound; `errorKindFromError`) | Use skeletons, not spinners, for content. Every data screen needs loading, empty, error and offline states. |
| Overlays | `BottomSheet` (snap points, drag to dismiss, keyboard aware), `Dialog`, `Toast`, `Banner` | Do not render these directly for app messages; use `useNotify()`. |
| Navigation | bottom nav (`AppTabs`, all 10 tabs), `TopAppBar` (collapsing large title), `Tabs`, `Segmented`, `Screen`, `PullToRefresh`, `FloatingAction` | Give `Screen` a `title` to get the collapsing app bar. |
| Assistant | `FloatingAiWidget` | Draggable, snaps to a side edge, stays above the tab bar, hides under the keyboard and on the Ask Aura tab. Has accessibility move actions as an alternative to dragging. |

### Notifications (one system)

`useNotify()` from `@/providers/notify`: `toast`, `info`, `success`, `warning`, `error`, `banner` / `dismissBanner`,
`confirm` (returns `Promise<boolean>`, the replacement for `Alert.alert` confirmations), `alert` and `critical`.
Severity decides the surface ([`src/lib/notify.ts`](src/lib/notify.ts)):

| Severity | Surface | Stays | Haptic |
|---|---|---|---|
| info | toast | 4 s | none |
| success | toast | 3 s | success |
| warning | toast or banner | 5.5 s | warning |
| error | toast or banner | 7 s | error |
| critical | banner or dialog | until dismissed | error |

A toast with an action (for example Undo) stays at least 6 s. `toast({ onClose })` fires once when the toast leaves the
screen for any reason; toasts with `onClose` are never merged with look-alikes. Use it to run work that must wait for an
Undo window to close (see `components/notes/use-undoable-remove.ts`). On iOS, toasts and banners render in a
`FullWindowOverlay`, so they stay visible above native modal screens. Known limit: iOS cannot present the `confirm()`
dialog on top of an open `BottomSheet`; confirm inside the sheet instead (as the offline sheet does) or close the sheet first. Push notifications and the server-driven inbox map onto the
same severity model (see the comment at the top of `notify.ts`).

### Category template

Fashion, Fitness, Food, Skincare, Finance and Time share [`category-template.tsx`](src/components/ui/category-template.tsx):
`CategoryFrame` (background), `CategoryHeader` (accent eyebrow, headline, icon tile, section switcher: 2-4 sections as a
segmented control, 5+ as scrollable tabs) and `CategoryFab` (the one primary add / log action). Sections receive the header
as a `header` prop and render it inside their own list, so the header scrolls with the content. Notes and Saved use
`CollapsingList` (a FlatList with the same collapsing large title as `Screen`).

### Writing a new component

1. Take colours from `useTheme().colors` / `accent(...)`, sizes from `spacing`, `radius`, `layout`; text via `<Text>`.
2. Build touchables on `PressableScale`; make the target at least 44x44.
3. Handle default, pressed, focused, disabled, loading and error states, and set the accessibility role, label and state.
4. Animate with Reanimated, `transform` / `opacity` only, and honour `reduceMotion`.
5. Add it to the gallery and run `npm run check:contrast`, `npm run lint:tokens` and `npx tsc --noEmit`.

## Localisation, right-to-left, analytics and first-run

**Strings.** Every user-visible string lives in `src/i18n/locales/en/<namespace>.json` (one file per area, so areas never
edit the same file) and is read with `const { t } = useTranslation('<namespace>')` from `@/i18n`. Keys are type-checked,
so a missing key is a compile error. Use interpolation (`{{name}}`) rather than joining sentence fragments, and plural
suffixes (`items_one` / `items_other`) with `{ count }`. Never call `t()` at module scope; outside components use
`i18n.t('ns:key')`. Numbers and dates go through `lib/format.ts` (the phone's locale). To ship a language: add
`src/i18n/locales/<lang>/` with the same files and list it in `src/i18n/locale.ts`; `tests/i18n-catalog.test.ts` fails
if keys differ from English. `common` holds the shared-component defaults and `common:actions.*`.

**Right-to-left.** Write styles with logical properties: `marginStart`, `paddingEnd`, `start` / `end`, `borderStartWidth`,
`textAlign: 'auto'`. `npm run lint:tokens` rejects physical left/right. Directional icons (chevrons, arrows) use
`directional(ltrIcon, rtlIcon)` and hand-computed horizontal offsets multiply by `directionSign()` (both in
`@/i18n/rtl`). `hitSlopOf()` is the one helper that spells out left/right, because React Native's `Insets` has no
start/end.

**Analytics and crash reports.** `analytics` from `@/lib/telemetry` is a vendor-neutral hook: typed events
(`src/lib/telemetry/events.ts`; properties are enums, booleans and counts, never user content), screen views (automatic,
route path only), `captureException` (error boundary, global handler, failed queries and mutations). It is **off until
the user opts in** (Settings > Privacy) and no vendor SDK ships: implement `TelemetryAdapter` and call
`analytics.addAdapter(...)` to connect Sentry, Firebase or PostHog. Add new events to `events.ts` first.

**First run.** New installs see onboarding (3 screens, skippable), then sign-in, then once after the first sign-in a
permissions screen that explains notifications and biometric unlock before the system prompts appear (the app never
triggers the notification prompt on its own at launch). `PermissionRationaleSheet` (`components/permissions`) is the
reusable "why we need your photos / camera" sheet to show before an image picker prompt.

**Search.** `/search` (opened from the Home app bar) searches notes, saved items, transactions, budgets, goals, wardrobe,
meals, workouts, time logs and more from the data already cached on the phone, so it works offline. Matching is pure
logic in `src/features/search/match.ts`.

**Session expiry.** When the server ends the session, `useAuth().sessionExpired` is true and the sign-in screen shows
a banner until the user signs in again.

## Illustrations and data visuals

**Illustrations** are drawn in code so they follow the palette, the module accent and light / dark mode. A scene is a pure
`react-native-svg` component in `src/illustrations/scenes/` (layers back to front; colours only from the `ScenePalette`, no
literals, no text), registered in `registry.heroes.ts` (wide banners, e.g. `home-hero` with morning / day / evening / night
variants, `finance-hero`, `fitness-hero`) or `registry.spot.ts` (small scenes for empty states, errors, onboarding). Scene names are
`<moduleKey>-<what>` so the module accent is picked from the prefix. Draw them in the app with `<Illustration scene="..." />`
(idle drift per layer, scroll parallax via `scrollY`, hidden from screen readers unless given a label) or `<HeroBanner>` (art on
top, text below on a solid surface so contrast is guaranteed). `EmptyState` and `ErrorState` choose a scene automatically from
their variant or icon (`ui/empty-scenes.ts`).

**Previewing art:** `npm run render:art -- <name>` renders scenes to `mobile/.art-preview/<name>.png` (light left, dark right, one
row per variant) with no phone needed. Look at the PNG after every change.

**Data visuals** (`components/viz`): `ProgressRing`, `Sparkline`, `MiniBars`, `DonutChart`, `AnimatedNumber`, `StreakDots` and
`StatTile`. Never invent data to fill a chart. Every chart has a spoken summary, and status is never colour-only (icons, markers,
percentages). Geometry lives in `features/viz/geometry.ts` and is unit-tested. Charts draw their final state at once under
reduce-motion. They do not mirror in right-to-left layouts yet.

## Rules of thumb

- A new colour, size or spacing value means a new token, added in `src/theme/` with its contrast check, not a literal.
- Touch targets are at least 44x44 (`layout.minTouchTarget`), using `hitSlop` when the visual is smaller.
- Every data screen has loading (skeleton), empty, error and offline states.

## Status

| Phase | State |
|---|---|
| 1. Tokens | Done: colour, type, spacing, radius, elevation, motion, reduced-motion / transparency, contrast + token checks |
| 2. Components | Done (built, typechecked and bundled; not yet exercised on a device) |
| 3. Screens | Done: every screen migrated; 0 hard-coded colours / fonts / off-scale spacing (baseline is empty), no `Alert.alert` left |
| 4. Motion and glass | Done (kit, transitions, per-screen motion, audit); shared-element transitions skipped; needs a device pass |
| 5. Quality | Done: localisation (English catalog, 0 hard-coded strings), right-to-left styles, accessibility audit, error handling, analytics hook, onboarding, permissions, search, tests; needs a device pass |
