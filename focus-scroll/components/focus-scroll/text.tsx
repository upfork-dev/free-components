import {
  Group,
  LinearGradient,
  Paint,
  Paragraph,
  Rect,
  Skia,
  TextAlign,
  useFonts,
  vec,
  type DataModule,
  type SkParagraph,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { clamp } from './math';

/** The family name of the bundled font: Geist (SIL Open Font License, see assets/fonts/OFL.txt). */
export const FOCUS_FONT = 'Geist';

/**
 * Loads the bundled Geist font for Skia text. Skia draws its own text, and on the web (CanvasKit) there are no system
 * fonts at all, so text in a Focus Scroll needs a font file. Returns null until it's loaded.
 */
export function useFocusFont(): SkTypefaceFontProvider | null {
  return useFonts(GEIST);
}

/**
 * A bundled file as Skia's font loader takes it. On phones `require` gives an asset number; on the web it gives the
 * file's URL as a string, which the loader wants as `{ uri }`.
 */
export function fontSource(module: unknown): DataModule {
  return (typeof module === 'string' ? { uri: module } : module) as DataModule;
}

const GEIST = {
  [FOCUS_FONT]: [
    fontSource(require('../../assets/fonts/Geist-Regular.ttf')),
    fontSource(require('../../assets/fonts/Geist-Medium.ttf')),
    fontSource(require('../../assets/fonts/Geist-SemiBold.ttf')),
    fontSource(require('../../assets/fonts/Geist-Bold.ttf')),
  ],
};

export type FocusTextStyle = {
  fontSize?: number;
  /** Line height as a multiple of the font size. */
  lineHeight?: number;
  weight?: 400 | 500 | 600 | 700;
  letterSpacing?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Another family registered in your font provider. Defaults to the bundled Geist. */
  family?: string;
  /** Use digits of equal width (times, counters). */
  tabular?: boolean;
  /** At most this many lines; the last one ends with an ellipsis. */
  maxLines?: number;
};

const ALIGN = { left: TextAlign.Left, center: TextAlign.Center, right: TextAlign.Right } as const;

/**
 * Builds and lays out a Skia paragraph. Build each once (per text and width), never per frame: use it to measure
 * an item's height in `getItemHeight` and draw the same object.
 */
export function buildParagraph(
  fonts: SkTypefaceFontProvider,
  text: string,
  width: number,
  style: FocusTextStyle = {},
): SkParagraph {
  // Paragraphs are cached per font provider, so an item scrolling back into view doesn't build its text again.
  let cache = PARAGRAPHS.get(fonts);
  if (!cache) {
    cache = new Map();
    PARAGRAPHS.set(fonts, cache);
  }
  const key = `${width}|${style.fontSize}|${style.lineHeight}|${style.weight}|${style.letterSpacing}|${style.color}|${style.align}|${style.family}|${style.tabular}|${style.maxLines}|${text}`;
  const cached = cache.get(key);
  if (cached) {
    // Most recently used last, so the oldest can be dropped first.
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const fontSize = style.fontSize ?? 17;
  const paragraph = Skia.ParagraphBuilder.Make(
    { textAlign: ALIGN[style.align ?? 'left'], ...(style.maxLines ? { maxLines: style.maxLines, ellipsis: '…' } : null) },
    fonts,
  )
    .pushStyle({
      color: Skia.Color(style.color ?? '#FFFFFF'),
      fontFamilies: [style.family ?? FOCUS_FONT],
      fontSize,
      fontStyle: { weight: style.weight ?? 400 },
      heightMultiplier: style.lineHeight ?? 1.3,
      letterSpacing: style.letterSpacing ?? 0,
      fontFeatures: style.tabular ? [{ name: 'tnum', value: 1 }] : undefined,
    })
    .addText(text)
    .build();
  paragraph.layout(width);
  cache.set(key, paragraph);
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return paragraph;
}

const PARAGRAPHS = new WeakMap<SkTypefaceFontProvider, Map<string, SkParagraph>>();
const MAX_CACHED = 600;

export type FocusParagraphProps = FocusTextStyle & {
  text: string;
  fonts: SkTypefaceFontProvider;
  width: number;
  x?: number;
  y?: number;
  /**
   * A karaoke fill, from 0 to 1, sweeping through the lines in reading order with a soft edge. Text not yet filled
   * is drawn in `dimColor`. Leave it out for plain text in `color`.
   */
  progress?: number | SharedValue<number>;
  /** The colour of text the fill hasn't reached. Defaults to `color` at 45%. */
  dimColor?: string;
  /** How soft the fill's front edge is, in px. */
  feather?: number;
};

/** Skia text for a Focus Scroll item, with an optional karaoke fill. Draw it inside `renderItem`. */
export function FocusParagraph({
  text,
  fonts,
  width,
  x = 0,
  y = 0,
  progress,
  dimColor,
  feather = 24,
  ...style
}: FocusParagraphProps) {
  const color = style.color ?? '#FFFFFF';
  const full = useMemo(() => buildParagraph(fonts, text, width, { ...style, color }), [fonts, text, width, color, style.fontSize, style.lineHeight, style.weight, style.letterSpacing, style.align, style.family, style.tabular, style.maxLines]); // eslint-disable-line react-hooks/exhaustive-deps

  if (progress === undefined || progress === 1) return <Paragraph paragraph={full} x={x} y={y} width={width} />;
  if (progress === 0) return <DimParagraph fonts={fonts} text={text} width={width} x={x} y={y} color={dimColor ?? withAlpha(color, 0.45)} style={style} />;

  return (
    <KaraokeParagraph
      full={full}
      fonts={fonts}
      text={text}
      width={width}
      x={x}
      y={y}
      progress={progress}
      dimColor={dimColor ?? withAlpha(color, 0.45)}
      feather={feather}
      style={style}
    />
  );
}

/** Text the fill hasn't reached at all: one plain paragraph, no layers. */
function DimParagraph({
  fonts,
  text,
  width,
  x,
  y,
  color,
  style,
}: {
  fonts: SkTypefaceFontProvider;
  text: string;
  width: number;
  x: number;
  y: number;
  color: string;
  style: FocusTextStyle;
}) {
  const dim = useMemo(() => buildParagraph(fonts, text, width, { ...style, color }), [fonts, text, width, color, style.fontSize, style.lineHeight, style.weight, style.letterSpacing, style.align, style.family, style.tabular, style.maxLines]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Paragraph paragraph={dim} x={x} y={y} width={width} />;
}

type Line = { left: number; top: number; width: number; height: number; before: number };

function KaraokeParagraph({
  full,
  fonts,
  text,
  width,
  x,
  y,
  progress,
  dimColor,
  feather,
  style,
}: {
  full: SkParagraph;
  fonts: SkTypefaceFontProvider;
  text: string;
  width: number;
  x: number;
  y: number;
  progress: number | SharedValue<number>;
  dimColor: string;
  feather: number;
  style: FocusTextStyle;
}) {
  const dim = useMemo(() => buildParagraph(fonts, text, width, { ...style, color: dimColor }), [fonts, text, width, dimColor, style.fontSize, style.lineHeight, style.weight, style.letterSpacing, style.align, style.family, style.tabular, style.maxLines]); // eslint-disable-line react-hooks/exhaustive-deps

  const { lines, total } = useMemo(() => {
    let before = 0;
    const metrics = full.getLineMetrics();
    const out: Line[] = metrics.map((line, index) => {
      // Each line's band reaches halfway to its neighbours, so descenders and accents are never cut.
      const previous = metrics[index - 1];
      const next = metrics[index + 1];
      const top = previous ? (previous.baseline + line.baseline - line.ascent) / 2 : line.baseline - line.ascent - 6;
      const bottom = next ? (line.baseline + next.baseline - next.ascent) / 2 : line.baseline + line.descent + 6;
      const item = { left: line.left, top, width: line.width, height: bottom - top, before };
      before += line.width;
      return item;
    });
    return { lines: out, total: before };
  }, [full]);

  const fill = useDerivedValue(() => {
    const value = typeof progress === 'number' ? progress : progress.value;
    return clamp(value, 0, 1) * total;
  });

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      <Paragraph paragraph={dim} x={0} y={0} width={width} />
      {/* The filled text, kept only where the fill has reached (a layer, then a destination-in pass). */}
      <Group layer={<Paint />}>
        <Paragraph paragraph={full} x={0} y={0} width={width} />
        <Group layer={<Paint blendMode="dstIn" />}>
          {lines.map((line, index) => (
            <LineFill key={index} line={line} fill={fill} feather={feather} />
          ))}
        </Group>
      </Group>
    </Group>
  );
}

function LineFill({ line, fill, feather }: { line: Line; fill: SharedValue<number>; feather: number }) {
  const filled = useDerivedValue(() => clamp(fill.value - line.before, 0, line.width));
  const edge = useDerivedValue(() => line.left + filled.value);
  // The soft front edge shows only once the line has started, so the next line's first letters stay unlit.
  const edgeOpacity = useDerivedValue(() => clamp(filled.value / feather, 0, 1) * (filled.value < line.width ? 1 : 0));
  const start = useDerivedValue(() => vec(edge.value, 0));
  const end = useDerivedValue(() => vec(edge.value + feather, 0));
  return (
    <Group>
      <Rect x={line.left} y={line.top} width={filled} height={line.height} color="black" />
      <Rect x={edge} y={line.top} width={feather} height={line.height} opacity={edgeOpacity}>
        <LinearGradient start={start} end={end} colors={['black', 'transparent']} />
      </Rect>
    </Group>
  );
}

/** `#RRGGBB` (or `#RGB`) with an alpha, as an rgba() string. Other colour strings come back unchanged. */
export function withAlpha(color: string, alpha: number) {
  const hex = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  const parts = long
    ? [long[1], long[2], long[3]].map((part) => parseInt(part, 16))
    : short
      ? [short[1], short[2], short[3]].map((part) => parseInt(part + part, 16))
      : null;
  return parts ? `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})` : color;
}
