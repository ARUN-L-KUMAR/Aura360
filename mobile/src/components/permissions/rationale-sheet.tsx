import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconDisc } from '@/components/onboarding/icon-disc';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, type IconName } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { spacing, type ModuleKey } from '@/theme';

export type RationalePermission = 'photos' | 'camera';

const ICON: Record<RationalePermission, IconName> = { photos: 'images-outline', camera: 'camera-outline' };
const ACCENT: Record<RationalePermission, ModuleKey> = { photos: 'fashion', camera: 'skincare' };
const DISC = spacing.xxxl + spacing.xl; // 72

export type PermissionRationaleSheetProps = {
  visible: boolean;
  /** Which system permission the screen is about to ask for. */
  permission: RationalePermission;
  /** The user agreed: the caller now launches the picker / camera, which shows the system prompt. */
  onContinue: () => void;
  /** The user declined, tapped outside or swiped the sheet away. The caller hides the sheet and does not ask. */
  onNotNow: () => void;
};

/**
 * Explains, in the app's own words, why a screen needs the photo library or the camera, before the system prompt appears.
 * Props only: it asks for nothing and stores nothing. The caller owns `visible`, closes the sheet in both callbacks and
 * starts the system request from `onContinue`.
 *
 * ```tsx
 * <PermissionRationaleSheet
 *   visible={askPhotos}
 *   permission="photos"
 *   onNotNow={() => setAskPhotos(false)}
 *   onContinue={() => { setAskPhotos(false); void pickImage(); }}
 * />
 * ```
 */
export const PermissionRationaleSheet = memo(function PermissionRationaleSheet({
  visible,
  permission,
  onContinue,
  onNotNow,
}: PermissionRationaleSheetProps) {
  const { t } = useTranslation('permissions');
  const title = t(`rationale.${permission}.title`);

  return (
    <BottomSheet
      visible={visible}
      onClose={onNotNow}
      accessibilityLabel={title}
      footer={
        <View style={styles.actions}>
          <Button title={t('rationale.continue')} size="lg" onPress={onContinue} />
          <Button title={t('rationale.notNow')} variant="ghost" onPress={onNotNow} />
        </View>
      }>
      <View style={styles.body}>
        <IconDisc icon={ICON[permission]} size={DISC} accent={ACCENT[permission]} />
        <Text variant="title" accessibilityRole="header" style={styles.center}>
          {title}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          {t(`rationale.${permission}.reason`)}
        </Text>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  center: { textAlign: 'center' },
  actions: { gap: spacing.sm },
});
