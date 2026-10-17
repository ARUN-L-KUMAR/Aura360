import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform } from 'react-native';
import { Easing, withTiming, type SharedValue } from 'react-native-reanimated';

import { duration, easing, motionDuration } from '@/theme';

import { PEEK_DELAY_MS } from './widget-constants';

const EASE_STANDARD = Easing.bezier(...easing.standard);

/** True while the software keyboard is on screen. */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** True while VoiceOver / TalkBack is running. */
export function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => alive && setEnabled(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

/**
 * Drives the idle "peek" of the bubble (`peek`: 0 = out, 1 = tucked toward the edge). Call `touchStart` / `dragStart`
 * to bring it out and `touchEnd` / `dragEnd` to start the idle countdown again. All members are stable callbacks.
 */
export function useIdlePeek(peek: SharedValue<number>, enabled: boolean, reduceMotion: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    peek.set(withTiming(0, { duration: motionDuration(duration.fast, reduceMotion), easing: EASE_STANDARD }));
  }, [peek, reduceMotion]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!enabled || dragging.current) return;
    timer.current = setTimeout(() => {
      if (!dragging.current) {
        peek.set(withTiming(1, { duration: motionDuration(duration.slow, reduceMotion), easing: EASE_STANDARD }));
      }
    }, PEEK_DELAY_MS);
  }, [enabled, peek, reduceMotion]);

  useEffect(() => {
    cancel();
    schedule();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [cancel, schedule]);

  const dragStart = useCallback(() => {
    dragging.current = true;
    cancel();
  }, [cancel]);

  const dragEnd = useCallback(() => {
    dragging.current = false;
    schedule();
  }, [schedule]);

  return useMemo(
    () => ({ touchStart: cancel, touchEnd: schedule, dragStart, dragEnd }),
    [cancel, schedule, dragStart, dragEnd],
  );
}
