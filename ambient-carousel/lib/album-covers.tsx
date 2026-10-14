import { memo, useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop, Text } from 'react-native-svg';

// Twelve album covers, each its own composition, drawn here. Artists and albums are invented.

export type Album = {
  key: string;
  title: string;
  artist: string;
  year: number;
  tracks: number;
  colors: [string, string, string];
};

export const ALBUMS: Album[] = [
  { key: 'night-garden', title: 'Night Garden', artist: 'Lumen', year: 2025, tracks: 11, colors: ['#3048A8', '#8FA8FF', '#E4D9FF'] },
  { key: 'citrus-hours', title: 'Citrus Hours', artist: 'Mara Vell', year: 2024, tracks: 9, colors: ['#FF8A3D', '#FFD23F', '#FF5E5B'] },
  { key: 'low-tide', title: 'Low Tide Radio', artist: 'The Quiet Engines', year: 2025, tracks: 12, colors: ['#0FB5A6', '#0B6E8C', '#9BF2E3'] },
  { key: 'ember', title: 'Ember Theory', artist: 'Okoro', year: 2025, tracks: 10, colors: ['#E2453C', '#8B2FD0', '#FF9E5E'] },
  { key: 'polar', title: 'Polar Static', artist: 'Nadia Fen', year: 2023, tracks: 8, colors: ['#5AC8FA', '#2A5A8F', '#D6F4FF'] },
  { key: 'velvet', title: 'Velvet Hours', artist: 'Sora & the Lanterns', year: 2025, tracks: 13, colors: ['#FF6FB5', '#9B3BE8', '#FFC4E1'] },
  { key: 'saltwater', title: 'Saltwater Hymns', artist: 'Juno Reyes', year: 2024, tracks: 10, colors: ['#2EC4B6', '#1B6F8A', '#CBF3F0'] },
  { key: 'golden', title: 'Golden Ratio', artist: 'Theo Marsh', year: 2022, tracks: 7, colors: ['#E0A526', '#B5651D', '#FFE29A'] },
  { key: 'neon', title: 'Neon Orchard', artist: 'Pixel Choir', year: 2025, tracks: 14, colors: ['#B8F230', '#FF2E93', '#4DE1C1'] },
  { key: 'paper', title: 'Paper Satellites', artist: 'Wren Ito', year: 2024, tracks: 9, colors: ['#F25F5C', '#247BA0', '#FFE066'] },
  { key: 'fires', title: 'Quiet Fires', artist: 'Hollow Pines', year: 2023, tracks: 11, colors: ['#FF7F11', '#C2410C', '#FFB563'] },
  { key: 'glass', title: 'Glass Weather', artist: 'Mira Solace', year: 2025, tracks: 10, colors: ['#7BDFF2', '#B2A4F7', '#F7D6E0'] },
];

const SANS = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', default: undefined });
const SERIF = Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' });

function useIds() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name: string) => `${name}-${id}`;
}

function NightGarden() {
  const id = useIds();
  return (
    <>
      <Defs>
        <LinearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0A1230" />
          <Stop offset="1" stopColor="#2A3C7A" />
        </LinearGradient>
        <LinearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1C2D63" />
          <Stop offset="1" stopColor="#070D24" />
        </LinearGradient>
        <RadialGradient id={id('halo')} cx="132" cy="70" r="70" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#E9E3FF" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#E9E3FF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={200} height={200} fill={`url(#${id('sky')})`} />
      <Circle cx={132} cy={70} r={70} fill={`url(#${id('halo')})`} />
      {[[30, 30], [62, 18], [90, 46], [170, 24], [44, 70], [180, 96], [18, 104], [74, 92]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="#E9E3FF" opacity={0.8} />
      ))}
      <Circle cx={132} cy={70} r={24} fill="#EFEADB" />
      <Circle cx={124} cy={64} r={4} fill="#DCD5C2" />
      <Circle cx={140} cy={78} r={3} fill="#DCD5C2" />
      <Rect y={126} width={200} height={74} fill={`url(#${id('sea')})`} />
      {[[132, 132, 50, 0.55], [132, 140, 38, 0.45], [134, 149, 28, 0.38], [130, 158, 34, 0.28], [133, 168, 20, 0.22], [131, 178, 26, 0.16]].map(
        ([x, y, w, o], i) => (
          <Rect key={i} x={x - w / 2} y={y} width={w} height={2.4} rx={1.2} fill="#EFEADB" opacity={o} />
        ),
      )}
      <Text x={14} y={22} fontSize={9} fontWeight="700" letterSpacing={3} fill="#C9D3FF" fontFamily={SANS}>
        LUMEN
      </Text>
      <Text x={14} y={186} fontSize={21} fontStyle="italic" fill="#F2EEFF" fontFamily={SERIF}>
        Night Garden
      </Text>
    </>
  );
}

function CitrusHours() {
  return (
    <>
      <Rect width={200} height={200} fill="#FFF1DC" />
      <Circle cx={78} cy={92} r={54} fill="#FF8A3D" />
      <Circle cx={124} cy={112} r={48} fill="#FFD23F" opacity={0.92} />
      <Circle cx={152} cy={56} r={17} fill="#FF5E5B" />
      <Line x1={14} y1={160} x2={186} y2={160} stroke="#3B1F0E" strokeWidth={1} />
      <Text x={14} y={182} fontSize={19} fontWeight="900" letterSpacing={-0.6} fill="#3B1F0E" fontFamily={SANS}>
        CITRUS HOURS
      </Text>
      <Text x={186} y={22} fontSize={9} fontWeight="600" textAnchor="end" fill="#7A4A26" fontFamily={SANS}>
        Mara Vell
      </Text>
    </>
  );
}

function LowTide() {
  return (
    <>
      <Rect width={200} height={200} fill="#0B4F6C" />
      <Text x={10} y={88} fontSize={78} fontWeight="900" letterSpacing={-4} fill="#9BF2E3" fontFamily={SANS}>
        LOW
      </Text>
      <Text x={10} y={160} fontSize={78} fontWeight="900" letterSpacing={-4} fill="none" stroke="#9BF2E3" strokeWidth={1.6} fontFamily={SANS}>
        TIDE
      </Text>
      <Rect x={10} y={172} width={180} height={1} fill="#0FB5A6" />
      <Text x={10} y={188} fontSize={8} fontWeight="700" letterSpacing={2.4} fill="#0FB5A6" fontFamily={SANS}>
        THE QUIET ENGINES · RADIO
      </Text>
    </>
  );
}

function EmberTheory() {
  const id = useIds();
  return (
    <>
      <Defs>
        <LinearGradient id={id('heat')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF9E5E" />
          <Stop offset="0.45" stopColor="#E2453C" />
          <Stop offset="1" stopColor="#5B1E9E" />
        </LinearGradient>
        <Pattern id={id('grain')} width={6} height={6} patternUnits="userSpaceOnUse">
          <Rect x={1} y={2} width={0.8} height={0.8} fill="#FFFFFF" opacity={0.22} />
          <Rect x={4} y={0} width={0.7} height={0.7} fill="#000000" opacity={0.2} />
          <Rect x={3} y={4} width={0.8} height={0.8} fill="#FFFFFF" opacity={0.14} />
          <Rect x={0} y={5} width={0.7} height={0.7} fill="#000000" opacity={0.18} />
        </Pattern>
      </Defs>
      <Rect width={200} height={200} fill={`url(#${id('heat')})`} />
      <Rect width={200} height={200} fill={`url(#${id('grain')})`} />
      <Circle cx={100} cy={96} r={46} fill="none" stroke="#FFF4EA" strokeWidth={1.4} />
      <Circle cx={100} cy={96} r={3} fill="#FFF4EA" />
      <Text x={186} y={182} fontSize={18} fontWeight="300" letterSpacing={1} textAnchor="end" fill="#FFF4EA" fontFamily={SANS}>
        Ember Theory
      </Text>
      <Text x={14} y={22} fontSize={9} fontWeight="800" letterSpacing={3} fill="#FFF4EA" fontFamily={SANS}>
        OKORO
      </Text>
    </>
  );
}

function PolarStatic() {
  const dots = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const wave = Math.sin((r + c) * 0.55) * 0.5 + 0.5;
      dots.push(<Circle key={`${r}-${c}`} cx={28 + c * 18} cy={50 + r * 16} r={1.2 + wave * 4.6} fill={wave > 0.6 ? '#D6F4FF' : '#5AC8FA'} opacity={0.35 + wave * 0.65} />);
    }
  }
  return (
    <>
      <Rect width={200} height={200} fill="#10243F" />
      {dots}
      <Text x={100} y={30} fontSize={12} fontWeight="300" letterSpacing={6} textAnchor="middle" fill="#D6F4FF" fontFamily={SANS}>
        polar static
      </Text>
      <Text x={100} y={192} fontSize={8} fontWeight="700" letterSpacing={2.4} textAnchor="middle" fill="#5AC8FA" fontFamily={SANS}>
        NADIA FEN
      </Text>
    </>
  );
}

function VelvetHours() {
  const rays = [];
  for (let i = 0; i < 14; i += 1) {
    const a0 = Math.PI + (i / 14) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 14) * Math.PI;
    const r = 260;
    rays.push(
      <Path
        key={i}
        d={`M100 168L${100 + Math.cos(a0) * r} ${168 + Math.sin(a0) * r}L${100 + Math.cos(a1) * r} ${168 + Math.sin(a1) * r}Z`}
        fill={i % 2 === 0 ? '#FF6FB5' : '#B44DE8'}
      />,
    );
  }
  return (
    <>
      <Rect width={200} height={200} fill="#8E2DE2" />
      {rays}
      <Circle cx={100} cy={168} r={44} fill="#FFC4E1" />
      <Rect y={168} width={200} height={32} fill="#5A1A9A" />
      <Text x={100} y={36} fontSize={20} fontStyle="italic" textAnchor="middle" fill="#FFF0F7" fontFamily={SERIF}>
        Velvet Hours
      </Text>
      <Text x={100} y={190} fontSize={8} fontWeight="700" letterSpacing={2.2} textAnchor="middle" fill="#FFC4E1" fontFamily={SANS}>
        SORA &amp; THE LANTERNS
      </Text>
    </>
  );
}

function SaltwaterHymns() {
  const waves = [];
  for (let i = 0; i < 9; i += 1) {
    const y = 58 + i * 12;
    const amp = 4 + i * 0.6;
    let d = `M-10 ${y}`;
    for (let x = -10; x <= 210; x += 10) d += ` Q${x + 5} ${y + (Math.floor(x / 10) % 2 === 0 ? -amp : amp)} ${x + 10} ${y}`;
    waves.push(<Path key={i} d={d} stroke="#2EC4B6" strokeWidth={1.4} fill="none" opacity={0.25 + i * 0.08} />);
  }
  return (
    <>
      <Rect width={200} height={200} fill="#011627" />
      {waves}
      <Text x={14} y={26} fontSize={9} fontWeight="700" letterSpacing={3} fill="#2EC4B6" fontFamily={SANS}>
        JUNO REYES
      </Text>
      <Text x={14} y={186} fontSize={20} fontWeight="700" letterSpacing={-0.4} fill="#CBF3F0" fontFamily={SANS}>
        Saltwater Hymns
      </Text>
    </>
  );
}

function GoldenRatio() {
  return (
    <>
      <Rect width={200} height={200} fill="#2E210E" />
      <G stroke="#E0A526" strokeWidth={1.2} fill="none">
        <Rect x={24} y={44} width={152} height={94} />
        <Line x1={118} y1={44} x2={118} y2={138} />
        <Line x1={118} y1={102} x2={176} y2={102} />
        <Line x1={154} y1={102} x2={154} y2={138} />
        <Line x1={118} y1={124} x2={154} y2={124} />
      </G>
      <Path d="M118 138A94 94 0 0 1 24 44M118 44A58 58 0 0 1 176 102M176 102A36 36 0 0 1 140 138" stroke="#FFE29A" strokeWidth={2} fill="none" />
      <Text x={24} y={170} fontSize={16} fontWeight="800" letterSpacing={5} fill="#FFE29A" fontFamily={SANS}>
        GOLDEN RATIO
      </Text>
      <Text x={24} y={186} fontSize={9} fontStyle="italic" fill="#E0A526" fontFamily={SERIF}>
        Theo Marsh
      </Text>
    </>
  );
}

function NeonOrchard() {
  return (
    <>
      <Rect width={200} height={200} fill="#1B1B2F" />
      <Path d="M20 170 92 36 164 170Z" fill="#B8F230" />
      <Path d="M70 170 132 64 194 170Z" fill="#FF2E93" opacity={0.92} />
      <Path d="M132 64 164 120 108 120Z" fill="#4DE1C1" opacity={0.85} />
      <Text x={14} y={24} fontSize={13} fontWeight="900" letterSpacing={0.5} fill="#FFFFFF" fontFamily={SANS}>
        NEON ORCHARD
      </Text>
      <Text x={14} y={190} fontSize={8} fontWeight="700" letterSpacing={2.4} fill="#B8F230" fontFamily={SANS}>
        PIXEL CHOIR
      </Text>
    </>
  );
}

function PaperSatellites() {
  return (
    <>
      <Rect width={200} height={200} fill="#F4ECD8" />
      {[86, 70, 54].map((r) => (
        <Circle key={r} cx={100} cy={92} r={r} fill="none" stroke="#247BA0" strokeWidth={1} opacity={0.6} />
      ))}
      <Circle cx={100} cy={92} r={28} fill="#F25F5C" />
      <Path d="M58 104c18 10 66 4 86-18" stroke="#FFE066" strokeWidth={6} fill="none" strokeLinecap="round" />
      <Circle cx={162} cy={52} r={4} fill="#247BA0" />
      <Circle cx={44} cy={138} r={3} fill="#247BA0" />
      <Text x={100} y={178} fontSize={17} fontStyle="italic" textAnchor="middle" fill="#1C3E57" fontFamily={SERIF}>
        Paper Satellites
      </Text>
      <Text x={100} y={192} fontSize={8} fontWeight="700" letterSpacing={2.2} textAnchor="middle" fill="#247BA0" fontFamily={SANS}>
        WREN ITO
      </Text>
    </>
  );
}

function QuietFires() {
  const id = useIds();
  const pines = [[12, 46], [34, 60], [58, 42], [146, 52], [168, 64], [190, 44]];
  return (
    <>
      <Defs>
        <LinearGradient id={id('dusk')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#14130F" />
          <Stop offset="0.62" stopColor="#5A2A0E" />
          <Stop offset="0.86" stopColor="#FF7F11" />
          <Stop offset="1" stopColor="#FFB563" />
        </LinearGradient>
        <RadialGradient id={id('fire')} cx="100" cy="176" r="46" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFD08A" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#FF7F11" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={200} height={200} fill={`url(#${id('dusk')})`} />
      <Circle cx={100} cy={176} r={46} fill={`url(#${id('fire')})`} />
      {pines.map(([x, h], i) => (
        <Path key={i} d={`M${x} ${200 - h - 30}L${x + 16} 200H${x - 16}Z`} fill="#0E110F" />
      ))}
      <Text x={100} y={34} fontSize={15} fontWeight="800" letterSpacing={6} textAnchor="middle" fill="#FFB563" fontFamily={SANS}>
        QUIET FIRES
      </Text>
      <Text x={100} y={50} fontSize={8} fontWeight="600" letterSpacing={2} textAnchor="middle" fill="#C98B55" fontFamily={SANS}>
        HOLLOW PINES
      </Text>
    </>
  );
}

function GlassWeather() {
  return (
    <>
      <Rect width={200} height={200} fill="#EAF6FF" />
      <Rect x={34} y={40} width={96} height={96} rx={22} fill="#7BDFF2" opacity={0.75} transform="rotate(-12 82 88)" />
      <Rect x={70} y={62} width={96} height={96} rx={22} fill="#B2A4F7" opacity={0.6} transform="rotate(8 118 110)" />
      <Rect x={52} y={86} width={80} height={80} rx={20} fill="#F7D6E0" opacity={0.8} transform="rotate(-4 92 126)" />
      <Text x={14} y={24} fontSize={13} fontWeight="300" letterSpacing={2} fill="#30506B" fontFamily={SANS}>
        glass weather
      </Text>
      <Text x={186} y={190} fontSize={8} fontWeight="700" letterSpacing={2.2} textAnchor="end" fill="#30506B" fontFamily={SANS}>
        MIRA SOLACE
      </Text>
    </>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  'night-garden': NightGarden,
  'citrus-hours': CitrusHours,
  'low-tide': LowTide,
  ember: EmberTheory,
  polar: PolarStatic,
  velvet: VelvetHours,
  saltwater: SaltwaterHymns,
  golden: GoldenRatio,
  neon: NeonOrchard,
  paper: PaperSatellites,
  fires: QuietFires,
  glass: GlassWeather,
};

/** An album's cover, drawn to fill a square of `size`. */
export const AlbumCover = memo(function AlbumCover({ album, size }: { album: Album; size: number }) {
  const Art = ART[album.key];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Art />
    </Svg>
  );
});
