/**
 * ArticleContent — rendu du contenu markdown des articles (détail + modal).
 *
 * Sous-ensemble markdown produit par le pipeline, aligné sur le rendu web
 * (`parseContent` dans med_kit/frontend/src/lib/utils/articleUtils.ts) :
 *   - `# titre` ignoré (le titre de l'article est déjà affiché) ;
 *   - `##` / `###`+ → titres de section / sous-section ;
 *   - `- x` ou `* x` → puce ; ligne indentée (2+ espaces) → texte imbriqué ;
 *   - `---`, `***`, `___` ignorés ;
 *   - inline : `**gras**`, `*italique*`.
 */
import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { COLORS } from '../assets/constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../assets/constants/fonts';

type Block =
  | { kind: 'h2' | 'h3' | 'p' | 'bullet' | 'nested'; text: string }
  | { kind: 'gap' };

export function parseArticleContent(content: string): Block[] {
  const blocks: Block[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (blocks.length && blocks[blocks.length - 1].kind !== 'gap') blocks.push({ kind: 'gap' });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) continue;

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) continue;
      blocks.push({ kind: level === 2 ? 'h2' : 'h3', text: heading[2].trim() });
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed) && !trimmed.startsWith('**')) {
      blocks.push({ kind: 'bullet', text: trimmed.replace(/^[-*•]\s+/, '') });
      continue;
    }
    if (/^ {2,}/.test(line) && !trimmed.startsWith('**')) {
      blocks.push({ kind: 'nested', text: trimmed.replace(/^[•·○*]\s*/, '') });
      continue;
    }
    blocks.push({ kind: 'p', text: trimmed });
  }
  while (blocks.length && blocks[blocks.length - 1].kind === 'gap') blocks.pop();
  return blocks;
}

/** Rendu inline : `**gras**`, `*italique*` (les marqueurs `**` orphelins sont retirés). */
export function renderInline(text: string, boldStyle: TextStyle, keyPrefix = ''): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Pas de lookbehind (support Hermes incertain).
  const re = /\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index).replace(/\*\*/g, ''));
    if (m[1] !== undefined) {
      out.push(
        <Text key={`${keyPrefix}b${i++}`} style={boldStyle}>
          {m[1]}
        </Text>
      );
    } else {
      out.push(
        <Text key={`${keyPrefix}i${i++}`} style={styles.italic}>
          {m[2]}
        </Text>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last).replace(/\*\*/g, ''));
  return out;
}

export default function ArticleContent({ content }: { content: string | null | undefined }) {
  if (!content) return null;
  const blocks = parseArticleContent(content);
  return (
    <View>
      {blocks.map((b, index) => {
        switch (b.kind) {
          case 'gap':
            return <View key={index} style={styles.gap} />;
          case 'h2':
            return (
              <Text key={index} style={styles.h2} accessibilityRole="header">
                {renderInline(b.text, styles.h2, `${index}-`)}
              </Text>
            );
          case 'h3':
            return (
              <Text key={index} style={styles.h3} accessibilityRole="header">
                {renderInline(b.text, styles.h3, `${index}-`)}
              </Text>
            );
          case 'bullet':
            return (
              <View key={index} style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{renderInline(b.text, styles.bold, `${index}-`)}</Text>
              </View>
            );
          case 'nested':
            return (
              <Text key={index} style={styles.nested}>
                {renderInline(b.text, styles.bold, `${index}-`)}
              </Text>
            );
          default:
            return (
              <Text key={index} style={styles.paragraph}>
                {renderInline(b.text, styles.bold, `${index}-`)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    height: LINE_HEIGHTS.base / 2,
  } as ViewStyle,
  h2: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  } as TextStyle,
  h3: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  } as TextStyle,
  paragraph: {
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    lineHeight: LINE_HEIGHTS.base * 1.5,
    color: COLORS.textPrimary,
    marginBottom: 10,
  } as TextStyle,
  bold: {
    fontFamily: FONTS.sans.bold,
    color: COLORS.textPrimary,
  } as TextStyle,
  italic: {
    fontStyle: 'italic',
  } as TextStyle,
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  } as ViewStyle,
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.iconPrimary,
    marginTop: LINE_HEIGHTS.base * 0.7 - 3,
    marginRight: 10,
  } as ViewStyle,
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: FONTS.sans.regular,
    lineHeight: LINE_HEIGHTS.base * 1.4,
    color: COLORS.textPrimary,
  } as TextStyle,
  nested: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.sans.regular,
    lineHeight: LINE_HEIGHTS.base * 1.3,
    color: COLORS.textSecondary,
    paddingLeft: 24,
    marginBottom: 6,
  } as TextStyle,
});
