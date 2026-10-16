import * as Clipboard from 'expo-clipboard';
import { memo, useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Markdown, { type RenderRules } from 'react-native-markdown-display';

import { AiWidget, parseWidget } from '@/components/ai/widgets';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useNotify } from '@/providers/notify';
import { MAX_FONT_SCALE, fontFamily, radius, spacing, typeScale, useTheme } from '@/theme';

/** A fenced code block: monospace surface, language label and a Copy button. */
const CodeBlock = memo(function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { colors } = useTheme();
  const notify = useNotify();
  const label = language || 'Code';

  async function copy() {
    try {
      await Clipboard.setStringAsync(code);
      notify.success('Copied');
    } catch {
      notify.error('Could not copy to the clipboard');
    }
  }

  return (
    <View style={[styles.codeBlock, { backgroundColor: colors.cardMuted, borderColor: colors.border }]}>
      <View style={[styles.codeHeader, { borderBottomColor: colors.border }]}>
        <Text variant="caption" weight="semiBold" color="textSecondary" numberOfLines={1} style={styles.codeLabel}>
          {label}
        </Text>
        <Button title="Copy" variant="ghost" size="sm" leftIcon="copy-outline" fullWidth={false} onPress={() => void copy()} accessibilityLabel={`Copy ${label.toLowerCase()} code`} />
      </View>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.codeScroll}>
        <Text variant="label" weight="regular" style={{ fontFamily: fontFamily.mono }} selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
});

/** Renders the assistant's markdown; fenced JSON blocks that describe a widget become native cards. */
export const MessageMarkdown = memo(function MessageMarkdown({ content }: { content: string }) {
  const { colors, accent } = useTheme();

  const style = useMemo(() => {
    const body = { color: colors.text, fontFamily: fontFamily.regular, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight };
    const heading = { color: colors.text, fontFamily: fontFamily.bold, marginTop: spacing.sm, marginBottom: spacing.xs };
    return StyleSheet.create({
      body,
      paragraph: { marginTop: 0, marginBottom: spacing.sm },
      heading1: { ...heading, fontSize: typeScale.title.fontSize, lineHeight: typeScale.title.lineHeight },
      heading2: { ...heading, fontFamily: fontFamily.semiBold, fontSize: typeScale.title.fontSize, lineHeight: typeScale.title.lineHeight },
      heading3: { ...heading, fontFamily: fontFamily.semiBold, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight },
      heading4: { ...heading, fontFamily: fontFamily.semiBold, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight },
      strong: { fontFamily: fontFamily.bold },
      em: { fontStyle: 'italic' },
      link: { color: colors.primaryAccent, textDecorationLine: 'underline' },
      bullet_list: { marginBottom: spacing.sm },
      ordered_list: { marginBottom: spacing.sm },
      bullet_list_icon: { color: colors.textSecondary, marginRight: spacing.sm },
      ordered_list_icon: { color: colors.textSecondary, marginRight: spacing.sm },
      list_item: { marginBottom: spacing.xs },
      code_inline: {
        backgroundColor: colors.cardMuted,
        color: colors.text,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: spacing.xs,
        paddingHorizontal: spacing.xs,
        fontFamily: fontFamily.mono,
        fontSize: typeScale.label.fontSize,
      },
      blockquote: {
        backgroundColor: colors.cardMuted,
        borderLeftColor: accent('ai').solid,
        borderLeftWidth: spacing.xs,
        borderRadius: radius.sm,
        marginHorizontal: 0,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      },
      hr: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginVertical: spacing.md },
      table: { borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, marginBottom: spacing.sm, overflow: 'hidden' },
      thead: { backgroundColor: colors.cardMuted },
      th: { padding: spacing.sm, fontFamily: fontFamily.semiBold },
      td: { padding: spacing.sm, borderColor: colors.border },
      tr: { borderColor: colors.border },
    });
  }, [colors, accent]);

  const rules = useMemo<RenderRules>(
    () => ({
      // Cap system font scaling the same way <Text> does.
      text: (node, _children, _parent, _styles, inherited = {}) => (
        <Text key={node.key} variant="body" style={inherited} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {node.content}
        </Text>
      ),
      textgroup: (node, children, _parent, styles) => (
        <Text key={node.key} style={styles.textgroup} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {children}
        </Text>
      ),
      fence: (node) => {
        const lang = (node as { sourceInfo?: string }).sourceInfo?.trim();
        const code = String(node.content ?? '').replace(/\n$/, '');
        const widget = parseWidget(code, lang);
        if (widget) return <AiWidget key={node.key} widget={widget} />;
        return <CodeBlock key={node.key} code={code} language={lang} />;
      },
      code_block: (node) => <CodeBlock key={node.key} code={String(node.content ?? '').replace(/\n$/, '')} />,
    }),
    [],
  );

  return (
    // The last paragraph's bottom margin would add dead space at the end of the bubble.
    <View style={styles.markdown}>
      <Markdown
        style={style}
        rules={rules}
        onLinkPress={(url) => {
          Linking.openURL(url).catch(() => {});
          return false;
        }}>
        {content}
      </Markdown>
    </View>
  );
});

const styles = StyleSheet.create({
  markdown: { marginBottom: -spacing.sm },
  codeBlock: { borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  codeLabel: { flexShrink: 1 },
  codeScroll: { padding: spacing.md },
});
