import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

function useAccessibilityFlag(read: () => Promise<boolean>, event: 'reduceMotionChanged' | 'reduceTransparencyChanged') {
  const [value, setValue] = useState(false);
  useEffect(() => {
    let alive = true;
    read()
      .then((v) => alive && setValue(v))
      .catch(() => {});
    let sub: { remove: () => void } | undefined;
    try {
      sub = AccessibilityInfo.addEventListener(event, setValue);
    } catch {
      // The platform does not emit this event: the initial value is all there is.
    }
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [read, event]);
  return value;
}

const readReduceMotion = () => AccessibilityInfo.isReduceMotionEnabled();
// Not every platform implements this (it is iOS-only; the web layer lacks it): treat a missing API as "off".
const readReduceTransparency = () =>
  typeof AccessibilityInfo.isReduceTransparencyEnabled === 'function' ? AccessibilityInfo.isReduceTransparencyEnabled() : Promise.resolve(false);

/** True when the OS "reduce motion" setting is on. Skip or simplify animations when it is. */
export const useReducedMotion = () => useAccessibilityFlag(readReduceMotion, 'reduceMotionChanged');

/** True when the OS "reduce transparency" setting is on (iOS). Use solid surfaces instead of glass. */
export const useReducedTransparency = () => useAccessibilityFlag(readReduceTransparency, 'reduceTransparencyChanged');
