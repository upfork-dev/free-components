import { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

// Ten avatar characters, drawn here. One layout (a 120 × 120 box, the head at its centre), many looks.

type Hair = 'waves' | 'curls' | 'buzz' | 'bob' | 'bun' | 'beanie' | 'silver' | 'headband' | 'fade' | 'pixie';

export type FaceLook = {
  key: string;
  name: string;
  skin: string;
  shade: string;
  hair: Hair;
  hairColor: string;
  shirt: string;
  extra?: { glasses?: 'round' | 'square'; beard?: boolean; mustache?: boolean; freckles?: boolean; earring?: string; band?: string; hat?: string };
};

export const FACES: FaceLook[] = [
  { key: 'waves', name: 'Waves', skin: '#E8B48F', shade: '#D49A74', hair: 'waves', hairColor: '#3B2A22', shirt: '#F26D5B', extra: { earring: '#F4C542' } },
  { key: 'curls', name: 'Curls', skin: '#8D5A3B', shade: '#7A4B30', hair: 'curls', hairColor: '#1F1712', shirt: '#4F7CFF', extra: { glasses: 'round' } },
  { key: 'buzz', name: 'Buzz & beard', skin: '#D9A07A', shade: '#C48864', hair: 'buzz', hairColor: '#4A3226', shirt: '#2F9E7A', extra: { beard: true } },
  { key: 'bob', name: 'Bob', skin: '#F3D2BB', shade: '#E3B99E', hair: 'bob', hairColor: '#17161C', shirt: '#F7B23B', extra: { freckles: true } },
  { key: 'bun', name: 'Top bun', skin: '#F0C7A4', shade: '#DDAA85', hair: 'bun', hairColor: '#A6492C', shirt: '#7A5CFA' },
  { key: 'beanie', name: 'Beanie', skin: '#C68B62', shade: '#B0754E', hair: 'beanie', hairColor: '#2A1E18', shirt: '#3A3F4C', extra: { hat: '#F2A93B' } },
  { key: 'silver', name: 'Silver', skin: '#EBC3A6', shade: '#D6A887', hair: 'silver', hairColor: '#C9CBD1', shirt: '#4D6B8A', extra: { glasses: 'square', mustache: true } },
  { key: 'headband', name: 'Headband', skin: '#B97E55', shade: '#A36A43', hair: 'headband', hairColor: '#2B1D16', shirt: '#E8E4DA', extra: { band: '#1FB5A6' } },
  { key: 'fade', name: 'Fade', skin: '#6E4129', shade: '#5C3420', hair: 'fade', hairColor: '#120D0A', shirt: '#E2553F', extra: { earring: '#E6E8EE' } },
  { key: 'pixie', name: 'Pixie', skin: '#F6D7C3', shade: '#E8BFA6', hair: 'pixie', hairColor: '#F08BB4', shirt: '#22242C' },
];

const INK = '#2A2128';

function BackHair({ look }: { look: FaceLook }) {
  const c = look.hairColor;
  switch (look.hair) {
    case 'waves':
      return (
        <Path
          d="M33 54C30 30 46 19 61 19c17 0 30 12 27 36 3 14 9 26 6 40-2 9-9 14-16 12 4-10 3-20 0-30H42c-3 10-4 20 0 30-7 2-14-3-16-12-3-14 3-26 7-41Z"
          fill={c}
        />
      );
    case 'curls':
      return (
        <G fill={c}>
          {[
            [36, 40, 12], [46, 28, 12], [60, 23, 13], [74, 28, 12], [84, 40, 12], [88, 54, 10], [32, 54, 10],
            [52, 22, 9], [68, 22, 9], [40, 33, 9], [80, 33, 9],
          ].map(([x, y, r]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
          ))}
        </G>
      );
    case 'bob':
      return <Path d="M31 50c0-19 13-29 29-29s29 10 29 29v28c0 4-3 6-7 6H38c-4 0-7-2-7-6V50Z" fill={c} />;
    case 'headband':
      return <Path d="M33 52c0-20 12-31 27-31s27 11 27 31c2 18 4 34 2 48-6 4-12 4-17 2V74H48v28c-5 2-11 2-17-2-2-14 0-30 2-48Z" fill={c} />;
    case 'bun':
      return <Circle cx={60} cy={21} r={11} fill={c} />;
    default:
      return null;
  }
}

function FrontHair({ look }: { look: FaceLook }) {
  const c = look.hairColor;
  switch (look.hair) {
    case 'waves':
      return <Path d="M34 55c0-21 12-31 28-31 15 0 25 9 25 26-6-9-16-14-28-13-10 1-19 8-25 18Z" fill={c} />;
    case 'curls':
      return (
        <G fill={c}>
          <Circle cx={45} cy={38} r={8} />
          <Circle cx={56} cy={34} r={8} />
          <Circle cx={67} cy={35} r={8} />
          <Circle cx={77} cy={40} r={7} />
        </G>
      );
    case 'buzz':
      return <Path d="M35 50c1-17 11-25 25-25s24 8 25 25c-6-8-15-12-25-12s-19 4-25 12Z" fill={c} opacity={0.92} />;
    case 'bob':
      return <Path d="M33 52c0-18 11-27 27-27s27 9 27 27c-9-2-16-5-21-10-6 6-19 10-33 10Z" fill={c} />;
    case 'bun':
      return <Path d="M34 52c0-18 11-28 26-28s26 10 26 28c-5-9-14-14-26-14s-21 5-26 14Z" fill={c} />;
    case 'beanie':
      return (
        <G>
          <Path d="M34 58c-1-6 0-10 2-12h48c2 2 3 6 2 12l-4-4H38l-4 4Z" fill={c} />
          <Path d="M32 46c0-18 12-28 28-28s28 10 28 28v4H32v-4Z" fill={look.extra?.hat ?? '#F2A93B'} />
          <Rect x={30} y={42} width={60} height={10} rx={5} fill={look.extra?.hat ?? '#F2A93B'} />
          {[38, 46, 54, 62, 70, 78].map((x) => (
            <Rect key={x} x={x} y={43.5} width={2} height={7} rx={1} fill="rgba(0,0,0,0.12)" />
          ))}
          <Circle cx={60} cy={16} r={6} fill={look.extra?.hat ?? '#F2A93B'} />
        </G>
      );
    case 'silver':
      return <Path d="M34 54c-2-19 9-30 26-30 16 0 27 9 26 26-5-7-11-10-18-10-3 4-9 7-16 7-7 0-13 2-18 7Z" fill={c} />;
    case 'headband':
      return (
        <G>
          <Path d="M35 52c0-17 11-27 25-27s25 10 25 27c-7-8-15-12-25-12s-18 4-25 12Z" fill={c} />
          <Path d="M35 41c6-7 15-11 25-11s19 4 25 11l-2 5c-6-6-14-9-23-9s-17 3-23 9l-2-5Z" fill={look.extra?.band ?? '#1FB5A6'} />
        </G>
      );
    case 'fade':
      return (
        <G fill={c}>
          <Path d="M35 50c0-14 11-22 25-22s25 8 25 22c-6-6-15-9-25-9s-19 3-25 9Z" opacity={0.55} />
          {[40, 47, 54, 61, 68, 75, 80].map((x, i) => (
            <Circle key={x} cx={x} cy={i % 2 === 0 ? 30 : 27} r={6} />
          ))}
          <Path d="M36 38c4-6 13-10 24-10s20 4 24 10v4H36v-4Z" />
        </G>
      );
    case 'pixie':
      return <Path d="M33 54c-3-20 10-31 27-31 16 0 28 10 27 27l-6-4 1 7-8-6-3 6-6-8-7 7-2-7-8 6 1-6-9 9-7 0Z" fill={c} />;
    default:
      return null;
  }
}

/** One character, in a 120 × 120 box. */
export const Face = memo(function Face({ look, size }: { look: FaceLook; size: number }) {
  const extra = look.extra ?? {};
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <BackHair look={look} />
      <Path d="M12 122c2-20 20-32 48-32s46 12 48 32H12Z" fill={look.shirt} />
      <Path d="M48 90c3 6 7 9 12 9s9-3 12-9" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
      <Rect x={51} y={74} width={18} height={20} rx={8} fill={look.shade} />
      <Circle cx={34} cy={60} r={5.5} fill={look.shade} />
      <Circle cx={86} cy={60} r={5.5} fill={look.shade} />
      {extra.earring ? <Circle cx={34} cy={68} r={2.6} fill={extra.earring} /> : null}
      <Ellipse cx={60} cy={56} rx={26} ry={29} fill={look.skin} />
      {extra.freckles ? (
        <G fill={look.shade}>
          {[[47, 66], [50, 68], [45, 69], [73, 66], [70, 68], [75, 69]].map(([x, y]) => (
            <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} />
          ))}
        </G>
      ) : null}
      <Circle cx={46} cy={67} r={4.5} fill="#FF7A7A" opacity={0.22} />
      <Circle cx={74} cy={67} r={4.5} fill="#FF7A7A" opacity={0.22} />
      {extra.beard ? (
        <Path d="M35 60c1 18 11 30 25 30s24-12 25-30c-3 8-8 12-13 13-3-3-7-4-12-4s-9 1-12 4c-5-1-10-5-13-13Z" fill={look.hairColor} />
      ) : null}
      <Path d="M47 50c2-2 5-2 7 0M66 50c2-2 5-2 7 0" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Circle cx={50.5} cy={57} r={2.4} fill={INK} />
      <Circle cx={69.5} cy={57} r={2.4} fill={INK} />
      <Path d="M60 60c-1 3-2 5-3 7 1 1 3 1 4 0" stroke={look.shade} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {extra.mustache ? <Path d="M51 72c3-3 6-3 9-1 3-2 6-2 9 1-3 1-6 1-9 0-3 1-6 1-9 0Z" fill={look.hairColor} /> : null}
      <Path
        d={extra.beard ? 'M54 74c4 2 8 2 12 0' : 'M53 72c4 4 10 4 14 0'}
        stroke={extra.beard ? '#F3D9C7' : INK}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <FrontHair look={look} />
      {extra.glasses === 'round' ? (
        <G stroke={INK} strokeWidth={2} fill="rgba(255,255,255,0.12)">
          <Circle cx={50} cy={57} r={7.5} />
          <Circle cx={70} cy={57} r={7.5} />
          <Path d="M57.5 56c1.6-1.2 3.4-1.2 5 0" fill="none" />
        </G>
      ) : null}
      {extra.glasses === 'square' ? (
        <G stroke={INK} strokeWidth={2} fill="rgba(255,255,255,0.12)">
          <Rect x={42} y={51} width={15} height={11} rx={3} />
          <Rect x={63} y={51} width={15} height={11} rx={3} />
          <Path d="M57 55h6" fill="none" />
        </G>
      ) : null}
    </Svg>
  );
});
