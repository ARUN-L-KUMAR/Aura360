import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';

/** Small uppercase heading used above groups of content (matches the Fitness/Food card style). */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="caption" muted style={styles.label}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 10,
  },
});
