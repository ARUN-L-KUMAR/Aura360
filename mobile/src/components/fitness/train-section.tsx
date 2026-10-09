import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';

import { LiveRestTimer } from '@/components/fitness/live-rest-timer';
import { RestTimer } from '@/components/fitness/rest-timer';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/fitness/section-label';
import { Screen } from '@/components/ui/screen';
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
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export function TrainSection({ header, onFinished }: { header: ReactNode; onFinished: () => void }) {
  const { hydrated, session } = useLiveSession();

  if (!hydrated) {
    return (
      <Screen>
        {header}
        <ActivityIndicator />
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

  function repeatLast() {
    if (!lastWorkout?.exercises) return;
    sessionActions.start(
      title.trim() || 'Workout',
      lastWorkout.exercises.map((ex) => buildExercise({ name: ex.name, sets: ex.sets, reps: ex.reps }, ex)),
    );
  }

  return (
    <Screen>
      {header}

      <GlassCard style={{ gap: spacing.md }}>
        <Text variant="heading">Start a workout</Text>
        <Input label="Name" value={title} onChangeText={setTitle} placeholder="e.g. Push day" />
        <Button title="Start empty workout" onPress={() => sessionActions.start(title.trim() || 'Workout')} />
      </GlassCard>

      {lastWorkout?.exercises ? (
        <GlassCard style={{ gap: spacing.sm }}>
          <SectionLabel>Repeat your last workout</SectionLabel>
          <Text numberOfLines={3}>{lastWorkout.exercises.map((ex) => ex.name).join(' · ')}</Text>
          <Text variant="caption" muted>
            Weights and reps are filled in from last time.
          </Text>
          <Button title="Repeat last workout" variant="secondary" onPress={repeatLast} />
        </GlassCard>
      ) : null}

      <RestTimer />

      <Text variant="caption" muted style={{ textAlign: 'center' }}>
        Or open the Coach tab to build a plan and start any day of it here.
      </Text>
    </Screen>
  );
}

// ─── Workout running ──────────────────────────────────────────────────────────

function ActiveWorkout({ header, session, onFinished }: { header: ReactNode; session: LiveSession; onFinished: () => void }) {
  useKeepAwake();
  const { colors } = useTheme();
  const save = useSaveFitness();
  const recent = useRecentFitness();
  const [error, setError] = useState<string | null>(null);

  const now = useNow(true);
  const seconds = elapsedSeconds(session, now);
  const rest = restRemainingSeconds(session, now);
  const { doneSets, totalSets, volume } = sessionTotals(session);
  const lastByName = useMemo(() => lastPerformanceByExercise(recent.data ?? []), [recent.data]);
  const knownNames = useMemo(
    () => [...new Set([...(recent.data ?? []).flatMap((entry) => entry.exercises?.map((ex) => ex.name) ?? []), ...COMMON_EXERCISES])],
    [recent.data],
  );

  // Rest finished: buzz once and clear the timer.
  useEffect(() => {
    if (rest === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      sessionActions.skipRest();
    }
  }, [rest]);

  function finish() {
    if (doneSets === 0) {
      Alert.alert('No sets completed', 'Tick off at least one set to save a workout. Discard it instead?', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => sessionActions.discard() },
      ]);
      return;
    }
    Alert.alert('Finish workout?', `${doneSets} sets · ${Math.round(volume).toLocaleString()} kg · ${formatDuration(seconds)}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Finish & save',
        onPress: async () => {
          setError(null);
          try {
            await save.mutateAsync({ input: buildWorkoutPayload(session, Date.now(), toIsoDay(new Date())) });
            sessionActions.discard();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onFinished();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not save. Your workout is still here, try again.');
          }
        },
      },
    ]);
  }

  function discard() {
    Alert.alert('Discard workout?', 'Everything logged in this session will be lost.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => sessionActions.discard() },
    ]);
  }

  return (
    <Screen>
      {header}

      <GlassCard style={{ gap: spacing.md }}>
        <TextInput
          value={session.title}
          onChangeText={sessionActions.setTitle}
          accessibilityLabel="Workout name"
          style={{ color: colors.text, fontSize: 18, fontWeight: '600', padding: 0 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
            {formatDuration(seconds)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={session.pausedAt ? 'Resume workout' : 'Pause workout'}
            onPress={() => sessionActions.togglePause()}
            style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.cardMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={session.pausedAt ? 'play' : 'pause'} size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <Metric label="Sets" value={`${doneSets}/${totalSets}`} />
          <Metric label="Volume" value={`${Math.round(volume).toLocaleString()} kg`} />
          <Metric label="Burn ≈" value={`${Math.round((seconds / 60) * 7.5 + doneSets * 4)} kcal`} />
        </View>
      </GlassCard>

      {rest !== null && rest > 0 ? <LiveRestTimer remaining={rest} total={session.restTotalSec} /> : null}

      {session.exercises.length === 0 ? (
        <Text muted style={{ textAlign: 'center' }}>
          Add your first exercise below.
        </Text>
      ) : null}

      {session.exercises.map((exercise) => (
        <ExerciseCard key={exercise.id} exercise={exercise} last={lastByName.get(exercise.name.trim().toLowerCase())} />
      ))}

      <AddExercise names={knownNames} lastByName={lastByName} />

      {error ? <Text color="danger">{error}</Text> : null}

      <Button title="Finish workout" onPress={finish} loading={save.isPending} />
      <Button title="Discard workout" variant="ghost" onPress={discard} />
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="label" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function ExerciseCard({ exercise, last }: { exercise: LiveExercise; last?: Exercise }) {
  const { colors } = useTheme();
  const substitutes = useSubstitutes();
  const [swapOpen, setSwapOpen] = useState(false);

  function openMenu() {
    Alert.alert(exercise.name, undefined, [
      {
        text: 'Swap exercise',
        onPress: () => {
          setSwapOpen(true);
          substitutes.mutate({ exerciseName: exercise.name, targetMuscle: exercise.category });
        },
      },
      { text: 'Remove exercise', style: 'destructive', onPress: () => sessionActions.removeExercise(exercise.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <GlassCard style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={2}>
            {exercise.name}
          </Text>
          <Text variant="caption" muted>
            {exercise.category} · {exercise.restSeconds}s rest
            {last?.weight ? ` · last ${last.weight} kg × ${last.reps ?? '-'}` : ''}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Options for ${exercise.name}`} onPress={openMenu} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {swapOpen ? (
        <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.cardMuted }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="label">Swap with…</Text>
            <Pressable onPress={() => setSwapOpen(false)} hitSlop={8}>
              <SectionLabel>Close</SectionLabel>
            </Pressable>
          </View>
          {substitutes.isPending ? <ActivityIndicator /> : null}
          {substitutes.isError ? <Text color="danger">Could not get suggestions.</Text> : null}
          {(substitutes.data ?? []).map((option) => (
            <Pressable
              key={option.name}
              accessibilityRole="button"
              onPress={() => {
                sessionActions.replaceExercise(exercise.id, option.name);
                setSwapOpen(false);
              }}
              style={({ pressed }) => ({ paddingVertical: spacing.xs, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontWeight: '600' }}>{option.name}</Text>
              <Text variant="caption" muted>
                {option.equipment} · {option.whyItWorks}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs }}>
        <Text variant="caption" muted style={{ width: 28 }}>
          SET
        </Text>
        <Text variant="caption" muted style={{ flex: 1, textAlign: 'center' }}>
          KG
        </Text>
        <Text variant="caption" muted style={{ flex: 1, textAlign: 'center' }}>
          REPS
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {exercise.sets.map((set, index) => (
        <SetRow key={set.id} exerciseId={exercise.id} index={index} weight={set.weight} reps={set.reps} done={set.done} />
      ))}

      <Pressable accessibilityRole="button" onPress={() => sessionActions.addSet(exercise.id)} hitSlop={8} style={{ paddingVertical: spacing.xs }}>
        <Text variant="label" style={{ fontWeight: '600', color: moduleColors.fitness }}>
          + Add set
        </Text>
      </Pressable>
    </GlassCard>
  );
}

function SetRow({ exerciseId, index, weight, reps, done }: { exerciseId: string; index: number; weight: number; reps: number; done: boolean }) {
  const { colors } = useTheme();
  // Keep what is being typed as text so "7." or an empty box does not jump while editing.
  const [weightText, setWeightText] = useState(String(weight));
  const [repsText, setRepsText] = useState(String(reps));

  const inputStyle = {
    flex: 1,
    minHeight: 44,
    textAlign: 'center' as const,
    borderRadius: radius.md,
    backgroundColor: done ? `${moduleColors.fitness}22` : colors.cardMuted,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Text variant="label" muted style={{ width: 28 }}>
        {index + 1}
      </Text>
      <TextInput
        value={weightText}
        onChangeText={(text) => {
          setWeightText(text);
          const value = Number.parseFloat(text.replace(',', '.'));
          if (Number.isFinite(value) && value >= 0) sessionActions.updateSet(exerciseId, index, { weight: value });
        }}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`Set ${index + 1} weight in kilograms`}
        style={inputStyle}
      />
      <TextInput
        value={repsText}
        onChangeText={(text) => {
          setRepsText(text);
          const value = Number.parseInt(text, 10);
          if (Number.isFinite(value) && value >= 0) sessionActions.updateSet(exerciseId, index, { reps: value });
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={`Set ${index + 1} reps`}
        style={inputStyle}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Set ${index + 1} done`}
        onPress={() => {
          if (sessionActions.toggleSet(exerciseId, index)) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        onLongPress={() => sessionActions.removeSet(exerciseId, index)}
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? moduleColors.fitness : colors.cardMuted,
        }}>
        <Ionicons name="checkmark" size={22} color={done ? '#ffffff' : colors.textMuted} />
      </Pressable>
    </View>
  );
}

function AddExercise({ names, lastByName }: { names: string[]; lastByName: Map<string, Exercise> }) {
  const [text, setText] = useState('');

  const suggestions = useMemo(() => {
    const query = text.trim().toLowerCase();
    return names.filter((name) => (query ? name.toLowerCase().includes(query) : true)).slice(0, 8);
  }, [names, text]);

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    sessionActions.addExercise(buildExercise({ name: trimmed }, lastByName.get(trimmed.toLowerCase())));
    setText('');
  }

  return (
    <GlassCard style={{ gap: spacing.md }}>
      <SectionLabel>Add exercise</SectionLabel>
      <Input value={text} onChangeText={setText} placeholder="Search or type a name" returnKeyType="done" onSubmitEditing={() => add(text)} />
      <ChipGroup>
        {suggestions.map((name) => (
          <Chip key={name} label={name} onPress={() => add(name)} />
        ))}
      </ChipGroup>
      {text.trim() && !names.some((name) => name.toLowerCase() === text.trim().toLowerCase()) ? <Button title={`Add “${text.trim()}”`} variant="secondary" onPress={() => add(text)} /> : null}
    </GlassCard>
  );
}
