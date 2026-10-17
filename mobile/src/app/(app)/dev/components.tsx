import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryHeader, type CategoryKey } from '@/components/ui/category-template';
import { Chip, ChipRow, Tag } from '@/components/ui/chip';
import { Divider } from '@/components/ui/divider';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { OtpInput } from '@/components/ui/otp-input';
import { PasswordField } from '@/components/ui/password-field';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SearchBar } from '@/components/ui/search-bar';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { SuccessCheck } from '@/components/ui/success-check';
import { Toggle } from '@/components/ui/toggle';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { haptics } from '@/lib/haptics';
import { Skeleton, SkeletonCard, SkeletonList, SkeletonText } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { Toast } from '@/components/ui/toast';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme, type ModuleKey, type ThemeMode } from '@/theme';

const MODULES: ModuleKey[] = ['finance', 'fitness', 'food', 'fashion', 'skincare', 'notes', 'saved', 'time', 'ai'];
const SEVERITIES = ['info', 'success', 'warning', 'error', 'critical'] as const;

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={title} subtitle={note} />
      {children}
    </View>
  );
}

const Wrap = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>{children}</View>
);

function Palette() {
  const { colors, accent } = useTheme();
  const roles = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'info'] as const;
  return (
    <View style={{ gap: spacing.md }}>
      <Wrap>
        {roles.map((role) => (
          <View
            key={role}
            style={{
              backgroundColor: colors[role],
              borderRadius: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}>
            <Text variant="label" weight="semiBold" color={role === 'secondary' || role === 'tertiary' ? `${role}Text` : 'textInverse'}>
              {role}
            </Text>
          </View>
        ))}
      </Wrap>
      <Wrap>
        {MODULES.map((key) => {
          const a = accent(key);
          return (
            <View key={key} style={{ backgroundColor: a.solid, borderRadius: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
              <Text variant="label" weight="semiBold" style={{ color: a.onSolid }}>
                {key}
              </Text>
            </View>
          );
        })}
      </Wrap>
    </View>
  );
}

function Typography() {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="display">Display 32</Text>
      <Text variant="headline">Headline 26</Text>
      <Text variant="title">Title 18</Text>
      <Text variant="body">Body 15 - the quick brown fox jumps over the lazy dog.</Text>
      <Text variant="label">Label 14</Text>
      <Text variant="caption" muted>
        Caption 12 - supporting text
      </Text>
      <Text variant="title" numeric>
        ₹1,23,456.78
      </Text>
    </View>
  );
}

function Buttons() {
  const [loading, setLoading] = useState(false);
  const variants = ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'] as const;
  return (
    <View style={{ gap: spacing.md }}>
      {variants.map((variant) => (
        <Wrap key={variant}>
          <Button title={variant} variant={variant} size="sm" />
          <Button title={variant} variant={variant} size="md" leftIcon="add" />
          <Button title="Disabled" variant={variant} disabled />
        </Wrap>
      ))}
      <Button
        title={loading ? 'Saving…' : 'Tap for loading state'}
        loading={loading}
        onPress={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 1600);
        }}
      />
      <Button title="Large with trailing icon" size="lg" rightIcon="arrow-forward" />
      <Wrap>
        <IconButton icon="heart" accessibilityLabel="Favourite" variant="filled" />
        <IconButton icon="share-outline" accessibilityLabel="Share" variant="tonal" />
        <IconButton icon="ellipsis-horizontal" accessibilityLabel="More" variant="ghost" />
        <IconButton icon="trash-outline" accessibilityLabel="Delete" variant="tonal" destructive />
        <IconButton icon="notifications-outline" accessibilityLabel="Notifications, 3 new" variant="ghost" badge badgeLabel="3 new" />
      </Wrap>
    </View>
  );
}

function Inputs() {
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const invalid = email.length > 0 && !email.includes('@');
  return (
    <View style={{ gap: spacing.md }}>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        leftIcon="mail-outline"
        helper="We only use this to sign you in."
        error={invalid ? 'Enter a valid email address.' : undefined}
        clearable
      />
      <Input label="Notes" placeholder="Multiline with counter" multiline showCount maxLength={120} />
      <Input label="Disabled" value="Read only value" disabled />
      <PasswordField label="Password" placeholder="At least 8 characters" />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search everything" debounceMs={250} />
      <View style={{ gap: spacing.xs }}>
        <OtpInput label="Verification code" value={otp} onChangeText={setOtp} error={otpError ? 'That code is not right. Try again.' : null} onComplete={(code) => setOtpError(code !== '123456')} />
        <Text variant="caption" muted>
          Enter 123456 for success, anything else shows the error state.
        </Text>
      </View>
    </View>
  );
}

function Display() {
  return (
    <View style={{ gap: spacing.md }}>
      <Wrap>
        <View style={{ flexGrow: 1, flexBasis: '45%' }}>
          <Card variant="flat">
            <Text variant="label">Flat</Text>
          </Card>
        </View>
        <View style={{ flexGrow: 1, flexBasis: '45%' }}>
          <Card variant="outlined">
            <Text variant="label">Outlined</Text>
          </Card>
        </View>
        <View style={{ flexGrow: 1, flexBasis: '45%' }}>
          <Card variant="elevated">
            <Text variant="label">Elevated</Text>
          </Card>
        </View>
        <View style={{ flexGrow: 1, flexBasis: '45%' }}>
          <Card variant="tinted" accent="fashion">
            <Text variant="label">Tinted</Text>
          </Card>
        </View>
      </Wrap>
      <Card variant="outlined" onPress={() => {}} accessibilityLabel="Pressable card">
        <Text variant="label">Pressable card</Text>
        <Text variant="caption" muted>
          Scales on press and exposes a button role.
        </Text>
      </Card>
      <Wrap>
        <Chip label="All" selected />
        <Chip label="Tops" count={12} />
        <Chip label="Removable" onRemove={() => {}} />
        <Chip label="Disabled" disabled />
        <Chip label="Fitness" accent="fitness" selected />
        <Tag label="Tag" icon="pricetag-outline" />
      </Wrap>
      <ChipRow>
        <Chip label="Scrollable" />
        <Chip label="chip" />
        <Chip label="row" />
      </ChipRow>
      <Wrap>
        <Badge variant="dot" severity="error" />
        <Badge variant="count" count={7} />
        <Badge variant="count" count={240} />
        {(['info', 'success', 'warning', 'error', 'neutral'] as const).map((severity) => (
          <Badge key={severity} variant="label" severity={severity} label={severity} />
        ))}
      </Wrap>
      <Wrap>
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
          <Avatar key={size} name="Aura Kumar" size={size} />
        ))}
        <Avatar name="Online User" status="online" />
        <Avatar name="Busy User" status="busy" />
      </Wrap>
      <Card padding="none">
        <ListItem title="Finance" subtitle="Budgets and goals" icon="wallet-outline" accent="finance" chevron onPress={() => {}} divider />
        <ListItem title="Fitness" subtitle="Today's workout" icon="barbell-outline" accent="fitness" meta="45 min" onPress={() => {}} divider />
        <ListItem title="Selected row" subtitle="With avatar" avatar={{ name: 'Aura Kumar' }} selected onPress={() => {}} divider />
        <ListItem title="Disabled row" icon="lock-closed-outline" disabled />
      </Card>
      <ProgressBar percent={45} accent="fitness" showLabel label="Weekly goal" />
      <ProgressBar percent={85} autoThresholdColor showLabel label="Budget used" />
      <ProgressBar percent={100} autoThresholdColor showLabel label="Over budget" />
      <Wrap>
        <View style={{ flexGrow: 1, flexBasis: '45%' }}>
          <StatCard label="Spent" value="₹12,400" subtitle="This month" icon="wallet-outline" accent="finance" trend={{ value: '8%', isPositive: false }} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: '45%' }}>
          <StatCard label="Workouts" value={4} subtitle="This week" icon="barbell-outline" accent="fitness" trend={{ value: '2', isPositive: true }} />
        </View>
      </Wrap>
      <Divider />
    </View>
  );
}

function States() {
  return (
    <View style={{ gap: spacing.lg }}>
      <Card variant="outlined">
        <EmptyState icon="shirt-outline" title="Your wardrobe is empty" description="Add your first item to start building outfits." actionTitle="Add item" onAction={() => {}} />
      </Card>
      <Card variant="outlined">
        <EmptyState variant="noResults" title="No matches" description="Try a different search or clear the filters." onClearFilters={() => {}} />
      </Card>
      <Card variant="outlined">
        <EmptyState variant="offline" />
      </Card>
      <ErrorState kind="network" onRetry={() => {}} size="inline" />
      <ErrorState kind="timeout" onRetry={() => {}} size="inline" />
      <ErrorState kind="sessionExpired" size="inline" />
      <Text variant="label">Skeletons</Text>
      <Wrap>
        <Skeleton shape="circle" size={48} />
        <Skeleton shape="line" width={160} />
        <Skeleton shape="box" width={96} height={48} />
      </Wrap>
      <SkeletonText lines={3} />
      <SkeletonCard media />
      <SkeletonList count={2} avatar />
    </View>
  );
}

function Overlays() {
  const notify = useNotify();
  const [sheet, setSheet] = useState<null | 'auto' | 'tall' | 'form'>(null);
  const [name, setName] = useState('');
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="label">Toasts</Text>
      <Wrap>
        {SEVERITIES.slice(0, 4).map((severity) => (
          <Button key={severity} title={severity} size="sm" variant="secondary" onPress={() => notify.toast({ severity, message: `This is a ${severity} message.` })} />
        ))}
        <Button
          title="With undo"
          size="sm"
          variant="tertiary"
          onPress={() => notify.toast({ severity: 'success', message: 'Note deleted.', action: { label: 'Undo', onPress: () => notify.info('Restored.') } })}
        />
      </Wrap>
      <Text variant="label">Dialogs</Text>
      <Wrap>
        <Button
          title="Confirm"
          size="sm"
          variant="secondary"
          onPress={async () => notify.info((await notify.confirm({ title: 'Save changes?', message: 'Your edits will be kept.', confirmLabel: 'Save' })) ? 'Saved.' : 'Cancelled.')}
        />
        <Button
          title="Destructive"
          size="sm"
          variant="destructive"
          onPress={async () => {
            const ok = await notify.confirm({ title: 'Delete this entry?', message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
            notify.info(ok ? 'Deleted.' : 'Kept.');
          }}
        />
        <Button title="Alert" size="sm" variant="tertiary" onPress={() => void notify.alert({ title: 'Heads up', message: 'Your session ends in five minutes.' })} />
      </Wrap>
      <Text variant="label">Bottom sheets</Text>
      <Wrap>
        <Button title="Auto height" size="sm" variant="secondary" onPress={() => setSheet('auto')} />
        <Button title="Two snaps" size="sm" variant="secondary" onPress={() => setSheet('tall')} />
        <Button title="With input" size="sm" variant="secondary" onPress={() => setSheet('form')} />
      </Wrap>
      <BottomSheet visible={sheet === 'auto'} onClose={() => setSheet(null)} title="Auto height" snapPoints="auto">
        <View style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
          <Text>Sized to its content. Drag the handle down, tap the backdrop, or press back to close.</Text>
          <Button title="Done" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === 'tall'} onClose={() => setSheet(null)} title="Two snap points" snapPoints={['40%', '90%']} scrollable>
        <View style={{ gap: spacing.md }}>
          {Array.from({ length: 14 }, (_, i) => (
            <ListItem key={i} title={`Row ${i + 1}`} subtitle="Scrolls inside the sheet" icon="albums-outline" />
          ))}
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === 'form'} onClose={() => setSheet(null)} title="Rename" snapPoints="auto" keyboardAware>
        <View style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
          <Input label="Name" value={name} onChangeText={setName} placeholder="Collection name" autoFocus />
          <Button title="Save" onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>
      <Text variant="label">Banners and toasts, as rendered</Text>
      {SEVERITIES.map((severity) => (
        <Banner key={severity} severity={severity} title={severity === 'critical' ? 'Action needed' : undefined} message={`A ${severity} banner with a clear next step.`} action={{ label: 'Fix', onPress: () => {} }} onDismiss={() => {}} />
      ))}
      <Toast severity="success" message="Static toast preview" action={{ label: 'Undo', onPress: () => {} }} />
    </View>
  );
}

const CATEGORIES: CategoryKey[] = ['fashion', 'fitness', 'food', 'skincare', 'finance', 'time'];

function Categories() {
  const [section, setSection] = useState('one');
  return (
    <View style={{ gap: spacing.xl }}>
      {CATEGORIES.map((module) => (
        <Card key={module} variant="outlined">
          <CategoryHeader
            module={module}
            sections={[
              { value: 'one', label: 'Overview' },
              { value: 'two', label: 'Log' },
              { value: 'three', label: 'Stats' },
            ]}
            section={section}
            onSectionChange={setSection}
          />
        </Card>
      ))}
      <Text variant="caption" muted>
        Each category takes its accent from the tertiary ramp rotated to its own hue. The primary action is CategoryFab (see the live screens).
      </Text>
    </View>
  );
}

function MotionRow({ index, label, onRemove }: { index: number; label: string; onRemove: () => void }) {
  const motion = useListMotion(index);
  return (
    <Animated.View {...motion}>
      <ListItem title={label} subtitle="Tap to remove: the row fades out and the list closes the gap" icon="albums-outline" onPress={onRemove} />
    </Animated.View>
  );
}

function Motion() {
  const [on, setOn] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState([1, 2, 3, 4]);
  const [picked, setPicked] = useState(false);
  const hero = useBlockMotion();
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="label">Toggle (slides on a spring, cross-fades the track)</Text>
      <Wrap>
        <Toggle value={on} onValueChange={setOn} accessibilityLabel="Demo switch" />
        <Toggle value={!on} onValueChange={(v) => setOn(!v)} accent="fitness" accessibilityLabel="Fitness switch" />
        <Toggle value disabled onValueChange={() => {}} accessibilityLabel="Disabled switch" />
      </Wrap>
      <Text variant="label">Success check</Text>
      <Wrap>
        <SuccessCheck visible={done} />
        <SuccessCheck visible={done} accent="food" size={32} />
        <Button
          title={done ? 'Reset' : 'Complete'}
          size="sm"
          variant="secondary"
          onPress={() => {
            if (!done) haptics.success();
            setDone(!done);
          }}
        />
      </Wrap>
      <Text variant="label">Button success state</Text>
      <Button
        title="Save changes"
        loading={saving}
        success={saved}
        onPress={() => {
          setSaving(true);
          setTimeout(() => {
            setSaving(false);
            setSaved(true);
            haptics.success();
            setTimeout(() => setSaved(false), 1400);
          }, 900);
        }}
      />
      <Text variant="label">Chip pop</Text>
      <Wrap>
        <Chip label="Select me" selected={picked} onPress={() => setPicked(!picked)} />
      </Wrap>
      <Text variant="label">List enter, exit and reflow</Text>
      <Card padding="none">
        {rows.map((row, index) => (
          <MotionRow key={row} index={index} label={`Row ${row}`} onRemove={() => setRows((list) => list.filter((r) => r !== row))} />
        ))}
      </Card>
      <Button title="Reset rows" size="sm" variant="tertiary" onPress={() => setRows([1, 2, 3, 4])} />
      <Text variant="label">Hero gradient and elevation</Text>
      <Animated.View {...hero}>
        <Card gradient="finance" variant="outlined">
          <Text variant="title">Money on hand</Text>
          <Text variant="headline" numeric>
            ₹48,250
          </Text>
          <Text variant="caption" color="textSecondary">
            Soft accent wash fading into the surface. One per screen.
          </Text>
        </Card>
      </Animated.View>
      <Wrap>
        {([1, 2, 3, 4] as const).map((level) => (
          <Card key={level} padding="sm" variant="elevated" style={{ minWidth: 72 }}>
            <Text variant="caption">Level {level}</Text>
          </Card>
        ))}
      </Wrap>
    </View>
  );
}

function Navigation() {
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('grid');
  return (
    <View style={{ gap: spacing.md }}>
      <Tabs
        value={tab}
        onChange={setTab}
        accessibilityLabel="Filter"
        tabs={[
          { value: 'all', label: 'All', count: 24 },
          { value: 'saved', label: 'Saved' },
          { value: 'recent', label: 'Recent', count: 3 },
          { value: 'archived', label: 'Archived', disabled: true },
        ]}
      />
      <Tabs
        scrollable
        accent="fitness"
        value={tab}
        onChange={setTab}
        tabs={['all', 'saved', 'recent', 'archived', 'shared', 'drafts'].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
      />
      <Segmented
        value={view}
        onChange={setView}
        accessibilityLabel="Layout"
        options={[
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List' },
        ]}
      />
      <Text variant="caption" muted>
        The bottom navigation bar is the live one at the bottom of the Home tabs. Open this screen from there to compare.
      </Text>
    </View>
  );
}

export default function ComponentGallery() {
  const { mode, setMode, reduceMotion, reduceTransparency } = useTheme();
  if (!__DEV__) {
    return (
      <Screen>
        <EmptyState icon="construct-outline" title="Not available" description="The component gallery is only available in development builds." />
      </Screen>
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen title="Components" subtitle="Design system gallery" contentContainerStyle={{ gap: spacing.xxl }}>
        <Section title="Theme" note={`Reduce motion: ${reduceMotion ? 'on' : 'off'} · Reduce transparency: ${reduceTransparency ? 'on' : 'off'}`}>
          <Segmented
            value={mode}
            onChange={(next) => setMode(next as ThemeMode)}
            accessibilityLabel="Theme"
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Section>
        <Section title="Color">
          <Palette />
        </Section>
        <Section title="Typography">
          <Typography />
        </Section>
        <Section title="Buttons">
          <Buttons />
        </Section>
        <Section title="Inputs">
          <Inputs />
        </Section>
        <Section title="Display">
          <Display />
        </Section>
        <Section title="Loading, empty and error">
          <States />
        </Section>
        <Section title="Overlays and notifications">
          <Overlays />
        </Section>
        <Section title="Motion" note="Turn on Reduce Motion in the phone's accessibility settings to see everything switch to instant or fade-only.">
          <Motion />
        </Section>
        <Section title="Category template">
          <Categories />
        </Section>
        <Section title="Navigation">
          <Navigation />
        </Section>
      </Screen>
    </>
  );
}
