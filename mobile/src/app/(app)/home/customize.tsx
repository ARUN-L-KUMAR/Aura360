import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { View } from 'react-native';

import { Reveal, SettingsSection, SwitchRow } from '@/components/settings-ui';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ListItem } from '@/components/ui/list-item';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { useModules } from '@/features/modules';
import { activePreset, HOME_MODULES, HOME_PRESETS, scoreGoals, type HomeModule, type HomePresetId, type HomeSection } from '@/features/home/layout';
import { useHomeLayout } from '@/features/home/use-home-layout';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme } from '@/theme';

const SECTION_ICON = {
  score: 'speedometer-outline',
  upNext: 'flash-outline',
  tiles: 'grid-outline',
  activity: 'stats-chart-outline',
} as const satisfies Record<HomeSection, string>;

const SECTION_ORDER: readonly HomeSection[] = ['score', 'upNext', 'tiles', 'activity'];

/** One quick pick: a card with the preset's name and the modules it covers. The chosen one is ringed and ticked. */
function PresetCard({ id, selected, onPress }: { id: HomePresetId; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const title = t(`customize.presets.${id}.title`);
  const body = t(`customize.presets.${id}.body`);
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${body}`}
      haptic="select"
      scaleTo={0.97}
      ringRadius={radius.xl}
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: layout.minTouchTarget * 2,
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: radius.xl,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primaryAccent : colors.border,
        backgroundColor: selected ? colors.primaryContainer : colors.card,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text variant="label" weight="bold" numberOfLines={2} style={{ flex: 1 }} color={selected ? 'onPrimaryContainer' : 'text'}>
          {title}
        </Text>
        {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primaryAccent} /> : null}
      </View>
      <Text variant="caption" numberOfLines={3} color={selected ? 'onPrimaryContainer' : 'textSecondary'}>
        {body}
      </Text>
    </PressableScale>
  );
}

/**
 * Customize Home: choose which modules Home shows and in what order, and which general sections stay. Changes apply and
 * are saved at once (on this device: the server keeps no dashboard setting), so there is no Save button.
 */
export default function CustomizeHomeScreen() {
  const { t } = useTranslation('home');
  const modules = useModules();
  const { layout: home, toggle, move, section, preset, reset } = useHomeLayout();

  const active = activePreset(home);
  const hidden = HOME_MODULES.filter((m) => !home.modules.includes(m));
  const canScore = Object.values(scoreGoals(home)).some(Boolean);

  const moduleRow = (module: HomeModule, position: number) => {
    const info = modules[module];
    const total = home.modules.length;
    const place = t('customize.position', { position: position + 1, count: total });
    return (
      <Reveal key={module}>
        <ListItem
          icon={info.icon}
          accent={module}
          title={info.label}
          accessible={false}
          divider={position < total - 1}
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <IconButton
                size="sm"
                icon="chevron-up"
                haptic="select"
                disabled={position === 0}
                accessibilityLabel={t('customize.moveUp', { module: info.label, place })}
                onPress={() => move(module, -1)}
              />
              <IconButton
                size="sm"
                icon="chevron-down"
                haptic="select"
                disabled={position === total - 1}
                accessibilityLabel={t('customize.moveDown', { module: info.label, place })}
                onPress={() => move(module, 1)}
              />
              <Toggle
                value
                onValueChange={() => {
                  haptics.select();
                  toggle(module);
                }}
                accessibilityLabel={info.label}
                accessibilityHint={t('customize.toggleHint', { place })}
              />
            </View>
          }
        />
      </Reveal>
    );
  };

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: t('customize.title') }} />

      <Text variant="body" color="textSecondary">
        {t('customize.intro')}
      </Text>

      <View accessibilityRole="radiogroup" accessibilityLabel={t('customize.presetsTitle')} style={{ gap: spacing.md }}>
        <Text variant="overline" color="textMuted" accessibilityRole="header">
          {t('customize.presetsTitle')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {HOME_PRESETS.slice(0, 2).map((p) => (
            <PresetCard key={p.id} id={p.id} selected={active === p.id} onPress={() => preset(p.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {HOME_PRESETS.slice(2).map((p) => (
            <PresetCard key={p.id} id={p.id} selected={active === p.id} onPress={() => preset(p.id)} />
          ))}
        </View>
      </View>

      <SettingsSection title={t('customize.modulesTitle')} footer={t('customize.modulesFooter')}>
        {home.modules.length > 0 ? (
          home.modules.map((module, position) => moduleRow(module, position))
        ) : (
          <View style={{ padding: layout.cardPadding }}>
            <Text variant="body" color="textSecondary">
              {t('customize.noModules')}
            </Text>
          </View>
        )}
      </SettingsSection>

      {hidden.length > 0 ? (
        <SettingsSection title={t('customize.hiddenTitle')}>
          {hidden.map((module, i) => (
            <Reveal key={module}>
              <SwitchRow
                icon={modules[module].icon}
                accent={module}
                title={modules[module].label}
                subtitle={modules[module].description}
                value={false}
                divider={i < hidden.length - 1}
                onValueChange={() => toggle(module)}
              />
            </Reveal>
          ))}
        </SettingsSection>
      ) : null}

      <SettingsSection title={t('customize.sectionsTitle')} footer={t('customize.deviceOnly')}>
        {SECTION_ORDER.map((name, i) => (
          <SwitchRow
            key={name}
            icon={SECTION_ICON[name]}
            title={t(`customize.sections.${name}.title`)}
            subtitle={name === 'score' && !canScore ? t('customize.sections.scoreNeeds') : t(`customize.sections.${name}.body`)}
            titleLines={2}
            value={home.sections[name]}
            divider={i < SECTION_ORDER.length - 1}
            onValueChange={(on) => section(name, on)}
          />
        ))}
      </SettingsSection>

      <Button title={t('customize.reset')} variant="tertiary" leftIcon="refresh-outline" onPress={reset} />
    </Screen>
  );
}
