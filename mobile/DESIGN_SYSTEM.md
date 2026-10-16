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

Rules: animate only `transform` and `opacity`; read `useTheme().reduceMotion` (or `useReducedMotion()`) and replace
movement with an instant or fade-only change when it is on; use skeleton shimmer, not spinners, for content loading.

## Glass

Blur + translucent `glass` + `glassBorder` is for overlays only: tab bar, sheets, the floating widget, headers. Fall back
to `glassSolid` when blur is unavailable or `useTheme().reduceTransparency` is true. Never use it on content cards.

## Components

All live in [`src/components/ui/`](src/components/ui/) and are built on tokens. Import each from its own file
(`@/components/ui/button`). **Open the gallery to review every component, state and theme in one place:** in a dev build
go to `aura360://dev/components` (route `src/app/(app)/dev/components.tsx`, development builds only).

| Group | Components | Notes |
|---|---|---|
| Base | `Text`, `PressableScale`, `GlassSurface` | `PressableScale` is the base touchable (scale + opacity feedback on the UI thread, focus ring, optional haptic, reduce-motion aware). `GlassSurface` is for overlays only and falls back to a solid surface when blur is unavailable or "reduce transparency" is on. |
| Actions | `Button` (primary, secondary, tertiary, ghost, destructive; sm / md / lg; icons; loading), `IconButton` (label required) | Legacy `outline` maps to `tertiary` and `danger` to `destructive`. |
| Inputs | `Input` (label, helper, error, adornments, clear, count), `PasswordField`, `SearchBar` (optional debounce), `OtpInput` | Errors are announced and carry an icon. Inputs pass keyboard, autofill and `textContentType` props straight through. |
| Content | `Card` (flat, outlined, elevated, tinted, pressable), `ListItem`, `Chip` / `Tag` / `ChipRow`, `Badge`, `Avatar`, `ProgressBar`, `StatCard`, `SectionHeader`, `Divider` | Pass `accent="fitness"` (a module key) instead of a colour. `GlassCard` is deprecated: use `Card`. |
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

A toast with an action (for example Undo) stays at least 6 s. Push notifications and the server-driven inbox map onto the
same severity model (see the comment at the top of `notify.ts`).

### Writing a new component

1. Take colours from `useTheme().colors` / `accent(...)`, sizes from `spacing`, `radius`, `layout`; text via `<Text>`.
2. Build touchables on `PressableScale`; make the target at least 44x44.
3. Handle default, pressed, focused, disabled, loading and error states, and set the accessibility role, label and state.
4. Animate with Reanimated, `transform` / `opacity` only, and honour `reduceMotion`.
5. Add it to the gallery and run `npm run check:contrast`, `npm run lint:tokens` and `npx tsc --noEmit`.

## Rules of thumb

- A new colour, size or spacing value means a new token, added in `src/theme/` with its contrast check, not a literal.
- Touch targets are at least 44x44 (`layout.minTouchTarget`), using `hitSlop` when the visual is smaller.
- Every data screen has loading (skeleton), empty, error and offline states.

## Status

| Phase | State |
|---|---|
| 1. Tokens | Done: colour, type, spacing, radius, elevation, motion, reduced-motion / transparency, contrast + token checks |
| 2. Components | Done (built, typechecked and bundled; not yet exercised on a device) |
| 3. Screens | Not started (hard-coded value debt is tracked in `scripts/design-tokens-baseline.json`) |
| 4. Motion and glass | Not started |
| 5. Quality | Not started |
