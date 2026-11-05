import { useEffect, useState } from 'react';

import { AnimatedNumber, type AnimatedNumberProps } from '@/components/viz/animated-number';

/** Ids that have counted up once in this app session. A number that counts up on every tab switch gets tiring. */
const counted = new Set<string>();

type Props = Omit<AnimatedNumberProps, 'from'> & {
  /** Stable name for this number ("week-workouts"). */
  id: string;
};

/**
 * `AnimatedNumber` that counts up the first time it appears after the data has loaded, then shows its value at once
 * on later visits (later changes still tween). Mount it only when the data is ready.
 */
export function CountUp({ id, value, ...rest }: Props) {
  const [first] = useState(() => !counted.has(id));
  useEffect(() => {
    counted.add(id);
  }, [id]);
  return <AnimatedNumber {...rest} value={value} from={first ? 0 : value} />;
}
