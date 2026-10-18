import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Heading, IconTile, RingCard } from '@/components/fitness/section-kit';
import { StartCta } from '@/components/fitness/start-cta';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup, ChipRow, Tag } from '@/components/ui/chip';
import { useBlockMotion, useListMotion } from '@/components/ui/motion';
import { PremiumHero } from '@/components/ui/premium-hero';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
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
  type CoachExercise,
  type CoachProgram,
} from '@/features/fitness/types';
import { useErrorMessage } from '@/features/fitness/use-error-message';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, radius, spacing, useTheme } from '@/theme';

const PROGRAM_KEY = 'aura.fitness.program';
const DAY_OPTIONS = [2, 3, 4, 5, 6].map((value) => ({ value: String(value), label: String(value) }));

export function CoachSection({ header, onStarted }: { header: ReactNode; onStarted: () => void }) {
  const { colors } = useTheme();
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
        <RingCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconTile icon="sparkles" />
            <View style={{ flex: 1 }}>
              <Heading overline={t('coach.overline')} title={t('coach.title')} subtitle={t('coach.subtitle')} />
            </View>
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
        </RingCard>
      </Animated.View>

      {generate.isPending ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            {t('coach.designing')}
          </Text>
          <PlanSkeleton label={t('coach.designing')} />
        </View>
      ) : null}

      {program ? (
        <Animated.View {...planMotion} style={{ gap: layout.sectionGap }}>
          {day ? (
            <>
              <PremiumHero
                chip={{ icon: 'sparkles', label: t('coach.planEyebrow') }}
                title={program.programName}
                subtitle={[program.frequency, program.difficulty, program.goal].filter(Boolean).join(' · ') || undefined}
              />

              {program.weeklyOverview || program.progressiveOverloadTip || program.recoveryStrategy ? (
                <RingCard style={{ gap: spacing.md }}>
                  {program.weeklyOverview ? <Text variant="body">{program.weeklyOverview}</Text> : null}
                  {program.progressiveOverloadTip ? <Tip icon="trending-up-outline" text={t('coach.progression', { tip: program.progressiveOverloadTip })} /> : null}
                  {program.recoveryStrategy ? <Tip icon="bed-outline" text={t('coach.recovery', { tip: program.recoveryStrategy })} /> : null}
                </RingCard>
              ) : null}

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

              <View key={dayIndex} style={{ gap: spacing.md }}>
                <Heading
                  overline={t('coach.dayOverline', { n: day.dayNumber })}
                  title={day.name}
                  subtitle={day.targetDurationMinutes ? t('coach.focusAndDuration', { focus: day.focus, minutes: day.targetDurationMinutes }) : day.focus}
                />

                {day.isRestDay || day.exercises.length === 0 ? (
                  <Card variant="flat" rounded="xl" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Ionicons name="moon-outline" size={spacing.xl} color={colors.textSecondary} />
                    <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
                      {t('coach.restDay')}
                    </Text>
                  </Card>
                ) : (
                  <>
                    {day.exercises.map((exercise, index) => (
                      <StepCard key={`${index}-${exercise.name}`} step={index + 1} total={day.exercises.length} exercise={exercise} />
                    ))}
                    <StartCta
                      title={t('coach.startWorkout')}
                      subtitle={t('coach.startSubtitle', { count: day.exercises.length })}
                      icon="play"
                      haptic={false}
                      onPress={() => startDay(day)}
                    />
                  </>
                )}
              </View>
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
      <Text variant="overline" color="textMuted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** A tip with a small accent icon. */
function Tip({ icon, text }: { icon: 'trending-up-outline' | 'bed-outline'; text: string }) {
  const { accent } = useTheme();
  const fitness = accent('fitness');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
      <View style={{ width: spacing.xl + spacing.sm, height: spacing.xl + spacing.sm, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: fitness.soft }}>
        <Ionicons name={icon} size={spacing.lg} color={fitness.text} />
      </View>
      <Text variant="caption" color="textSecondary" style={{ flex: 1, paddingTop: spacing.xs }}>
        {text}
      </Text>
    </View>
  );
}

/** One exercise of a training day as a numbered step: what to lift, how many, how long to rest. */
function StepCard({ step, total, exercise }: { step: number; total: number; exercise: CoachExercise }) {
  const { t } = useTranslation('fitness');
  const { accent } = useTheme();
  const fitness = accent('fitness');
  const motion = useListMotion(step - 1);
  const sets = exercise.sets ?? 3;
  const reps = exercise.reps ?? 10;
  const rest = exercise.restSeconds ? t('units.secondsRest', { value: exercise.restSeconds }) : null;
  const rpe = exercise.rpe ? t('coach.rpe', { value: exercise.rpe }) : null;
  const spoken = [t('coach.stepOf', { step, total }), exercise.name, t('coach.setsByReps', { sets, reps }), exercise.category, rest, rpe, exercise.notes].filter(Boolean).join(', ');

  return (
    <Animated.View {...motion}>
      <Card rounded="xl" accessible accessibilityLabel={spoken} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ width: spacing.xxl + spacing.sm, height: spacing.xxl + spacing.sm, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: fitness.soft }}>
          <Text variant="label" weight="bold" numeric style={{ color: fitness.text }}>
            {step}
          </Text>
        </View>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="title" weight="bold" numberOfLines={3}>
            {exercise.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <Tag label={t('coach.setsByReps', { sets, reps })} icon="repeat" size="md" accent="fitness" />
            {rest ? <Tag label={rest} icon="timer-outline" size="md" /> : null}
            {rpe ? <Tag label={rpe} icon="speedometer-outline" size="md" /> : null}
            {exercise.category ? <Tag label={exercise.category} size="md" /> : null}
          </View>
          {exercise.notes ? (
            <Text variant="caption" color="textMuted">
              {exercise.notes}
            </Text>
          ) : null}
        </View>
      </Card>
    </Animated.View>
  );
}

/** Placeholder with the shape of a plan: a coloured header block and three exercise steps. */
function PlanSkeleton({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={{ gap: spacing.md }}>
      <Skeleton shape="box" height={spacing.xxxl + spacing.xl} rounded="lg" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} shape="box" height={spacing.xxxl + spacing.md} rounded="lg" />
      ))}
    </SkeletonGroup>
  );
}
