import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { ItemDetailSheet } from '@/components/fashion/item-detail-sheet';
import { OutfitsSection } from '@/components/fashion/outfits-section';
import { OverviewSection } from '@/components/fashion/overview-section';
import { PlannerSection } from '@/components/fashion/planner-section';
import { ProfileSection } from '@/components/fashion/profile-section';
import { EMPTY_ITEMS, type ItemsState } from '@/components/fashion/shared';
import { WardrobeSection } from '@/components/fashion/wardrobe-section';
import { WishlistSection } from '@/components/fashion/wishlist-section';
import { CategoryFab, CategoryFrame, CategoryHeader, type CategorySection } from '@/components/ui/category-template';
import { useFashionItems } from '@/features/fashion/hooks';
import type { FashionItem } from '@/features/fashion/types';
import { useTranslation } from '@/i18n';

type Section = 'overview' | 'wardrobe' | 'wishlist' | 'outfits' | 'planner' | 'fit';
const SECTIONS: Section[] = ['overview', 'wardrobe', 'wishlist', 'outfits', 'planner', 'fit'];

export default function FashionTabScreen() {
  const router = useRouter();
  const { t } = useTranslation('fashion');
  // `/fashion?section=wardrobe` opens a section, `&item=<id>` its detail sheet (links and the preview harness use them).
  const { section: requested, item: requestedItem } = useLocalSearchParams<{ section?: string; item?: string }>();
  const [section, setSection] = useState<Section>(SECTIONS.includes(requested as Section) ? (requested as Section) : 'overview');
  const [selectedId, setSelectedId] = useState<string | null>(requestedItem ?? null);

  const itemsQuery = useFashionItems();
  const { data, isPending, fetchStatus, isError, error, isRefetching, refetch } = itemsQuery;
  const items = data ?? EMPTY_ITEMS;

  // Cached items stay on screen while refetching or offline; the states below only apply when there is nothing to show.
  const state = useMemo<ItemsState>(
    () => ({
      loading: isPending && fetchStatus !== 'paused',
      offline: isPending && fetchStatus === 'paused',
      error: isError && !data ? error : null,
      staleError: isError && data ? error : null,
      refreshing: isRefetching,
      refetch: () => {
        void refetch();
      },
    }),
    [isPending, fetchStatus, isError, data, error, isRefetching, refetch],
  );

  const wardrobeCount = useMemo(() => items.filter((i) => i.status === 'wardrobe').length, [items]);
  const wishlistCount = useMemo(() => items.filter((i) => i.status === 'wishlist').length, [items]);
  const selectedItem = useMemo(() => (selectedId ? (items.find((i) => i.id === selectedId) ?? null) : null), [items, selectedId]);

  const sections = useMemo<CategorySection<Section>[]>(
    () => [
      { value: 'overview', label: t('sections.overview') },
      { value: 'wardrobe', label: t('sections.wardrobe'), count: data ? wardrobeCount : undefined },
      { value: 'wishlist', label: t('sections.wishlist'), count: data ? wishlistCount : undefined },
      { value: 'outfits', label: t('sections.outfits') },
      { value: 'planner', label: t('sections.planner') },
      { value: 'fit', label: t('sections.fit') },
    ],
    [data, wardrobeCount, wishlistCount, t],
  );

  const handleSelect = useCallback((item: FashionItem) => setSelectedId(item.id), []);
  const handleCloseSheet = useCallback(() => setSelectedId(null), []);

  const handleOpenAdd = useCallback(() => {
    if (section === 'outfits') {
      router.push('/fashion/outfit');
    } else {
      router.push({
        pathname: '/fashion/add',
        params: { defaultStatus: section === 'wishlist' ? 'wishlist' : 'wardrobe' },
      });
    }
  }, [router, section]);

  const handlePlanOutfit = useCallback(() => router.push('/fashion/outfit'), [router]);

  const handleEditItem = useCallback(
    (item: FashionItem) => {
      router.push({ pathname: '/fashion/add', params: { id: item.id } });
    },
    [router],
  );

  const header = <CategoryHeader module="fashion" sections={sections} section={section} onSectionChange={setSection} />;

  return (
    <CategoryFrame>
      {section === 'overview' ? (
        <OverviewSection
          items={items}
          state={state}
          header={header}
          onSelectItem={handleSelect}
          onAddNew={handleOpenAdd}
          onPlanOutfit={handlePlanOutfit}
          onGoToWardrobe={() => setSection('wardrobe')}
          onGoToWishlist={() => setSection('wishlist')}
          onGoToLaundry={() => setSection('planner')}
        />
      ) : null}

      {section === 'wardrobe' ? <WardrobeSection items={items} state={state} header={header} onSelectItem={handleSelect} onAddNew={handleOpenAdd} /> : null}

      {section === 'wishlist' ? <WishlistSection items={items} state={state} header={header} onSelectItem={handleSelect} onAddNew={handleOpenAdd} /> : null}

      {section === 'outfits' ? <OutfitsSection items={items} state={state} header={header} onCreateOutfit={handleOpenAdd} /> : null}

      {section === 'planner' ? <PlannerSection items={items} state={state} header={header} onSelectItem={handleSelect} onAddNew={handleOpenAdd} /> : null}

      {section === 'fit' ? <ProfileSection header={header} /> : null}

      {section !== 'fit' ? (
        <CategoryFab module="fashion" icon="add" label={section === 'outfits' ? t('fab.createOutfit') : section === 'wishlist' ? t('fab.addWishlist') : t('fab.addItem')} onPress={handleOpenAdd} />
      ) : null}

      <ItemDetailSheet item={selectedItem} onClose={handleCloseSheet} onEdit={handleEditItem} />
    </CategoryFrame>
  );
}
