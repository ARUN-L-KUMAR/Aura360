import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTH_FORM_MAX_WIDTH } from '@/components/auth-form-parts';
import { OnboardingSlide, type SlideId } from '@/components/onboarding/onboarding-slide';
import { PageDots } from '@/components/onboarding/page-dots';
import { Button } from '@/components/ui/button';
import { markOnboardingDone } from '@/features/onboarding/storage';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { analytics } from '@/lib/telemetry';
import { layout, spacing, useTheme } from '@/theme';

const SLIDES: SlideId[] = ['everything', 'ask', 'offline'];
const LAST = SLIDES.length - 1;
const VIEWABILITY = { itemVisiblePercentThreshold: 60 } as const;
const LOGIN = '/login' as Href;

/**
 * First-run introduction: three short pages with a persistent Skip. Finishing or skipping stores the "done" flag (which
 * is what lets the auth layout stop redirecting here) and replaces this screen with the sign-in screen.
 */
export default function OnboardingScreen() {
  const { t } = useTranslation('onboarding');
  const router = useRouter();
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const listRef = useRef<FlatList<SlideId>>(null);
  const finishing = useRef(false);
  const [index, setIndex] = useState(0);

  // Direction-agnostic: the list reports which page is mostly on screen, so this stays right when the layout is RTL.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index;
    if (typeof first === 'number') setIndex(first);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setIndex(target);
      listRef.current?.scrollToIndex({ index: target, animated: !reduceMotion });
    },
    [reduceMotion],
  );

  const finish = useCallback(
    (skipped: boolean) => {
      if (finishing.current) return;
      finishing.current = true;
      analytics.track('onboarding_completed', { skipped, step: index + 1 });
      // The flag is published in memory first, so the auth layout sees "done" before the route changes (no bounce back).
      void markOnboardingDone();
      router.replace(LOGIN);
    },
    [index, router],
  );

  const next = useCallback(() => {
    if (index >= LAST) finish(false);
    else goTo(index + 1);
  }, [finish, goTo, index]);

  // Android back steps to the previous page; on the first page it leaves the app as usual.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      goTo(index - 1);
      return true;
    });
    return () => sub.remove();
  }, [index, goTo]);

  // Announce page changes to screen readers (not the first page: the screen itself is announced on arrival).
  const announced = useRef(0);
  const pageLabel = t('pageOf', { current: index + 1, total: SLIDES.length });
  useEffect(() => {
    if (announced.current !== index) {
      announced.current = index;
      AccessibilityInfo.announceForAccessibility(pageLabel);
    }
  }, [index, pageLabel]);

  // Keep the current page aligned when the width changes (rotation, split screen).
  const lastWidth = useRef(width);
  useEffect(() => {
    if (lastWidth.current === width) return;
    lastWidth.current = width;
    listRef.current?.scrollToIndex({ index, animated: false });
  }, [width, index]);

  const getItemLayout = useCallback(
    (_: ArrayLike<SlideId> | null | undefined, i: number) => ({ length: width, offset: width * i, index: i }),
    [width],
  );
  const renderItem = useCallback(
    ({ item, index: i }: { item: SlideId; index: number }) => <OnboardingSlide id={item} width={width} active={i === index} />,
    [width, index],
  );
  const keyExtractor = useCallback((item: SlideId) => item, []);
  const edge = useMemo(
    () => ({ paddingTop: insets.top + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) }),
    [insets.top, insets.bottom],
  );

  const isLast = index === LAST;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, edge]}>
      <View style={styles.topBar}>
        <Button
          title={t('skip')}
          accessibilityLabel={t('skipLabel')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          haptic="select"
          onPress={() => finish(true)}
        />
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        extraData={index}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        style={styles.list}
      />

      <View style={styles.footer}>
        <PageDots count={SLIDES.length} index={index} label={pageLabel} />
        <Button
          title={isLast ? t('getStarted') : t('next')}
          size="lg"
          rightIcon={directional('arrow-forward', 'arrow-back')}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingWide,
    minHeight: layout.minTouchTarget,
  },
  list: { flex: 1 },
  footer: {
    width: '100%',
    maxWidth: AUTH_FORM_MAX_WIDTH + layout.screenPaddingWide * 2,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPaddingWide,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
});
