import { useState, type ReactNode } from 'react';
import { AccessibilityInfo, Linking, View } from 'react-native';

import { failureMessage } from '@/components/finance/failure-message';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ErrorState } from '@/components/ui/error-state';
import { Tag } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useDeleteFashionItem, useLogItemWear, useUpdateItemStatus } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';
import { conditionMeta } from './condition';
import { categoryLabel, occasionLabel, seasonLabel, statusLabel } from './labels';
import { Heading, RingCard } from './section-kit';
import { FashionImage } from './shared';

interface ItemDetailSheetProps {
  /** The item to show; null closes the sheet. */
  item: FashionItem | null;
  onClose: () => void;
  onEdit: (item: FashionItem) => void;
}

/** Item details as a bottom sheet: peeks at 70%, drags up to 92%. */
export function ItemDetailSheet({ item, onClose, onEdit }: ItemDetailSheetProps) {
  const { t } = useTranslation('fashion');
  const { accent } = useTheme();
  // Keep the last item on screen while the sheet slides away.
  const [shown, setShown] = useState<FashionItem | null>(item);
  if (item && item !== shown) setShown(item);
  const current = item ?? shown;

  const subtitle = current ? [current.brand, categoryLabel(current.category)].filter(Boolean).join(' · ') : '';

  return (
    <BottomSheet
      visible={!!item}
      onClose={onClose}
      snapPoints={['70%', '92%']}
      scrollable
      accessibilityLabel={current ? t('detail.sheetLabel', { name: current.name }) : t('detail.sheetLabelFallback')}
      header={
        current ? (
          <View style={{ gap: spacing.xs }}>
            <Text variant="overline" numberOfLines={1} style={{ color: accent('fashion').text }}>
              {categoryLabel(current.category)}
            </Text>
            <Text variant="title" weight="bold" accessibilityRole="header" numberOfLines={2}>
              {current.name}
            </Text>
            {subtitle ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : undefined
      }>
      {current ? <DetailBody key={current.id} item={current} onClose={onClose} onEdit={onEdit} /> : null}
    </BottomSheet>
  );
}

/** One cell of the sheet's stat strip: tiny tracked label over a bold number, read as one phrase. */
function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, gap: spacing.xs, paddingHorizontal: spacing.sm }}>
      <Text variant="overline" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function SpecRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessible style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg }}>
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      {typeof children === 'string' ? (
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text variant="body" weight="medium">
            {children}
          </Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

function DetailBody({ item, onClose, onEdit }: ItemDetailSheetProps & { item: FashionItem }) {
  const { colors, accent } = useTheme();
  const { t } = useTranslation('fashion');
  const notify = useNotify();
  const [photoIndex, setPhotoIndex] = useState(0);
  // Toasts sit behind an open sheet, so failures are shown here.
  const [failure, setFailure] = useState<string | null>(null);

  const deleteMutation = useDeleteFashionItem();
  const updateStatus = useUpdateItemStatus();
  const logWear = useLogItemWear();

  const photos = Array.from(new Set([...(item.imageUrl ? [item.imageUrl] : []), ...(Array.isArray(item.images) ? item.images : [])]));
  const activePhoto = photos[Math.min(photoIndex, Math.max(0, photos.length - 1))];

  const priceNum = Number(item.price) || 0;
  const wearCount = item.wearCount ?? 0;
  const costPerWear = priceNum > 0 ? (wearCount > 0 ? priceNum / wearCount : priceNum) : null;
  const buyingLink = item.metadata?.buyingLink as string | undefined;
  const platform = (item.metadata?.platform as string | undefined) || t('detail.store');
  const condition = conditionMeta(item.condition);
  const isWardrobe = item.status === 'wardrobe';

  const fail = (err: unknown, fallback = t('errors.update')) => {
    haptics.error();
    setFailure(failureMessage(err, fallback));
  };

  const handleToggleStatus = () => {
    setFailure(null);
    const nextStatus = isWardrobe ? 'wishlist' : 'wardrobe';
    updateStatus.mutate(
      { id: item.id, status: nextStatus },
      {
        onSuccess: () => {
          notify.success(nextStatus === 'wishlist' ? t('detail.movedWishlist') : t('detail.movedWardrobe'));
          onClose();
        },
        onError: (err) => fail(err),
      },
    );
  };

  const handleLogWear = () => {
    setFailure(null);
    logWear.mutate(
      { id: item.id, currentWearCount: wearCount },
      {
        onSuccess: () => {
          haptics.success();
          AccessibilityInfo.announceForAccessibility(t('detail.wearLogged', { count: wearCount + 1 }));
        },
        onError: (err) => fail(err),
      },
    );
  };

  const handleDelete = async () => {
    setFailure(null);
    const confirmed = await notify.confirm({
      title: t('detail.deleteTitle'),
      message: isWardrobe ? t('detail.deleteWardrobe', { name: item.name }) : t('detail.deleteList', { name: item.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        notify.success(t('detail.deleted', { name: item.name }));
        onClose();
      },
      onError: (err) => fail(err, t('errors.delete')),
    });
  };

  const handleOpenLink = () => {
    if (!buyingLink) return;
    setFailure(null);
    Linking.openURL(buyingLink).catch(() => setFailure(t('errors.link')));
  };

  return (
    <View style={{ gap: spacing.lg, paddingTop: spacing.sm }}>
      {failure ? <ErrorState size="inline" title={t('errors.failTitle')} message={failure} /> : null}

      <View style={{ gap: spacing.sm }}>
          <FashionImage uri={activePhoto} category={item.category} accessibilityLabel={t('detail.photo', { name: item.name })} style={{ width: '100%', aspectRatio: photos.length > 0 ? 4 / 3 : 2, borderRadius: radius.xl }} iconSize={48} />
          {photos.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {photos.map((uri, i) => {
                const selected = i === photoIndex;
                return (
                  <PressableScale
                    key={uri}
                    accessibilityRole="button"
                    accessibilityLabel={t('detail.photoPick', { index: i + 1, total: photos.length })}
                    accessibilityState={{ selected }}
                    haptic="select"
                    onPress={() => setPhotoIndex(i)}
                    style={{
                      width: layout.minTouchTarget,
                      height: layout.minTouchTarget,
                      borderRadius: radius.sm,
                      borderWidth: 2,
                      borderColor: selected ? accent('fashion').solid : colors.border,
                      overflow: 'hidden',
                    }}>
                    <FashionImage uri={uri} style={{ flex: 1 }} iconSize={16} />
                  </PressableScale>
                );
              })}
            </View>
          ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Tag label={statusLabel(item.status)} accent={isWardrobe ? 'fashion' : undefined} size="md" />
        {condition ? <Badge severity={condition.severity} icon={condition.icon} label={condition.label} /> : null}
      </View>

      <RingCard padding="sm" style={{ flexDirection: 'row', gap: 0 }}>
        <DetailStat label={t('detail.price')} value={priceNum > 0 ? formatMoney(priceNum) : t('common.dash')} />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
        <DetailStat label={t('detail.worn')} value={t('detail.wornCount', { n: wearCount })} />
        {costPerWear !== null ? (
          <>
            <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
            <DetailStat label={t('detail.perWear')} value={formatMoney(Math.round(costPerWear))} />
          </>
        ) : null}
      </RingCard>

      <View style={{ gap: spacing.sm }}>
        {isWardrobe ? <Button title={t('detail.wearToday')} leftIcon="sparkles" loading={logWear.isPending} onPress={handleLogWear} accessibilityHint={t('detail.wearHint')} /> : null}
        <Button
          title={isWardrobe ? t('detail.toWishlist') : t('detail.toWardrobe')}
          variant="secondary"
          leftIcon={isWardrobe ? 'bookmark-outline' : 'shirt-outline'}
          loading={updateStatus.isPending}
          onPress={handleToggleStatus}
        />
        {buyingLink ? <Button title={t('detail.viewIn', { platform })} variant="tertiary" leftIcon="cart-outline" rightIcon="open-outline" onPress={handleOpenLink} /> : null}
      </View>

      <RingCard padding="sm" style={{ gap: spacing.md }}>
        <Heading overline={t('detail.detailsOverline')} title={t('detail.detailsTitle')} />
        <SpecRow label={t('detail.category')}>{item.subcategory ? `${categoryLabel(item.category)} · ${item.subcategory}` : categoryLabel(item.category)}</SpecRow>
        {item.color ? <SpecRow label={t('detail.colour')}>{item.color}</SpecRow> : null}
        {item.size ? <SpecRow label={t('detail.size')}>{item.size}</SpecRow> : null}
        {condition ? <SpecRow label={t('detail.condition')}>{condition.label}</SpecRow> : null}
        {item.season && item.season.length > 0 ? <SpecRow label={t('detail.season')}>{item.season.map(seasonLabel).join(', ')}</SpecRow> : null}
        {item.occasion && item.occasion.length > 0 ? <SpecRow label={t('detail.occasion')}>{item.occasion.map(occasionLabel).join(', ')}</SpecRow> : null}
      </RingCard>

      {item.notes || item.description ? (
        <RingCard padding="sm" style={{ gap: spacing.md }}>
          <Heading overline={t('detail.notesOverline')} title={t('detail.notesTitle')} />
          <Text variant="body" color="textSecondary">
            {item.notes || item.description}
          </Text>
        </RingCard>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button
            title={t('detail.edit')}
            variant="secondary"
            leftIcon="pencil-outline"
            onPress={() => {
              onClose();
              onEdit(item);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={t('detail.delete')} variant="destructive" leftIcon="trash-outline" loading={deleteMutation.isPending} onPress={handleDelete} />
        </View>
      </View>
    </View>
  );
}
