import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

function useAccessibilityFlag(read: () => Promise<boolean>, event: 'reduceMotionChanged' | 'reduceTransparencyChanged') {
  const [value, setValue] = useState(false);
  useEffect(() => {
    let alive = true;
    read()
      .then((v) => alive && setValue(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(event, setValue);
    return () => {
      alive = false;
      sub.remove();
    };
  }, [read, event]);
  return value;
}

const readReduceMotion = () => AccessibilityInfo.isReduceMotionEnabled();
const readReduceTransparency = () => AccessibilityInfo.isReduceTransparencyEnabled();

/** True when the OS "reduce motion" setting is on. Skip or simplify animations when it is. */
export const useReducedMotion = () => useAccessibilityFlag(readReduceMotion, 'reduceMotionChanged');

/** True when the OS "reduce transparency" setting is on (iOS). Use solid surfaces instead of glass. */
export const useReducedTransparency = () => useAccessibilityFlag(readReduceTransparency, 'reduceTransparencyChanged');
