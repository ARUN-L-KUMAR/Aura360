import { useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Markdown, { type RenderRules } from 'react-native-markdown-display';

import { AiWidget, parseWidget } from '@/components/ai/widgets';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

/** Renders the assistant's markdown; fenced JSON blocks that describe a widget become native cards. */
export function MessageMarkdown({ content }: { content: string }) {
  const { colors } = useTheme();

  const style = useMemo(
    () =>
      StyleSheet.create({
        body: { color: colors.text, fontSize: 15, lineHeight: 22 },
        paragraph: { marginTop: 0, marginBottom: spacing.sm },
        heading1: { color: colors.text, fontSize: 20, fontWeight: '700', marginVertical: spacing.sm },
        heading2: { color: colors.text, fontSize: 18, fontWeight: '700', marginVertical: spacing.sm },
        heading3: { color: colors.text, fontSize: 16, fontWeight: '600', marginVertical: spacing.xs },
        strong: { fontWeight: '700' },
        link: { color: colors.text, textDecorationLine: 'underline' },
        bullet_list: { marginBottom: spacing.sm },
        ordered_list: { marginBottom: spacing.sm },
        code_inline: { backgroundColor: colors.cardMuted, color: colors.text, borderRadius: 4, paddingHorizontal: 4, fontFamily: 'monospace' },
        code_block: { backgroundColor: colors.cardMuted, color: colors.text, borderRadius: radius.md, padding: spacing.md, borderWidth: 0, fontFamily: 'monospace', fontSize: 13 },
        fence: { backgroundColor: colors.cardMuted, color: colors.text, borderRadius: radius.md, padding: spacing.md, borderWidth: 0, fontFamily: 'monospace', fontSize: 13 },
        blockquote: { backgroundColor: colors.cardMuted, borderLeftColor: colors.border, borderLeftWidth: 3, paddingHorizontal: spacing.md, marginVertical: spacing.xs },
        hr: { backgroundColor: colors.border },
        table: { borderColor: colors.border },
        th: { padding: spacing.xs },
        td: { padding: spacing.xs, borderColor: colors.border },
        tr: { borderColor: colors.border },
      }),
    [colors],
  );

  const rules = useMemo<RenderRules>(
    () => ({
      fence: (node, _children, _parent, styles) => {
        const lang = (node as { sourceInfo?: string }).sourceInfo?.trim();
        const code = String(node.content ?? '').replace(/\n$/, '');
        const widget = parseWidget(code, lang);
        if (widget) return <AiWidget key={node.key} widget={widget} />;
        return (
          <View key={node.key} style={styles.fence}>
            <Text style={{ fontFamily: 'monospace', fontSize: 13 }} selectable>
              {code}
            </Text>
          </View>
        );
      },
    }),
    [],
  );

  return (
    <Markdown
      style={style}
      rules={rules}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(() => {});
        return false;
      }}>
      {content}
    </Markdown>
  );
}
