// Icons and small pictures for the demos, drawn for them (24 px grid, 1.75 px strokes).

import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type IconProps = { color: string; size?: number };

const line = { strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

export function ChevronLeft({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14.5 5.5 8 12l6.5 6.5" stroke={color} {...line} strokeWidth={2} />
    </Svg>
  );
}

export function MoreIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={6} cy={12} r={1.6} fill={color} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Circle cx={18} cy={12} r={1.6} fill={color} />
    </Svg>
  );
}

export function BagIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.5 8.5h13l-1 11a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4l-1-11Z" stroke={color} {...line} />
      <Path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" stroke={color} {...line} />
    </Svg>
  );
}

export function PlusIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} {...line} strokeWidth={2.2} />
    </Svg>
  );
}

export function BellIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 16.5V11a5.5 5.5 0 1 1 11 0v5.5l1.5 1.5h-14l1.5-1.5Z" stroke={color} {...line} strokeWidth={2} />
      <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={color} {...line} strokeWidth={2} />
    </Svg>
  );
}

export function SwapIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 4.5v15M8 19.5l-3.5-3.5M8 19.5l3.5-3.5M16 19.5v-15M16 4.5 12.5 8M16 4.5 19.5 8" stroke={color} {...line} strokeWidth={2} />
    </Svg>
  );
}

export function CloudIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.5 18.5h9.5a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.6a4.5 4.5 0 0 0 .5 8.9Z" stroke={color} {...line} />
    </Svg>
  );
}

export function ArrowUpRight({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 17 17 7M8 7h9v9" stroke={color} {...line} strokeWidth={2.4} />
    </Svg>
  );
}

/** A round portrait: glaze colours and a thrown pot, for the potter in the demo. */
export function Avatar({ size, id }: { size: number; id: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F6C7A4" />
          <Stop offset="1" stopColor="#D9795A" />
        </LinearGradient>
        <LinearGradient id={`${id}-pot`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2F5D62" />
          <Stop offset="1" stopColor="#1C3B40" />
        </LinearGradient>
      </Defs>
      <Circle cx={40} cy={40} r={40} fill={`url(#${id}-sky)`} />
      <Ellipse cx={40} cy={66} rx={26} ry={7} fill="#B85A3F" opacity={0.55} />
      <Path d="M28 30c0-3 3-4 12-4s12 1 12 4c0 4-4 6-4 10 0 6 8 9 8 17 0 6-7 9-16 9s-16-3-16-9c0-8 8-11 8-17 0-4-4-6-4-10Z" fill={`url(#${id}-pot)`} />
      <Ellipse cx={40} cy={28.5} rx={10} ry={2.4} fill="#14292C" />
      <Path d="M30 49c4 2 16 2 20 0" stroke="#6FA5A0" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8} />
    </Svg>
  );
}

/** A speckled stoneware vase on a coloured tile. */
export function VaseArt({ size, id, dark }: { size: number; id: string; dark: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={dark ? '#3A2C24' : '#F1E3D3'} />
          <Stop offset="1" stopColor={dark ? '#2A201B' : '#E6D2BD'} />
        </LinearGradient>
        <LinearGradient id={`${id}-vase`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#E9DCC8" />
          <Stop offset="0.6" stopColor="#D8C6AC" />
          <Stop offset="1" stopColor="#B9A386" />
        </LinearGradient>
      </Defs>
      <Rect width={64} height={64} rx={14} fill={`url(#${id}-tile)`} />
      <Ellipse cx={32} cy={53} rx={14} ry={3} fill="#000" opacity={dark ? 0.35 : 0.12} />
      <Path d="M26 12h12v3c0 3 9 8 9 20 0 11-7 18-15 18s-15-7-15-18c0-12 9-17 9-20v-3Z" fill={`url(#${id}-vase)`} />
      <Rect x={25} y={10.5} width={14} height={3} rx={1.5} fill="#C7B293" />
      {[
        [27, 30],
        [35, 27],
        [31, 38],
        [38, 42],
        [24, 44],
        [33, 47],
        [29, 22],
      ].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={0.9} fill="#6B5A47" opacity={0.7} />
      ))}
    </Svg>
  );
}

/** A token's round mark: two colours and a letter-free glyph. */
export function TokenMark({ size, from, to, id, shape }: { size: number; from: string; to: string; id: string; shape: 'wave' | 'drop' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Circle cx={16} cy={16} r={16} fill={`url(#${id}-g)`} />
      {shape === 'wave' ? (
        <Path d="M8 18c2.5-3 5-3 8 0s5.5 3 8 0M8 13c2.5-3 5-3 8 0s5.5 3 8 0" stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M16 7.5c3.8 4.6 6 7.8 6 10.6a6 6 0 1 1-12 0c0-2.8 2.2-6 6-10.6Z" fill="#fff" opacity={0.92} />
      )}
    </Svg>
  );
}
