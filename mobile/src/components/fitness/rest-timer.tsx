import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

const PRESETS = [30, 60, 90, 120];

export function RestTimer() {
  const { colors } = useTheme();
  const fitnessColor = modules.fitness.color;

  const [totalSeconds, setTotalSeconds] = useState(60);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining]);

  const selectPreset = (secs: number) => {
    setIsRunning(false);
    setTotalSeconds(secs);
    setSecondsRemaining(secs);
  };

  const addTime = (secs: number) => {
    setTotalSeconds((prev) => prev + secs);
    setSecondsRemaining((prev) => prev + secs);
  };

  const toggleRun = () => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(totalSeconds);
    }
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setSecondsRemaining(totalSeconds);
  };

  const percent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const isComplete = secondsRemaining === 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <GlassCard glowColor={isComplete ? colors.success : fitnessColor} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dotRow}>
          <Ionicons name="timer-outline" size={16} color={fitnessColor} />
          <Text variant="caption" muted style={styles.sectionLabel}>
            REST INTERVAL TIMER
          </Text>
        </View>
        <Text variant="caption" style={{ fontWeight: '600', color: isComplete ? colors.success : colors.text }}>
          {isComplete ? 'Rest Complete! 🔥' : isRunning ? 'Resting…' : 'Ready'}
        </Text>
      </View>

      {/* Main Countdown Display */}
      <View style={styles.timerDisplay}>
        <Text variant="title" style={styles.timeText} color={isComplete ? 'success' : 'text'}>
          {formatTime(secondsRemaining)}
        </Text>

        <View style={styles.controlsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRunning ? 'Pause timer' : 'Start timer'}
            onPress={toggleRun}
            hitSlop={8}
            style={({ pressed }) => [
              styles.playBtn,
              {
                backgroundColor: isComplete ? colors.success : fitnessColor,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Ionicons name={isRunning ? 'pause' : 'play'} size={20} color="#ffffff" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset timer"
            onPress={reset}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Ionicons name="refresh" size={17} color={colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add 15 seconds"
            onPress={() => addTime(15)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text variant="caption" style={{ fontWeight: '700' }}>
              +15s
            </Text>
          </Pressable>
        </View>
      </View>

      <ProgressBar percent={percent} color={isComplete ? colors.success : fitnessColor} height={6} />

      {/* Presets */}
      <View style={styles.presetsRow}>
        {PRESETS.map((p) => {
          const isSelected = totalSeconds === p;
          return (
            <Pressable
              key={p}
              accessibilityRole="button"
              onPress={() => selectPreset(p)}
              style={({ pressed }) => [
                styles.presetPill,
                {
                  backgroundColor: isSelected ? `${fitnessColor}22` : colors.accent,
                  borderColor: isSelected ? fitnessColor : 'transparent',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text
                variant="caption"
                style={{
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? fitnessColor : colors.textMuted,
                }}>
                {p}s
              </Text>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  presetPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
