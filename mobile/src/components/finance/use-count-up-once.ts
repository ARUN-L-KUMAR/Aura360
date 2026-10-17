import { useEffect, useState } from 'react';

/** True once the first Finance overview of this app session has counted its numbers up. */
let counted = false;

/**
 * Numbers count up the first time the Finance overview shows real data in a session, and not again when the user comes
 * back to the tab or switches sections (a screen that replays its animation every visit gets tiresome).
 * Pass `ready` = "the data is on screen". The answer is fixed when the component mounts.
 *
 * ```tsx
 * const countUp = useCountUpOnce(!!data);
 * <AnimatedNumber value={n} from={countUp ? 0 : n} />
 * ```
 */
export function useCountUpOnce(ready: boolean) {
  const [animate] = useState(() => !counted);
  useEffect(() => {
    if (ready) counted = true;
  }, [ready]);
  return animate;
}
