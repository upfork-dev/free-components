import { memo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

// Seven moods for the journal demo: a glyph each, drawn here, and the screen's colours for each, in both themes.

export type Mood = {
  key: string;
  name: string;
  glyph: string;
  dark: [string, string];
  light: [string, string];
};

export const MOODS: Mood[] = [
  { key: 'drained', name: 'Drained', glyph: '#8E9BB5', dark: ['#1C2333', '#0D1017'], light: ['#E2E6EE', '#F5F6F9'] },
  { key: 'low', name: 'Low', glyph: '#7EA2E6', dark: ['#1C2B48', '#0D1425'], light: ['#D9E4F8', '#F2F6FD'] },
  { key: 'meh', name: 'Meh', glyph: '#9DB3AB', dark: ['#22303A', '#10171C'], light: ['#DFE9E5', '#F4F7F6'] },
  { key: 'calm', name: 'Calm', glyph: '#56CDBD', dark: ['#113D3F', '#09201F'], light: ['#CFEFEA', '#EFFAF8'] },
  { key: 'good', name: 'Good', glyph: '#7FD680', dark: ['#1C4A2D', '#0C2415'], light: ['#DAF2D2', '#F2FAEF'] },
  { key: 'bright', name: 'Bright', glyph: '#F6C445', dark: ['#4B3A10', '#231A07'], light: ['#FBEEC4', '#FEFAEC'] },
  { key: 'radiant', name: 'Radiant', glyph: '#FF8C52', dark: ['#4C2413', '#230F08'], light: ['#FFDFCB', '#FFF4EC'] },
];

const INK = '#1E1B22';

/** A mood's face: from a deep frown to a grin with sparkles. */
export const MoodGlyph = memo(function MoodGlyph({ mood, size }: { mood: number; size: number }) {
  const m = MOODS[mood];
  const line = { stroke: INK, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  const dots = (
    <G fill={INK}>
      <Circle cx={37} cy={45} r={4.6} />
      <Circle cx={63} cy={45} r={4.6} />
    </G>
  );
  const happyEyes = (
    <G>
      <Path d="M30 47c3-6 11-6 14 0" {...line} />
      <Path d="M56 47c3-6 11-6 14 0" {...line} />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={50} fill={m.glyph} />
      {mood === 0 ? (
        <G>
          <Path d="M28 38l14 5M72 38l-14 5" {...line} strokeWidth={4} />
          <Path d="M32 49h10M58 49h10" {...line} />
          <Path d="M34 72c8-9 24-9 32 0" {...line} />
        </G>
      ) : null}
      {mood === 1 ? (
        <G>
          {dots}
          <Path d="M36 69c7-6 21-6 28 0" {...line} />
        </G>
      ) : null}
      {mood === 2 ? (
        <G>
          <Path d="M31 46h12M57 46h12" {...line} />
          <Path d="M37 66h26" {...line} />
        </G>
      ) : null}
      {mood === 3 ? (
        <G>
          <Path d="M30 45c3 5 11 5 14 0M56 45c3 5 11 5 14 0" {...line} />
          <Path d="M38 63c6 5 18 5 24 0" {...line} />
        </G>
      ) : null}
      {mood === 4 ? (
        <G>
          {dots}
          <Path d="M33 60c8 11 26 11 34 0" {...line} />
        </G>
      ) : null}
      {mood === 5 ? (
        <G>
          {happyEyes}
          <Path d="M31 58h38c-2 13-10 20-19 20s-17-7-19-20Z" fill={INK} />
          <Path d="M40 70c6 4 14 4 20 0" stroke="#FF7A6E" strokeWidth={4} strokeLinecap="round" fill="none" />
        </G>
      ) : null}
      {mood === 6 ? (
        <G>
          {happyEyes}
          <Path d="M28 56h44c-2 16-11 24-22 24s-20-8-22-24Z" fill={INK} />
          <Path d="M38 70c7 5 17 5 24 0" stroke="#FF7A6E" strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M82 18l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM16 22l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5 1.5-4Z" fill="#FFFFFF" />
        </G>
      ) : null}
    </Svg>
  );
});
