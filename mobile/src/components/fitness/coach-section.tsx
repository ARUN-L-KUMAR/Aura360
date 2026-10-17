import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup, ChipRow } from '@/components/ui/chip';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Segmented } from '@/components/ui/segmented';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useGenerateSplit, useRecentFitness } from '@/features/fitness/hooks';
import { buildExercise, sessionActions, useLiveSession } from '@/features/fitness/session-store';
import { lastPerformanceByExercise } from '@/features/fitness/stats';
import {
  COACH_EQUIPMENT,
  COACH_GOALS,
  COACH_LEVELS,
  coachEquipmentLabel,
  coachGoalLabel,
  coachLevelLabel,
  type CoachDay,
  type CoachProgram,
} from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, spacing, useTheme } from '@/theme';

const PROGRAM_KEY = 'aura.fitness.program';
const DAY_OPTIONS = [2, 3, 4, 5, 6].map((value) => ({ value: String(value), label: String(value) }));

export function CoachSection({ header, onStarted }: { header: ReactNode; onStarted: () => void }) {
  const { accent, colors } = useTheme();
  const notify = useNotify();
  const { t } = useTranslation('fitness');
  const errorMessage = useErrorMessage();
  const recent = useRecentFitness();
  const { session } = useLiveSession();
  const generate = useGenerateSplit();
  const builderMotion = useBlockMotion(0);
  const planMotion = useListMotion(0);

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
      notify.success(t('coach.ready'));
    } catch (e) {
      notify.error(errorMessage(e, t('coach.buildFailed')));
    }
  }

  async function startDay(day: CoachDay) {
    const begin = () => {
      sessionActions.start(
        day.name,
        day.exercises.map((exercise) => buildExercise(exercise, lastByName.get(exercise.name.trim().toLowerCase()))),
      );
      haptics.success();
      analytics.track('workout_started', { source: 'coach' });
      onStarted();
    };
    if (session) {
      const ok = await notify.confirm({
        title: t('coach.replaceTitle'),
        message: t('coach.replaceMessage', { title: session.title }),
        confirmLabel: t('coach.replace'),
        cancelLabel: t('coach.keepCurrent'),
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
      message: t('coach.cleared'),
      action: {
        label: t('actions.undo'),
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

      <Animated.View {...builderMotion}>
        <Card style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="sparkles" size={20} color={accent('ai').text} />
            <Text variant="title" accessibilityRole="header">
              {t('coach.title')}
            </Text>
          </View>

          <Field label={t('coach.goal')}>
            <ChipGroup>
              {COACH_GOALS.map((value) => (
                <Chip key={value} label={coachGoalLabel(value)} selected={goal === value} accent="fitness" onPress={() => setGoal(value)} />
              ))}
            </ChipGroup>
          </Field>
          <Field label={t('coach.equipmentLabel')}>
            <ChipGroup>
              {COACH_EQUIPMENT.map((value) => (
                <Chip key={value} label={coachEquipmentLabel(value)} selected={equipment === value} accent="fitness" onPress={() => setEquipment(value)} />
              ))}
            </ChipGroup>
          </Field>
          <Field label={t('coach.experience')}>
            <ChipGroup>
              {COACH_LEVELS.map((value) => (
                <Chip key={value} label={coachLevelLabel(value)} selected={level === value} accent="fitness" onPress={() => setLevel(value)} />
              ))}
            </ChipGroup>
          </Field>
          <Field label={t('coach.daysPerWeek')}>
            <Segmented options={DAY_OPTIONS} value={String(days)} onChange={(value) => setDays(Number(value))} accessibilityLabel={t('coach.daysPerWeek')} />
          </Field>

          <Button title={program ? t('coach.buildNew') : t('coach.title')} leftIcon="sparkles" onPress={build} loading={generate.isPending} />
        </Card>
      </Animated.View>

      {generate.isPending ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            {t('coach.designing')}
          </Text>
          <SkeletonCard lines={3} />
        </View>
      ) : null}

      {program ? (
        <Animated.View {...planMotion} style={{ gap: layout.sectionGap }}>
          {day ? (
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
                    {t('coach.progression', { tip: program.progressiveOverloadTip })}
                  </Text>
                ) : null}
                {program.recoveryStrategy ? (
                  <Text variant="caption" color="textSecondary">
                    {t('coach.recovery', { tip: program.recoveryStrategy })}
                  </Text>
                ) : null}
              </Card>

              <ChipRow>
                {program.days.map((item, index) => (
                  <Chip
                    key={item.dayNumber}
                    label={item.isRestDay ? t('coach.dayRest', { n: item.dayNumber }) : t('coach.day', { n: item.dayNumber })}
                    selected={index === dayIndex}
                    accent="fitness"
                    onPress={() => setDayIndex(index)}
                  />
                ))}
              </ChipRow>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader
                  title={day.name}
                  subtitle={day.targetDurationMinutes ? t('coach.focusAndDuration', { focus: day.focus, minutes: day.targetDurationMinutes }) : day.focus}
                />

                {day.isRestDay || day.exercises.length === 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
                    <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                      {t('coach.restDay')}
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
                          {[exercise.category, exercise.restSeconds ? t('units.secondsRest', { value: exercise.restSeconds }) : null, exercise.rpe ? t('coach.rpe', { value: exercise.rpe }) : null]
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
                    <Button title={t('coach.startWorkout')} leftIcon="play" haptic={false} onPress={() => startDay(day)} />
                  </>
                )}
              </Card>
            </>
          ) : null}
          <Button title={t('coach.clear')} variant="ghost" size="sm" fullWidth={false} onPress={clearPlan} style={{ alignSelf: 'center' }} />
        </Animated.View>
      ) : null}
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
