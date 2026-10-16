import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LiveRestTimer } from '@/components/fitness/live-rest-timer';
import { RestTimer } from '@/components/fitness/rest-timer';
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
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
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
  const [title, setTitle] = useState('Workout');
  const recent = useRecentFitness();

  const lastWorkout = useMemo(() => (recent.data ?? []).find((entry) => isWorkout(entry) && (entry.exercises?.length ?? 0) > 0), [recent.data]);

  function startEmpty() {
    haptics.tap();
    sessionActions.start(title.trim() || 'Workout');
  }

  function repeatLast() {
    if (!lastWorkout?.exercises) return;
    haptics.tap();
    sessionActions.start(
      title.trim() || 'Workout',
      lastWorkout.exercises.map((ex) => buildExercise({ name: ex.name, sets: ex.sets, reps: ex.reps }, ex)),
    );
  }

  return (
    <Screen onRefresh={() => recent.refetch()} refreshing={recent.isRefetching}>
      {header}

      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Start a workout" subtitle="Name it, then add exercises as you go." />
        <Input
          label="Workout name"
          value={title}
          onChangeText={setTitle}
          placeholder="For example, Push day"
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={startEmpty}
        />
        <Button title="Start empty workout" leftIcon="play" haptic={false} onPress={startEmpty} />
      </Card>

      {lastWorkout?.exercises ? (
        <Card style={{ gap: spacing.sm }}>
          <SectionHeader title="Repeat your last workout" />
          <Text variant="body" numberOfLines={3}>
            {lastWorkout.exercises.map((ex) => ex.name).join(' · ')}
          </Text>
          <Text variant="caption" color="textSecondary">
            Weights and reps are filled in from last time.
          </Text>
          <Button title="Repeat last workout" variant="secondary" leftIcon="repeat" haptic={false} onPress={repeatLast} />
        </Card>
      ) : null}

      <RestTimer />

      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        Or open the Coach tab to build a plan and start any day of it here.
      </Text>
    </Screen>
  );
}

// ─── Workout running ──────────────────────────────────────────────────────────

function ActiveWorkout({ header, session, onFinished }: { header: ReactNode; session: LiveSession; onFinished: () => void }) {
  useKeepAwake();
  const notify = useNotify();
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
        title: 'No sets completed',
        message: 'Tick off at least one set to save a workout. Discard it instead?',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep going',
        destructive: true,
      });
      if (discardIt) sessionActions.discard();
      return;
    }
    const ok = await notify.confirm({
      title: 'Finish workout?',
      message: `${doneSets} sets · ${Math.round(volume).toLocaleString()} kg · ${formatDuration(elapsedSeconds(session, Date.now()))}`,
      confirmLabel: 'Finish and save',
      cancelLabel: 'Not yet',
    });
    if (!ok) return;
    try {
      await save.mutateAsync({ input: buildWorkoutPayload(session, Date.now(), toIsoDay(new Date())) });
      sessionActions.discard();
      notify.success('Workout saved');
      onFinished();
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : 'Could not save. Your workout is still here, try again.');
    }
  }

  async function discard() {
    const ok = await notify.confirm({
      title: 'Discard workout?',
      message: 'Everything logged in this session will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (ok) sessionActions.discard();
  }

  return (
    <Screen>
      {header}

      <Card style={{ gap: spacing.md }}>
        <Input label="Workout name" value={session.title} onChangeText={sessionActions.setTitle} autoCapitalize="sentences" returnKeyType="done" />
        <LiveSummary session={session} />
      </Card>

      <LiveRest session={session} />

      {session.exercises.length === 0 ? (
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          Add your first exercise below.
        </Text>
      ) : null}

      {session.exercises.map((exercise, index) => (
        <ExerciseCard key={exercise.id} index={index} exercise={exercise} last={lastByName.get(exercise.name.trim().toLowerCase())} />
      ))}

      <AddExercise names={knownNames} lastByName={lastByName} />

      <View style={{ gap: spacing.sm }}>
        <Button title="Finish workout" leftIcon="checkmark" onPress={finish} loading={save.isPending} />
        <Button title="Discard workout" variant="ghost" onPress={discard} disabled={save.isPending} />
      </View>
    </Screen>
  );
}

/** Elapsed time, pause control and running totals. Owns the one-second clock so the exercise list does not re-render. */
function LiveSummary({ session }: { session: LiveSession }) {
  const now = useNow(true);
  const seconds = elapsedSeconds(session, now);
  const { doneSets, totalSets, volume } = sessionTotals(session);
  const paused = !!session.pausedAt;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flexShrink: 1, gap: spacing.xs }}>
          <Text variant="display" numeric accessibilityLabel={`Elapsed time ${formatDuration(seconds)}`}>
            {formatDuration(seconds)}
          </Text>
          {paused ? <Tag label="Paused" icon="pause" tone="neutral" /> : null}
        </View>
        <IconButton
          icon={paused ? 'play' : 'pause'}
          variant="tonal"
          size="lg"
          accessibilityLabel={paused ? 'Resume workout' : 'Pause workout'}
          onPress={() => sessionActions.togglePause()}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.sm }}>
        <Metric label="Sets" value={`${doneSets}/${totalSets}`} />
        <Metric label="Volume" value={`${Math.round(volume).toLocaleString()} kg`} />
        <Metric label="Burn, estimated" value={`${Math.round((seconds / 60) * 7.5 + doneSets * 4)} kcal`} />
      </View>
    </View>
  );
}

/** Shows the rest countdown when one is running; buzzes and announces once when it ends. */
function LiveRest({ session }: { session: LiveSession }) {
  const now = useNow(true);
  const rest = restRemainingSeconds(session, now);

  // Rest finished: buzz once, tell screen readers, and clear the timer.
  useEffect(() => {
    if (rest === 0) {
      haptics.success();
      AccessibilityInfo.announceForAccessibility('Rest over. Next set when you are ready.');
      sessionActions.skipRest();
    }
  }, [rest]);

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
      title: `Remove ${exercise.name}?`,
      message: 'Its sets in this session will be removed too.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) sessionActions.removeExercise(exercise.id);
  }

  const lastText = last?.weight ? `last ${last.weight} kg × ${last.reps ?? '-'}` : null;

  return (
    <Animated.View {...motion}>
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title" numberOfLines={2} accessibilityRole="header">
              {exercise.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {[exercise.category, `${exercise.restSeconds}s rest`, lastText].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <IconButton icon="swap-horizontal" size="sm" accessibilityLabel={`Swap ${exercise.name}`} onPress={openSwap} />
          <IconButton icon="trash-outline" size="sm" destructive accessibilityLabel={`Remove ${exercise.name}`} onPress={removeExercise} />
        </View>

        {swapOpen ? (
          <Card variant="flat" padding="sm" style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" weight="semiBold">
                Swap with
              </Text>
              <IconButton icon="close" size="sm" accessibilityLabel="Close suggestions" onPress={() => setSwapOpen(false)} />
            </View>
            {substitutes.isPending ? <SkeletonList count={2} avatar={false} /> : null}
            {substitutes.isError ? (
              <ErrorState
                size="inline"
                title="Couldn't get suggestions"
                message="Check your connection and try again."
                onRetry={() => substitutes.mutate({ exerciseName: exercise.name, targetMuscle: exercise.category })}
              />
            ) : null}
            {substitutes.isSuccess && substitutes.data.length === 0 ? (
              <Text variant="body" color="textSecondary">
                No swaps found for this exercise.
              </Text>
            ) : null}
            {(substitutes.data ?? []).map((option) => (
              <ListItem
                key={option.name}
                title={option.name}
                subtitle={`${option.equipment} · ${option.whyItWorks}`}
                accessibilityHint="Replaces this exercise"
                onPress={() => {
                  sessionActions.replaceExercise(exercise.id, option.name);
                  setSwapOpen(false);
                }}
              />
            ))}
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text variant="caption" weight="semiBold" color="textSecondary" style={{ width: spacing.xxl }}>
            SET
          </Text>
          <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1, textAlign: 'center' }}>
            KG
          </Text>
          <Text variant="caption" weight="semiBold" color="textSecondary" style={{ flex: 1, textAlign: 'center' }}>
            REPS
          </Text>
          <View style={{ width: SET_BUTTON }} />
        </View>

        {exercise.sets.map((set, setIndex) => (
          <SetRow key={set.id} exerciseId={exercise.id} index={setIndex} weight={set.weight} reps={set.reps} done={set.done} />
        ))}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs }}>
          <Button title="Add set" variant="secondary" size="sm" leftIcon="add" fullWidth={false} onPress={() => sessionActions.addSet(exercise.id)} />
          {exercise.sets.length > 1 ? (
            <Button
              title="Remove last set"
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
  const fitness = accent('fitness');
  const motion = useListMotion(0);
  // Keep what is being typed as text so "7." or an empty box does not jump while editing.
  const [weightText, setWeightText] = useState(String(weight));
  const [repsText, setRepsText] = useState(String(reps));

  return (
    <Animated.View {...motion} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text variant="label" numeric color="textSecondary" style={{ width: spacing.xxl }}>
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
        accessibilityLabel={`Set ${index + 1} weight in kilograms`}
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
        accessibilityLabel={`Set ${index + 1} reps`}
        style={{ textAlign: 'center' }}
      />
      <PressableScale
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Set ${index + 1} done`}
        accessibilityHint="Starts the rest timer when checked"
        accessibilityActions={[{ name: 'delete', label: 'Remove set' }]}
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
      <SectionHeader title="Add exercise" />
      <Input
        value={text}
        onChangeText={setText}
        placeholder="Search or type a name"
        accessibilityLabel="Exercise name"
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
      {canAddCustom ? <Button title={`Add “${text.trim()}”`} variant="secondary" leftIcon="add" haptic={false} onPress={() => add(text)} /> : null}
    </Card>
  );
}
