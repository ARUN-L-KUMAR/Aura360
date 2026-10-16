import { useRouter, type Href } from 'expo-router';

import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { SectionHeader } from '@/components/ui/section-header';
import type { IconName, ModuleKey } from '@/features/modules';

type Shortcut = { label: string; subtitle: string; href: string; icon: IconName; accent: ModuleKey };

const SHORTCUTS: Shortcut[] = [
  { label: 'Daily targets', subtitle: 'Workouts and goals', href: '/fitness', icon: 'flag-outline', accent: 'fitness' },
  { label: 'Health insights', subtitle: 'Meals and nutrition', href: '/food', icon: 'trending-up-outline', accent: 'food' },
  { label: 'Smart search', subtitle: 'Ask Aura about your data', href: '/ai', icon: 'sparkles-outline', accent: 'ai' },
];

export function Shortcuts({ index }: { index: number }) {
  const router = useRouter();
  return (
    <Section index={index}>
      <SectionHeader title="Shortcuts" />
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {SHORTCUTS.map((shortcut, i) => (
          <ListItem
            key={shortcut.label}
            title={shortcut.label}
            subtitle={shortcut.subtitle}
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
