import { useMemo } from 'react';

import { Text, type TextVariant, type TextWeight } from '@/components/ui/text';
import { highlightRanges, splitByRanges } from '@/features/search/match';
import type { ThemeColors } from '@/theme';

type Props = {
  text: string;
  /** Normalised query words (see `tokenize`). */
  tokens: string[];
  variant?: TextVariant;
  weight?: TextWeight;
  color?: keyof ThemeColors;
  numberOfLines?: number;
};

/**
 * Text with the matched words in bold and the brand colour. Bold carries the meaning, so the highlight is never
 * colour-only. Screen readers read the text as one piece (the surrounding row supplies the spoken label).
 */
export function HighlightedText({ text, tokens, variant = 'body', weight, color = 'text', numberOfLines }: Props) {
  const segments = useMemo(() => splitByRanges(text, highlightRanges(text, tokens)), [text, tokens]);
  return (
    <Text variant={variant} weight={weight} color={color} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.match ? (
          <Text key={index} variant={variant} weight="bold" color="primaryAccent">
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}
