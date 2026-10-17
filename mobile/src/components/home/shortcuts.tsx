import { useRouter, type Href } from 'expo-router';

import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { SectionHeader } from '@/components/ui/section-header';
import type { IconName, ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';

type Shortcut = { key: 'targets' | 'insights' | 'ask'; href: string; icon: IconName; accent: ModuleKey };

const SHORTCUTS: Shortcut[] = [
  { key: 'targets', href: '/fitness', icon: 'flag-outline', accent: 'fitness' },
  { key: 'insights', href: '/food', icon: 'trending-up-outline', accent: 'food' },
  { key: 'ask', href: '/ai', icon: 'sparkles-outline', accent: 'ai' },
];

export function Shortcuts({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  return (
    <Section index={index}>
      <SectionHeader title={t('shortcuts.title')} />
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {SHORTCUTS.map((shortcut, i) => (
          <ListItem
            key={shortcut.key}
            title={t(`shortcuts.${shortcut.key}.label`)}
            subtitle={t(`shortcuts.${shortcut.key}.subtitle`)}
            icon={shortcut.icon}
            accent={shortcut.accent}
            divider={i < SHORTCUTS.length - 1}
            onPress={() => router.push(shortcut.href as Href)}
          />
        ))}
      </Card>
    </Section>
  );
}
