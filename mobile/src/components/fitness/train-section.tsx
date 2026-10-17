import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LiveRestTimer } from '@/components/fitness/live-rest-timer';
import { RestTimer } from '@/components/fitness/rest-timer';
import { QueryError } from '@/components/fitness/section-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { ErrorState } from '@/components/ui/error-state';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { ListItem } from '@/components/ui/list-item';
import { useListMotion } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useRecentFitness, useSaveFitness, useSubstitutes } from '@/features/fitness/hooks';
import {
  buildExercise,
  buildWorkoutPayload,
  elapsedSeconds,
  restRemainingSeconds,
  sessionActions,
  sessionTotals,
  useLiveSession,
  useNow,
  type LiveExercise,
  type LiveSession,
} from '@/features/fitness/session-store';
import { formatDuration, isWorkout, lastPerformanceByExercise } from '@/features/fitness/stats';
import { COMMON_EXERCISES, type Exercise } from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { getDeviceLocale, i18n, useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

export function TrainSection({ header, onFinished }: { header: ReactNode; onFinished: () => void }) {
  const { hydrated, session } = useLiveSession();

  if (!hydrated) {
    return (
      <Screen>
        {header}
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
      </Screen>
    );
  }

  return session ? <ActiveWorkout header={header} session={session} onFinished={onFinished} /> : <StartWorkout header={header} />;
}

// ─── No workout running ───────────────────────────────────────────────────────

function StartWorkout({ header }: { header: ReactNode }) {
  const { t } = useTranslation('fitness');
  const [title, setTitle] = useState(() => i18n.t('fitness:train.defaultTitle'));
  const recent = useRecentFitness();

  const lastWorkout = useMemo(() => (recent.data ?? []).find((entry) => isWorkout(entry) && (entry.exercises?.length ?? 0) > 0), [recent.data]);

  function startEmpty() {
    haptics.tap();
    sessionActions.start(title.trim() || t('train.defaultTitle'));
    analytics.track('workout_started', { source: 'manual' });
  }

  function repeatLast() {
    if (!lastWorkout?.exercises) return;
    haptics.tap();
    sessionActions.start(
      title.trim() || t('train.defaultTitle'),
      lastWorkout.exercises.map((ex) => buildExercise({ name: ex.name, sets: ex.sets, reps: ex.reps }, ex)),
    );
    analytics.track('workout_started', { source: 'manual' });
  }

  return (
    <Screen onRefresh={() => recent.refetch()} refreshing={recent.isRefetching}>
      {header}

      {recent.isError ? <QueryError error={recent.error} hasData retrying={recent.isFetching} onRetry={() => recent.refetch()} /> : null}

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title={t('train.startTitle')} subtitle={t('train.startSubtitle')} />
        <Input
          label={t('train.workoutName')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('train.workoutNamePlaceholder')}
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={startEmpty}
        />
        <Button title={t('train.startEmpty')} leftIcon="play" haptic={false} onPress={startEmpty} />
      </Card>

      {lastWorkout?.exercises ? (
        <Card style={{ gap: spacing.sm }}>
          <SectionHeader title={t('train.repeatTitle')} />
          <Text variant="body" numberOfLines={3}>
            {lastWorkout.exercises.map((ex) => ex.name).join(' · ')}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('train.repeatHint')}
          </Text>
          <Button title={t('train.repeatButton')} variant="secondary" leftIcon="repeat" haptic={false} onPress={repeatLast} />
        </Card>
      ) : null}

      <RestTimer />

      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        {t('train.coachHint')}
      </Text>
    </Screen>
  );
}

// ─── Workout running ──────────────────────────────────────────────────────────

function ActiveWorkout({ header, session, onFinished }: { header: ReactNode; session: LiveSession; onFinished: () => void }) {
  useKeepAwake();
  const { t } = useTranslation('fitness');
  const notify = useNotify();
  const errorMessage = useErrorMessage();
  const save = useSaveFitness();
  const recent = useRecentFitness();

  const lastByName = useMemo(() => lastPerformanceByExercise(recent.data ?? []), [recent.data]);
  const knownNames = useMemo(
    () => [...new Set([...(recent.data ?? []).flatMap((entry) => entry.exercises?.map((ex) => ex.name) ?? []), ...COMMON_EXERCISES])],
    [recent.data],
  );

  async function finish() {
    const { doneSets, volume } = sessionTotals(session);
    if (doneSets === 0) {
      const discardIt = await notify.confirm({
        title: t('train.noSetsTitle'),
        message: t('train.noSetsMessage'),
        confirmLabel: t('train.discard'),
        cancelLabel: t('train.keepGoing'),
        destructive: true,
      });
      if (discardIt) sessionActions.discard();
      return;
    }
    const ok = await notify.confirm({
      title: t('train.finishTitle'),
      message: t('train.finishMessage', {
        sets: doneSets,
        volume: Math.round(volume).toLocaleString(getDeviceLocale()),
        time: formatDuration(elapsedSeconds(session, Date.now())),
      }),
      confirmLabel: t('train.finishConfirm'),
      cancelLabel: t('train.notYet'),
    });
    if (!ok) return;
    try {
      await save.mutateAsync({ input: buildWorkoutPayload(session, Date.now(), toIsoDay(new Date())) });
      sessionActions.discard();
      notify.success(t('train.saved'));
      analytics.track('workout_finished');
      onFinished();
    } catch (e) {
      notify.error(errorMessage(e, t('train.saveFailed')));
    }
  }

  async function discard() {
    const ok = await notify.confirm({
      title: t('train.discardTitle'),
      message: t('train.discardMessage'),
      confirmLabel: t('train.discard'),
      cancelLabel: t('train.keep'),
      destructive: true,
    });
    if (ok) sessionActions.discard();
  }

  return (
    <Screen>
      {header}

      <Card style={{ gap: spacing.md }}>
        <Input label={t('train.workoutName')} value={session.title} onChangeText={sessionActions.setTitle} autoCapitalize="sentences" returnKeyType="done" />
        <LiveSummary session={session} />
      </Card>

      <LiveRest session={session} />

      {session.exercises.length === 0 ? (
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          {t('train.addFirst')}
        </Text>
      ) : null}

      {session.exercises.map((exercise, index) => (
        <ExerciseCard key={exercise.id} index={index} exercise={exercise} last={lastByName.get(exercise.name.trim().toLowerCase())} />
      ))}

      <AddExercise names={knownNames} lastByName={lastByName} />

      <View style={{ gap: spacing.sm }}>
        <Button title={t('train.finish')} leftIcon="checkmark" onPress={finish} loading={save.isPending} />
        <Button title={t('train.discardButton')} variant="ghost" onPress={discard} disabled={save.isPending} />
      </View>
    </Screen>
  );
}

/** Elapsed time, pause control and running totals. Owns the one-second clock so the exercise list does not re-render. */
function LiveSummary({ session }: { session: LiveSession }) {
  const { t } = useTranslation('fitness');
  const now = useNow(true);
  const seconds = elapsedSeconds(session, now);
  const { doneSets, totalSets, volume } = sessionTotals(session);
  const paused = !!session.pausedAt;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flexShrink: 1, gap: spacing.xs }}>
          {/* Not a live region: a clock that spoke every second would drown out everything else. */}
          <Text variant="display" numeric accessibilityLabel={t('train.elapsed', { time: formatDuration(seconds) })}>
            {formatDuration(seconds)}
          </Text>
          {paused ? <Tag label={t('train.paused')} icon="pause" tone="neutral" /> : null}
        </View>
        <IconButton
          icon={paused ? 'play' : 'pause'}
          variant="tonal"
          size="lg"
          accessibilityLabel={paused ? t('actions.resumeWorkout') : t('train.pause')}
          onPress={() => sessionActions.togglePause()}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.sm }}>
        <Metric label={t('train.sets')} value={`${doneSets}/${totalSets}`} />
        <Metric label={t('train.volume')} value={t('units.kg', { value: Math.round(volume).toLocaleString(getDeviceLocale()) })} />
        <Metric label={t('train.burnEstimated')} value={t('units.kcal', { value: Math.round((seconds / 60) * 7.5 + doneSets * 4) })} />
      </View>
    </View>
  );
}

/** Shows the rest countdown when one is running; buzzes and announces once when it ends. */
function LiveRest({ session }: { session: LiveSession }) {
  const { t } = useTranslation('fitness');
  const now = useNow(true);
  const rest = restRemainingSeconds(session, now);

  // Rest finished: buzz once, tell screen readers, and clear the timer.
  useEffect(() => {
    if (rest === 0) {
      haptics.success();
      AccessibilityInfo.announceForAccessibility(t('train.restOver'));
      sessionActions.skipRest();
    }
  }, [rest, t]);

  return rest !== null && rest > 0 ? <LiveRestTimer remaining={rest} total={session.restTotalSec} /> : null;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexGrow: 1, flexBasis: 88, gap: 2 }}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="label" weight="semiBold" numeric>
        {value}
      </Text>
    </View>
  );
}

/** Same height as an Input, so a set row lines up. */
const SET_BUTTON = layout.minTouchTarget + spacing.xs;

const ExerciseCard = memo(function ExerciseCard({ exercise, last, index }: { exercise: LiveExercise; last?: Exercise; index: number }) {
  const { t } = useTranslation('fitness');
  const notify = useNotify();
  const substitutes = useSubstitutes();
  const [swapOpen, setSwapOpen] = useState(false);
  const motion = useListMotion(index);

  function openSwap() {
    setSwapOpen(true);
    substitutes.mutate({ exerciseName: exercise.name, targetMuscle: exercise.category });
  }

  async function removeExercise() {
    const ok = await notify.confirm({
      title: t('train.removeExerciseTitle', { name: exercise.name }),
      message: t('train.removeExerciseMessage'),
      confirmLabel: t('train.remove'),
      cancelLabel: t('actions.cancel'),
      destructive: true,
    });
    if (ok) sessionActions.removeExercise(exercise.id);
  }

  const lastText = last?.weight ? t('train.lastTime', { weight: last.weight, reps: last.reps ?? '-' }) : null;

  return (
    <Animated.View {...motion}>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title" numberOfLines={2} accessibilityRole="header">
              {exercise.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {[exercise.category, t('units.secondsRest', { value: exercise.restSeconds }), lastText].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <IconButton icon="swap-horizontal" size="sm" accessibilityLabel={t('train.swap', { name: exercise.name })} onPress={openSwap} />
          <IconButton icon="trash-outline" size="sm" destructive accessibilityLabel={t('train.removeExercise', { name: exercise.name })} onPress={removeExercise} />
        </View>

        {swapOpen ? (
          <Card variant="flat" padding="sm" style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" weight="semiBold" accessibilityRole="header">
                {t('train.swapWith')}
              </Text>
              <IconButton icon="close" size="sm" accessibilityLabel={t('train.closeSuggestions')} onPress={() => setSwapOpen(false)} />
            </View>
            {substitutes.isPending ? <SkeletonList count={2} avatar={false} /> : null}
            {substitutes.isError ? (
              <ErrorState
                size="inline"
                error={substitutes.error}
                retryLabel={t('actions.tryAgain')}
                onRetry={() => substitutes.mutate({ exerciseName: exercise.name, targetMuscle: exercise.category })}
              />
            ) : null}
            {substitutes.isSuccess && substitutes.data.length === 0 ? (
              <Text variant="body" color="textSecondary">
                {t('train.swapEmpty')}
              </Text>
            ) : null}
            {(substitutes.data ?? []).map((option) => (
              <ListItem
                key={option.name}
                title={option.name}
                subtitle={`${option.equipment} · ${option.whyItWorks}`}
                accessibilityHint={t('train.swapHint')}
                onPress={() => {
                  sessionActions.replaceExercise(exercise.id, option.name);
                  setSwapOpen(false);
                }}
              />
            ))}
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text variant="caption" weight="semiBold" color="textSecondary" style={{ width: spacing.xxl, textTransform: 'uppercase' }}>
            {t('train.columnSet')}
          </Text>
          <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}>
            {t('train.columnKg')}
          </Text>
          <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}>
            {t('train.columnReps')}
          </Text>
          <View style={{ width: SET_BUTTON }} />
        </View>

        {exercise.sets.map((set, setIndex) => (
          <SetRow key={set.id} exerciseId={exercise.id} index={setIndex} weight={set.weight} reps={set.reps} done={set.done} />
        ))}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs }}>
          <Button title={t('train.addSet')} variant="secondary" size="sm" leftIcon="add" fullWidth={false} onPress={() => sessionActions.addSet(exercise.id)} />
          {exercise.sets.length > 1 ? (
            <Button
              title={t('train.removeLastSet')}
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => sessionActions.removeSet(exercise.id, exercise.sets.length - 1)}
            />
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
});

const SetRow = memo(function SetRow({ exerciseId, index, weight, reps, done }: { exerciseId: string; index: number; weight: number; reps: number; done: boolean }) {
  const { accent, colors } = useTheme();
  const { t } = useTranslation('fitness');
  const fitness = accent('fitness');
  const motion = useListMotion(0);
  // Keep what is being typed as text so "7." or an empty box does not jump while editing.
  const [weightText, setWeightText] = useState(String(weight));
  const [repsText, setRepsText] = useState(String(reps));

  return (
    <Animated.View {...motion} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text variant="label" numeric color="textSecondary" style={{ width: spacing.xxl }} accessibilityElementsHidden importantForAccessibility="no">
        {index + 1}
      </Text>
      <Input
        containerStyle={{ flex: 1 }}
        value={weightText}
        onChangeText={(text) => {
          setWeightText(text);
          const value = Number.parseFloat(text.replace(',', '.'));
          if (Number.isFinite(value) && value >= 0) sessionActions.updateSet(exerciseId, index, { weight: value });
        }}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={t('train.setWeight', { n: index + 1 })}
        style={{ textAlign: 'center' }}
      />
      <Input
        containerStyle={{ flex: 1 }}
        value={repsText}
        onChangeText={(text) => {
          setRepsText(text);
          const value = Number.parseInt(text, 10);
          if (Number.isFinite(value) && value >= 0) sessionActions.updateSet(exerciseId, index, { reps: value });
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={t('train.setReps', { n: index + 1 })}
        style={{ textAlign: 'center' }}
      />
      <PressableScale
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={t('train.setDone', { n: index + 1 })}
        accessibilityHint={t('train.setDoneHint')}
        accessibilityActions={[{ name: 'delete', label: t('train.removeSet') }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') sessionActions.removeSet(exerciseId, index);
        }}
        haptic={false}
        ringRadius={radius.md}
        onPress={() => {
          if (sessionActions.toggleSet(exerciseId, index)) haptics.impact();
        }}
        onLongPress={() => sessionActions.removeSet(exerciseId, index)}
        style={{
          width: SET_BUTTON,
          height: SET_BUTTON,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? fitness.solid : colors.cardMuted,
          borderWidth: 1,
          borderColor: done ? fitness.solid : colors.borderStrong,
        }}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? fitness.onSolid : colors.textMuted} />
      </PressableScale>
    </Animated.View>
  );
});

function AddExercise({ names, lastByName }: { names: string[]; lastByName: Map<string, Exercise> }) {
  const { t } = useTranslation('fitness');
  const [text, setText] = useState('');

  const suggestions = useMemo(() => {
    const query = text.trim().toLowerCase();
    return names.filter((name) => (query ? name.toLowerCase().includes(query) : true)).slice(0, 8);
  }, [names, text]);

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    haptics.tap();
    sessionActions.addExercise(buildExercise({ name: trimmed }, lastByName.get(trimmed.toLowerCase())));
    setText('');
  }

  const canAddCustom = !!text.trim() && !names.some((name) => name.toLowerCase() === text.trim().toLowerCase());

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader title={t('train.addExercise')} />
      <Input
        value={text}
        onChangeText={setText}
        placeholder={t('train.searchExercise')}
        accessibilityLabel={t('train.exerciseName')}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={() => add(text)}
        clearable
      />
      <ChipGroup>
        {suggestions.map((name) => (
          <Chip key={name} label={name} accent="fitness" selectable={false} icon="add" onPress={() => add(name)} />
        ))}
      </ChipGroup>
      {canAddCustom ? <Button title={t('train.addCustom', { name: text.trim() })} variant="secondary" leftIcon="add" haptic={false} onPress={() => add(text)} /> : null}
    </Card>
  );
}
