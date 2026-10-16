import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup, ChipRow } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useGenerateSplit, useRecentFitness } from '@/features/fitness/hooks';
import { buildExercise, sessionActions, useLiveSession } from '@/features/fitness/session-store';
import { lastPerformanceByExercise } from '@/features/fitness/stats';
import { COACH_EQUIPMENT, COACH_GOALS, COACH_LEVELS, type CoachDay, type CoachProgram } from '@/features/fitness/types';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, useTheme } from '@/theme';

const PROGRAM_KEY = 'aura.fitness.program';
const DAY_OPTIONS = [2, 3, 4, 5, 6].map((value) => ({ value: String(value), label: String(value) }));

export function CoachSection({ header, onStarted }: { header: ReactNode; onStarted: () => void }) {
  const { accent, colors } = useTheme();
  const notify = useNotify();
  const recent = useRecentFitness();
  const { session } = useLiveSession();
  const generate = useGenerateSplit();

  const [goal, setGoal] = useState(COACH_GOALS[0]);
  const [equipment, setEquipment] = useState(COACH_EQUIPMENT[0]);
  const [level, setLevel] = useState(COACH_LEVELS[1]);
  const [days, setDays] = useState(4);
  const [program, setProgram] = useState<CoachProgram | null>(null);
  const [dayIndex, setDayIndex] = useState(0);

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
    try {
      const split = await generate.mutateAsync({ goal, equipment, daysPerWeek: days, experienceLevel: level });
      setProgram(split);
      setDayIndex(0);
      AsyncStorage.setItem(PROGRAM_KEY, JSON.stringify(split)).catch(() => {});
      notify.success('Your plan is ready');
    } catch (e) {
      notify.error(e instanceof ApiError || e instanceof Error ? e.message : 'Could not build a plan.');
    }
  }

  async function startDay(day: CoachDay) {
    const begin = () => {
      sessionActions.start(
        day.name,
        day.exercises.map((exercise) => buildExercise(exercise, lastByName.get(exercise.name.trim().toLowerCase()))),
      );
      haptics.success();
      onStarted();
    };
    if (session) {
      const ok = await notify.confirm({
        title: 'Replace current workout?',
        message: `"${session.title}" is still in progress. Starting this day will discard it.`,
        confirmLabel: 'Replace',
        cancelLabel: 'Keep current',
        destructive: true,
      });
      if (ok) begin();
    } else {
      begin();
    }
  }

  function clearPlan() {
    const previous = program;
    if (!previous) return;
    setProgram(null);
    AsyncStorage.removeItem(PROGRAM_KEY).catch(() => {});
    notify.toast({
      message: 'Saved plan cleared',
      action: {
        label: 'Undo',
        onPress: () => {
          setProgram(previous);
          AsyncStorage.setItem(PROGRAM_KEY, JSON.stringify(previous)).catch(() => {});
        },
      },
    });
  }

  const day = program?.days[dayIndex] ?? program?.days[0];

  return (
    <Screen>
      {header}

      <Card style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="sparkles" size={20} color={accent('ai').text} />
          <Text variant="title" accessibilityRole="header">
            Build my plan
          </Text>
        </View>

        <Field label="Goal">
          <ChipGroup>
            {COACH_GOALS.map((value) => (
              <Chip key={value} label={value} selected={goal === value} accent="fitness" onPress={() => setGoal(value)} />
            ))}
          </ChipGroup>
        </Field>
        <Field label="Equipment">
          <ChipGroup>
            {COACH_EQUIPMENT.map((value) => (
              <Chip key={value} label={value} selected={equipment === value} accent="fitness" onPress={() => setEquipment(value)} />
            ))}
          </ChipGroup>
        </Field>
        <Field label="Experience">
          <ChipGroup>
            {COACH_LEVELS.map((value) => (
              <Chip key={value} label={value} selected={level === value} accent="fitness" onPress={() => setLevel(value)} />
            ))}
          </ChipGroup>
        </Field>
        <Field label="Days per week">
          <Segmented options={DAY_OPTIONS} value={String(days)} onChange={(value) => setDays(Number(value))} accessibilityLabel="Days per week" />
        </Field>

        <Button title={program ? 'Build a new plan' : 'Build my plan'} leftIcon="sparkles" onPress={build} loading={generate.isPending} />
      </Card>

      {generate.isPending ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            Designing your week. This can take up to half a minute.
          </Text>
          <SkeletonCard lines={3} />
        </View>
      ) : null}

      {program && day ? (
        <>
          <Card variant="tinted" accent="fitness" style={{ gap: spacing.sm }}>
            <Text variant="title" accessibilityRole="header">
              {program.programName}
            </Text>
            <Text variant="caption" color="textSecondary">
              {[program.frequency, program.difficulty, program.goal].filter(Boolean).join(' · ')}
            </Text>
            {program.weeklyOverview ? <Text variant="body">{program.weeklyOverview}</Text> : null}
            {program.progressiveOverloadTip ? (
              <Text variant="caption" color="textSecondary">
                Progression: {program.progressiveOverloadTip}
              </Text>
            ) : null}
            {program.recoveryStrategy ? (
              <Text variant="caption" color="textSecondary">
                Recovery: {program.recoveryStrategy}
              </Text>
            ) : null}
          </Card>

          <ChipRow>
            {program.days.map((item, index) => (
              <Chip
                key={item.dayNumber}
                label={item.isRestDay ? `Day ${item.dayNumber} · rest` : `Day ${item.dayNumber}`}
                selected={index === dayIndex}
                accent="fitness"
                onPress={() => setDayIndex(index)}
              />
            ))}
          </ChipRow>

          <Card style={{ gap: spacing.md }}>
            <SectionHeader
              title={day.name}
              subtitle={`${day.focus}${day.targetDurationMinutes ? ` · about ${day.targetDurationMinutes} min` : ''}`}
            />

            {day.isRestDay || day.exercises.length === 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
                <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                  Rest and recovery day. Walk, stretch and sleep well.
                </Text>
              </View>
            ) : (
              <>
                {day.exercises.map((exercise) => (
                  <View key={exercise.name} accessible style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                      <Text variant="body" weight="semiBold" style={{ flex: 1 }}>
                        {exercise.name}
                      </Text>
                      <Text variant="body" numeric color="textSecondary">
                        {exercise.sets ?? 3} × {exercise.reps ?? 10}
                      </Text>
                    </View>
                    <Text variant="caption" color="textSecondary">
                      {[exercise.category, exercise.restSeconds ? `${exercise.restSeconds}s rest` : null, exercise.rpe ? `RPE ${exercise.rpe}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {exercise.notes ? (
                      <Text variant="caption" color="textMuted">
                        {exercise.notes}
                      </Text>
                    ) : null}
                  </View>
                ))}
                <Button title="Start this workout" leftIcon="play" haptic={false} onPress={() => startDay(day)} />
              </>
            )}
          </Card>
        </>
      ) : null}

      {program ? <Button title="Clear saved plan" variant="ghost" size="sm" fullWidth={false} onPress={clearPlan} style={{ alignSelf: 'center' }} /> : null}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      {children}
    </View>
  );
}
