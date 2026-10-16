import { useState, type ReactNode } from 'react';
import { AccessibilityInfo, Linking, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ErrorState } from '@/components/ui/error-state';
import { StatCard } from '@/components/ui/stat-card';
import { Tag } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useDeleteFashionItem, useLogItemWear, useUpdateItemStatus } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { errorMessage } from '@/lib/notify';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';
import { conditionMeta } from './condition';
import { FashionImage } from './shared';

interface ItemDetailSheetProps {
  /** The item to show; null closes the sheet. */
  item: FashionItem | null;
  onClose: () => void;
  onEdit: (item: FashionItem) => void;
}

const STATUS_LABEL: Record<FashionItem['status'], string> = {
  wardrobe: 'Wardrobe',
  wishlist: 'Wishlist',
  sold: 'Sold',
  donated: 'Donated',
};

/** Item details as a bottom sheet: peeks at 70%, drags up to 92%. */
export function ItemDetailSheet({ item, onClose, onEdit }: ItemDetailSheetProps) {
  // Keep the last item on screen while the sheet slides away.
  const [shown, setShown] = useState<FashionItem | null>(item);
  if (item && item !== shown) setShown(item);
  const current = item ?? shown;

  const subtitle = current ? [current.brand, current.category].filter(Boolean).join(' · ') : '';

  return (
    <BottomSheet
      visible={!!item}
      onClose={onClose}
      snapPoints={['70%', '92%']}
      scrollable
      accessibilityLabel={current ? `${current.name}, item details` : 'Item details'}
      header={
        current ? (
          <View style={{ gap: spacing.xs }}>
            <Text variant="title" accessibilityRole="header" numberOfLines={2}>
              {current.name}
            </Text>
            {subtitle ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
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

function SpecRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg }}>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      {typeof children === 'string' ? (
        <Text variant="body" weight="medium" style={{ flex: 1, textAlign: 'right' }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

function DetailBody({ item, onClose, onEdit }: ItemDetailSheetProps & { item: FashionItem }) {
  const { colors, accent } = useTheme();
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
  const platform = (item.metadata?.platform as string | undefined) || 'store';
  const condition = conditionMeta(item.condition);
  const isWardrobe = item.status === 'wardrobe';

  const fail = (err: unknown) => {
    haptics.error();
    setFailure(errorMessage(err));
  };

  const handleToggleStatus = () => {
    setFailure(null);
    const nextStatus = isWardrobe ? 'wishlist' : 'wardrobe';
    updateStatus.mutate(
      { id: item.id, status: nextStatus },
      {
        onSuccess: () => {
          notify.success(`Moved to your ${nextStatus}`);
          onClose();
        },
        onError: fail,
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
          AccessibilityInfo.announceForAccessibility(`Wear logged. Worn ${wearCount + 1} times.`);
        },
        onError: fail,
      },
    );
  };

  const handleDelete = async () => {
    setFailure(null);
    const confirmed = await notify.confirm({
      title: 'Delete this item?',
      message: `"${item.name}" will be removed from your ${isWardrobe ? 'wardrobe' : 'list'}. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        notify.success(`Deleted "${item.name}"`);
        onClose();
      },
      onError: fail,
    });
  };

  const handleOpenLink = () => {
    if (!buyingLink) return;
    setFailure(null);
    Linking.openURL(buyingLink).catch(() => setFailure("That link couldn't be opened. Check the address in the item's details."));
  };

  return (
    <View style={{ gap: spacing.lg, paddingTop: spacing.sm }}>
      {failure ? <ErrorState size="inline" title="That didn't work" message={failure} /> : null}

      {photos.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <FashionImage uri={activePhoto} style={{ width: '100%', aspectRatio: 3 / 2, borderRadius: radius.lg }} iconSize={48} />
          {photos.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {photos.map((uri, i) => {
                const selected = i === photoIndex;
                return (
                  <PressableScale
                    key={uri}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo ${i + 1} of ${photos.length}`}
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
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Tag label={STATUS_LABEL[item.status]} accent={isWardrobe ? 'fashion' : undefined} size="md" />
        {condition ? <Badge severity={condition.severity} icon={condition.icon} label={condition.label} /> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <StatCard label="Price" value={priceNum > 0 ? formatMoney(priceNum) : '—'} />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard label="Worn" value={`${wearCount}x`} accent="fashion" />
        </View>
        {costPerWear !== null ? (
          <View style={{ flex: 1 }}>
            <StatCard label="Per wear" value={formatMoney(costPerWear)} />
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        {isWardrobe ? <Button title="Worn today" leftIcon="sparkles" loading={logWear.isPending} onPress={handleLogWear} accessibilityHint="Adds one to the wear count" /> : null}
        <Button
          title={isWardrobe ? 'Move to wishlist' : 'Move to wardrobe'}
          variant="secondary"
          leftIcon={isWardrobe ? 'bookmark-outline' : 'shirt-outline'}
          loading={updateStatus.isPending}
          onPress={handleToggleStatus}
        />
        {buyingLink ? <Button title={`View in ${platform}`} variant="tertiary" leftIcon="cart-outline" rightIcon="open-outline" onPress={handleOpenLink} /> : null}
      </View>

      <Card padding="sm" style={{ gap: spacing.md }}>
        <Text variant="title" accessibilityRole="header">
          Details
        </Text>
        <SpecRow label="Category">{item.subcategory ? `${item.category} · ${item.subcategory}` : item.category}</SpecRow>
        {item.color ? <SpecRow label="Colour">{item.color}</SpecRow> : null}
        {item.size ? <SpecRow label="Size">{item.size}</SpecRow> : null}
        {condition ? <SpecRow label="Condition">{condition.label}</SpecRow> : null}
        {item.season && item.season.length > 0 ? <SpecRow label="Season">{item.season.join(', ')}</SpecRow> : null}
        {item.occasion && item.occasion.length > 0 ? <SpecRow label="Occasion">{item.occasion.join(', ')}</SpecRow> : null}
      </Card>

      {item.notes || item.description ? (
        <Card padding="sm" style={{ gap: spacing.sm }}>
          <Text variant="title" accessibilityRole="header">
            Notes
          </Text>
          <Text variant="body" color="textSecondary">
            {item.notes || item.description}
          </Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Edit"
            variant="secondary"
            leftIcon="pencil-outline"
            onPress={() => {
              onClose();
              onEdit(item);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Delete" variant="destructive" leftIcon="trash-outline" loading={deleteMutation.isPending} onPress={handleDelete} />
        </View>
      </View>
    </View>
  );
}
