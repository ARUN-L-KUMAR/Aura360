import { installMockApi } from './mock-api';
import { isoDaysAgo } from './seed-util';

/**
 * Called once at app start in preview builds (see src/app/_layout.tsx). Answers the app's API calls with sample data and
 * fills the few things the app keeps on the phone itself (today's water).
 */
export function installPreview() {
  installMockApi();
  try {
    globalThis.localStorage?.setItem(`aura.food.water.${isoDaysAgo(0)}`, JSON.stringify(1500));
  } catch {
    // Storage unavailable: the water ring just starts empty.
  }
}
