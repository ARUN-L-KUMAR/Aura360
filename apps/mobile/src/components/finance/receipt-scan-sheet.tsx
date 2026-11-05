import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { draftFromReceipt, LOW_CONFIDENCE } from '@/components/finance/receipt';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useScanReceipt } from '@/features/finance/hooks';
import { useTranslation } from '@/i18n';
import { todayIso } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { duration, spacing } from '@/theme';

type Props = { visible: boolean; onClose: () => void };

/**
 * "Scan receipt": take or choose a photo, the server reads it, and the transaction form opens already filled in for the
 * person to check. Nothing is saved until they press save. The photo is sent for reading only; it is not stored.
 */
export function ReceiptScanSheet({ visible, onClose }: Props) {
  const { t } = useTranslation('finance');
  const router = useRouter();
  const notify = useNotify();
  const scan = useScanReceipt();
  const [error, setError] = useState<string | null>(null);
  const busy = scan.isPending;

  async function pick(useCamera: boolean) {
    setError(null);
    try {
      const permission = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('scan.cameraDenied'));
        return;
      }
      // Compressed and base64, so the upload stays well under the server's 10 MB limit.
      const options = { quality: 0.6, base64: true, mediaTypes: ['images'] as ImagePicker.MediaType[] };
      const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.base64) return;

      const response = await scan.mutateAsync({ base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
      const draft = draftFromReceipt(response.data, todayIso());
      haptics.success();
      if (response.data.confidence < LOW_CONFIDENCE) notify.warning(t('scan.lowConfidence'));
      onClose();
      setTimeout(() => router.push({ pathname: '/finance/transaction', params: { draft: JSON.stringify(draft) } }), duration.base);
    } catch {
      haptics.error();
      setError(t('scan.failed'));
    }
  }

  return (
    <BottomSheet glass visible={visible} onClose={busy ? () => {} : onClose} dismissible={!busy} title={t('scan.title')}>
      <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
        <Text variant="body" color="textSecondary">
          {busy ? t('scan.reading') : t('scan.message')}
        </Text>
        {error ? (
          <Text variant="caption" color="errorText" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title={t('scan.camera')} leftIcon="camera-outline" onPress={() => void pick(true)} loading={busy} />
        <Button title={t('scan.library')} variant="secondary" leftIcon="images-outline" onPress={() => void pick(false)} disabled={busy} />
      </View>
    </BottomSheet>
  );
}
