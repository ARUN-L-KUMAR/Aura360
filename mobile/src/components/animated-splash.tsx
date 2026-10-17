import * as SplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { palettes, spacing, useReducedMotion } from '@/theme';

/**
 * The launch screen after the native splash.
 *
 * The native splash is a still image (the logo on a flat colour), so it cannot animate. As soon as the app's JS is
 * running this component draws the SAME logo in the SAME place, then hides the native splash underneath it, so the
 * hand-off is invisible. From there the glow breathes, the name and tagline fade in, and once the app is ready the
 * whole thing fades away into it.
 *
 * It follows the phone's system dark/light setting (like the native splash does), not the in-app theme, which is
 * loaded later.
 */

const LOGO = require('../../assets/images/splash-logo.png');
const GLOW = require('../../assets/images/logo-glow.png');

// Must match the "expo-splash-screen" plugin in app.json, so the two screens line up pixel for pixel.
const LOGO_BOX = 300;
/** Colours come from the light / dark palettes for the phone's scheme (the saved in-app theme is not loaded yet). */
const GLOW_OPACITY = { dark: 0.45, light: 0.35 } as const;
/** How far the name block overlaps the bottom of the logo box (the artwork has empty margin there). */
const TEXT_OVERLAP = spacing.xxl + spacing.xs;

/** Shortest time on screen, so a fast start doesn't flash the splash for a few frames. */
const MIN_VISIBLE_MS = 900;
const FADE_OUT_MS = 320;
/** If the app is still not ready after this long, say what we're waiting for. */
const SLOW_AFTER_MS = 2500;

type Props = {
  /** True once the app can show its first screen (for example the saved session has been read). */
  ready: boolean;
  /** Called after the fade-out has finished; remove the component then. */
  onFinish: () => void;
};

export function AnimatedSplash({ ready, onFinish }: Props) {
  const { t } = useTranslation('auth');
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = palettes[scheme];

  const reduceMotion = useReducedMotion();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hidden = useRef(false);
  const finishing = useRef(false);
  // keep the latest callback without restarting the leave sequence when the parent re-renders
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const glow = useSharedValue(0);
  const breathe = useSharedValue(1);
  const name = useSharedValue(0);
  const tagline = useSharedValue(0);
  const slowHint = useSharedValue(0);
  const overlay = useSharedValue(1);
  const logoZoom = useSharedValue(1);

  useEffect(() => {
    const min = setTimeout(() => setMinTimePassed(true), MIN_VISIBLE_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(slowTimer);
    };
  }, []);

  // Intro: starts once, after the first frame is on screen
  const startIntro = () => {
    const ease = Easing.out(Easing.cubic);
    glow.value = withTiming(1, { duration: reduceMotion ? 1 : 700, easing: ease });
    name.value = withDelay(reduceMotion ? 0 : 250, withTiming(1, { duration: reduceMotion ? 1 : 500, easing: ease }));
    tagline.value = withDelay(reduceMotion ? 0 : 500, withTiming(1, { duration: reduceMotion ? 1 : 500, easing: ease }));
    if (!reduceMotion) {
      // a slow, gentle breathing of the logo and glow while we wait
      breathe.value = withDelay(
        900,
        withRepeat(
          withSequence(
            withTiming(1.035, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      );
    }
  };

  const onLayout = () => {
    if (hidden.current) return;
    hidden.current = true;
    // One frame later, so the logo is already drawn when the native splash disappears
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
      startIntro();
    });
  };

  useEffect(() => {
    slowHint.value = withTiming(slow && !ready ? 1 : 0, { duration: 400 });
  }, [slow, ready, slowHint]);

  // Leave: when the app is ready AND the minimum time has passed
  useEffect(() => {
    if (!ready || !minTimePassed || finishing.current) return;
    finishing.current = true;
    setLeaving(true); // stop catching touches straight away
    overlay.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) });
    if (!reduceMotion) logoZoom.value = withTiming(1.12, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) });
    finishTimer.current = setTimeout(() => onFinishRef.current(), FADE_OUT_MS + 30);
  }, [ready, minTimePassed, reduceMotion, overlay, logoZoom]);

  // Only on unmount: never cancel the finish timer just because a dependency changed
  useEffect(
    () => () => {
      if (finishTimer.current) clearTimeout(finishTimer.current);
    },
    [],
  );

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value * logoZoom.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * GLOW_OPACITY[scheme],
    transform: [{ scale: 0.9 + 0.1 * glow.value + (breathe.value - 1) * 3 }],
  }));
  const nameStyle = useAnimatedStyle(() => ({ opacity: name.value, transform: [{ translateY: (1 - name.value) * 10 }] }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value, transform: [{ translateY: (1 - tagline.value) * 10 }] }));
  const slowStyle = useAnimatedStyle(() => ({ opacity: slowHint.value }));

  return (
    <Animated.View
      onLayout={onLayout}
      pointerEvents={leaving ? 'none' : 'auto'}
      accessible
      accessibilityLabel={slow && !ready ? t('splash.loadingSlow') : t('splash.loading')}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: palette.background }, overlayStyle]}>
      {/* soft glow behind the logo */}
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
        <Image source={GLOW} contentFit="contain" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* same image, size and position as the native splash */}
      <Animated.View pointerEvents="none" style={[styles.logo, logoStyle]}>
        <Image source={LOGO} contentFit="contain" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* below the logo, so the logo itself stays exactly where the native splash had it */}
      <View pointerEvents="none" style={styles.textBlock}>
        <Animated.View style={nameStyle}>
          <Text variant="display" color={palette.text} style={styles.name}>
            {t('splash.name')}
          </Text>
        </Animated.View>
        <Animated.View style={taglineStyle}>
          <Text variant="label" color={palette.textMuted} style={styles.tagline}>
            {t('splash.tagline')}
          </Text>
        </Animated.View>
      </View>

      <Animated.View pointerEvents="none" style={[styles.slow, slowStyle]}>
        <Text variant="caption" color={palette.textMuted}>
          {t('splash.slow')}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: LOGO_BOX * 1.25,
    height: LOGO_BOX * 1.25,
  },
  logo: {
    width: LOGO_BOX,
    height: LOGO_BOX,
  },
  textBlock: {
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_BOX / 2 - TEXT_OVERLAP,
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: { letterSpacing: 1.5 },
  tagline: { letterSpacing: 0.6 },
  slow: {
    position: 'absolute',
    bottom: spacing.xxxl + spacing.sm,
  },
});
