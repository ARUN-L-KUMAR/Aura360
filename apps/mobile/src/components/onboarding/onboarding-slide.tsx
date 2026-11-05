import { memo, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AUTH_FORM_MAX_WIDTH } from '@/components/auth-form-parts';
import { ChatIllustration, OfflineIllustration, OrbitIllustration } from '@/components/onboarding/illustrations';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';

export type SlideId = 'everything' | 'ask' | 'offline';

const ILLUSTRATION: Record<SlideId, () => ReactElement> = {
  everything: () => <OrbitIllustration />,
  ask: () => <ChatIllustration />,
  offline: () => <OfflineIllustration />,
};

type Props = {
  id: SlideId;
  /** Page width: the slide fills exactly one page of the paging list. */
  width: number;
  /** The page on screen. Other slides are hidden from screen readers so only the current page is read. */
  active: boolean;
};

/** One onboarding page: illustration, headline and a two-line description. Scrolls vertically at large text sizes. */
export const OnboardingSlide = memo(function OnboardingSlide({ id, width, active }: Props) {
  const { t } = useTranslation('onboarding');
  return (
    <View
      style={{ width }}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.art}>{ILLUSTRATION[id]()}</View>
        <View style={styles.copy}>
          <Text variant="headline" accessibilityRole="header" style={styles.center}>
            {t(`slides.${id}.title`)}
          </Text>
          <Text variant="body" color="textSecondary" style={styles.center}>
            {t(`slides.${id}.body`)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxl,
    paddingHorizontal: layout.screenPaddingWide,
    paddingVertical: spacing.lg,
  },
  art: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  copy: { gap: spacing.md, width: '100%', maxWidth: AUTH_FORM_MAX_WIDTH, alignItems: 'center' },
  center: { textAlign: 'center' },
});
