import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Chip, ChipGroup, ChipRow } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useGenerateSplit, useRecentFitness } from '@/features/fitness/hooks';
import { buildExercise, sessionActions, useLiveSession } from '@/features/fitness/session-store';
import { lastPerformanceByExercise } from '@/features/fitness/stats';
import { COACH_EQUIPMENT, COACH_GOALS, COACH_LEVELS, type CoachDay, type CoachProgram } from '@/features/fitness/types';
import { ApiError } from '@/lib/api';
import { moduleColors, spacing, useTheme } from '@/theme';

const PROGRAM_KEY = 'aura.fitness.program';

export function CoachSection({ header, onStarted }: { header: ReactNode; onStarted: () => void }) {
  const { colors } = useTheme();
  const recent = useRecentFitness();
  const { session } = useLiveSession();
  const generate = useGenerateSplit();

  const [goal, setGoal] = useState(COACH_GOALS[0]);
  const [equipment, setEquipment] = useState(COACH_EQUIPMENT[0]);
  const [level, setLevel] = useState(COACH_LEVELS[1]);
  const [days, setDays] = useState(4);
  const [program, setProgram] = useState<CoachProgram | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const lastByName = useMemo(() => lastPerformanceByExercise(recent.data ?? []), [recent.data]);

  // The last plan stays on the phone so it is still there next time.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PROGRAM_KEY)
      .then((raw) => {
        if (!cancelled && raw) setProgram(JSON.parse(raw) as CoachProgram);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function build() {
    setError(null);
    try {
      const split = await generate.mutateAsync({ goal, equipment, daysPerWeek: days, experienceLevel: level });
      setProgram(split);
      setDayIndex(0);
      AsyncStorage.setItem(PROGRAM_KEY, JSON.stringify(split)).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Could not build a plan.');
    }
  }

  function startDay(day: CoachDay) {
    const begin = () => {
      sessionActions.start(
        day.name,
        day.exercises.map((exercise) => buildExercise(exercise, lastByName.get(exercise.name.trim().toLowerCase()))),
      );
      onStarted();
    };
    if (session) {
      Alert.alert('Replace current workout?', `"${session.title}" is still in progress. Starting this day will discard it.`, [
        { text: 'Keep current', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: begin },
      ]);
    } else {
      begin();
    }
  }

  const day = program?.days[dayIndex] ?? program?.days[0];

  return (
    <Screen>
      {header}

      <GlassCard style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="sparkles" size={18} color={moduleColors.ai} />
          <Text variant="heading">Build my plan</Text>
        </View>

        <Field label="Goal">
          <ChipGroup>
            {COACH_GOALS.map((value) => (
              <Chip key={value} label={value} selected={goal === value} color={moduleColors.fitness} onPress={() => setGoal(value)} />
            ))}
          </ChipGroup>
        </Field>
        <Field label="Equipment">
          <ChipGroup>
            {COACH_EQUIPMENT.map((value) => (
              <Chip key={value} label={value} selected={equipment === value} color={moduleColors.fitness} onPress={() => setEquipment(value)} />
            ))}
          </ChipGroup>
        </Field>
        <Field label="Experience">
          <ChipGroup>
            {COACH_LEVELS.map((value) => (
              <Chip key={value} label={value} selected={level === value} color={moduleColors.fitness} onPress={() => setLevel(value)} />
            ))}
          </ChipGroup>
        </Field>
        <Field label="Days per week">
          <ChipGroup>
            {[2, 3, 4, 5, 6].map((value) => (
              <Chip key={value} label={String(value)} selected={days === value} color={moduleColors.fitness} onPress={() => setDays(value)} />
            ))}
          </ChipGroup>
        </Field>

        {error ? <Text color="danger">{error}</Text> : null}
        {generate.isPending ? (
          <Text variant="caption" muted>
            Designing your week. This can take up to half a minute…
          </Text>
        ) : null}
        <Button title={program ? 'Build a new plan' : 'Build my plan'} onPress={build} loading={generate.isPending} />
      </GlassCard>

      {program && day ? (
        <>
          <GlassCard style={{ gap: spacing.sm }}>
            <Text variant="heading">{program.programName}</Text>
            <Text variant="caption" muted>
              {[program.frequency, program.difficulty, program.goal].filter(Boolean).join(' · ')}
            </Text>
            {program.weeklyOverview ? <Text muted>{program.weeklyOverview}</Text> : null}
            {program.progressiveOverloadTip ? (
              <Text variant="caption" color={colors.textMuted}>
                Progression: {program.progressiveOverloadTip}
              </Text>
            ) : null}
            {program.recoveryStrategy ? (
              <Text variant="caption" color={colors.textMuted}>
                Recovery: {program.recoveryStrategy}
              </Text>
            ) : null}
          </GlassCard>

          <ChipRow>
            {program.days.map((item, index) => (
              <Chip
                key={item.dayNumber}
                label={item.isRestDay ? `Day ${item.dayNumber} · rest` : `Day ${item.dayNumber}`}
                selected={index === dayIndex}
                color={moduleColors.fitness}
                onPress={() => setDayIndex(index)}
              />
            ))}
          </ChipRow>

          <GlassCard style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="heading">{day.name}</Text>
              <Text variant="caption" muted>
                {day.focus}
                {day.targetDurationMinutes ? ` · ~${day.targetDurationMinutes} min` : ''}
              </Text>
            </View>

            {day.isRestDay || day.exercises.length === 0 ? (
              <Text muted>Rest and recovery day. Walk, stretch and sleep well.</Text>
            ) : (
              <>
                {day.exercises.map((exercise) => (
                  <View key={exercise.name} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                      <Text style={{ flex: 1, fontWeight: '600' }}>{exercise.name}</Text>
                      <Text muted>
                        {exercise.sets ?? 3} × {exercise.reps ?? 10}
                      </Text>
                    </View>
                    <Text variant="caption" muted>
                      {[exercise.category, exercise.restSeconds ? `${exercise.restSeconds}s rest` : null, exercise.rpe ? `RPE ${exercise.rpe}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {exercise.notes ? (
                      <Text variant="caption" color={colors.textMuted}>
                        {exercise.notes}
                      </Text>
                    ) : null}
                  </View>
                ))}
                <Button title="Start this workout" onPress={() => startDay(day)} />
              </>
            )}
          </GlassCard>
        </>
      ) : null}

      {program ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setProgram(null);
            AsyncStorage.removeItem(PROGRAM_KEY).catch(() => {});
          }}
          hitSlop={8}
          style={{ alignSelf: 'center' }}>
          <Text variant="caption" muted>
            Clear saved plan
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" muted>
        {label}
      </Text>
      {children}
    </View>
  );
}
