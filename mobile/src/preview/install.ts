import { applyPreset, DEFAULT_LAYOUT, HOME_LAYOUT_KEY, HOME_PRESETS, type HomePresetId } from '../features/home/layout';
import { installMockApi } from './mock-api';
import { isoDaysAgo } from './seed-util';

/**
 * Called once at app start in preview builds (see src/app/_layout.tsx). Answers the app's API calls with sample data and
 * fills the few things the app keeps on the phone itself (today's water, and the Home layout when the address says
 * `?home=<quick pick>`, or `?home=empty` for nothing on Home, so each layout can be screenshotted).
 */
export function installPreview() {
  installMockApi();
  try {
    globalThis.localStorage?.setItem(`aura.food.water.${isoDaysAgo(0)}`, JSON.stringify(1500));
  } catch {
    // Storage unavailable: the water ring just starts empty.
  }
  seedHomeLayout();
}

function seedHomeLayout() {
  try {
    const wanted = new URLSearchParams(globalThis.location?.search ?? '').get('home');
    if (!wanted) return;
    const layout =
      wanted === 'empty'
        ? { ...DEFAULT_LAYOUT, modules: [], customized: true }
        : HOME_PRESETS.some((p) => p.id === wanted)
          ? applyPreset(DEFAULT_LAYOUT, wanted as HomePresetId)
          : null;
    if (layout) globalThis.localStorage?.setItem(HOME_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Storage unavailable: Home keeps its default layout.
  }
}
