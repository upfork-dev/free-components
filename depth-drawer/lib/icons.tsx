// The demos' icons, drawn for them on a 24-point grid with 1.75-point strokes.

import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size: number };
const s = { strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

export const AccountsIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 8.5h14.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18V6.5A2 2 0 0 1 6 4.5h10" stroke={color} {...s} />
    <Circle cx={16} cy={14} r={1.3} fill={color} />
  </Svg>
);

export const CardsIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={3.5} y={6} width={17} height={12} rx={2} stroke={color} {...s} />
    <Path d="M3.5 10h17M7 14.5h3" stroke={color} {...s} />
  </Svg>
);

export const PaymentsIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 9h13l-3.5-3.5M19 15H6l3.5 3.5" stroke={color} {...s} />
  </Svg>
);

export const InsightsIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4.5 19.5h15M7 16v-4M11 16V8M15 16v-6M19 16V5.5" stroke={color} {...s} />
  </Svg>
);

export const SettingsIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={3} stroke={color} {...s} />
    <Path
      d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"
      stroke={color}
      {...s}
    />
  </Svg>
);

export const HelpIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={8.5} stroke={color} {...s} />
    <Path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8h.01" stroke={color} {...s} />
  </Svg>
);

export const BellIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6.5 16.5V11a5.5 5.5 0 1 1 11 0v5.5l1.5 1.5h-14l1.5-1.5ZM10 20.5a2.2 2.2 0 0 0 4 0" stroke={color} {...s} />
  </Svg>
);

export const SendIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" stroke={color} {...s} strokeWidth={2} />
  </Svg>
);

export const RequestIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" stroke={color} {...s} strokeWidth={2} />
  </Svg>
);

export const TopUpIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M5 12h14" stroke={color} {...s} strokeWidth={2} />
  </Svg>
);

export const GridIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={4.5} y={4.5} width={6} height={6} rx={1.5} stroke={color} {...s} />
    <Rect x={13.5} y={4.5} width={6} height={6} rx={1.5} stroke={color} {...s} />
    <Rect x={4.5} y={13.5} width={6} height={6} rx={1.5} stroke={color} {...s} />
    <Rect x={13.5} y={13.5} width={6} height={6} rx={1.5} stroke={color} {...s} />
  </Svg>
);

export const LibraryIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 4.5v15M9.5 4.5v15M14 5l4.5 14" stroke={color} {...s} />
  </Svg>
);

export const PlaylistIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4.5 6.5h11M4.5 11h11M4.5 15.5h6" stroke={color} {...s} />
    <Circle cx={16.5} cy={17} r={2.2} stroke={color} {...s} />
    <Path d="M18.7 17V9.5l2 .8" stroke={color} {...s} />
  </Svg>
);

export const RadioIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={2} stroke={color} {...s} />
    <Path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" stroke={color} {...s} />
  </Svg>
);

export const DownloadIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 4.5v10.5M7.5 10.5 12 15l4.5-4.5M5 19.5h14" stroke={color} {...s} />
  </Svg>
);

export const FolderIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5Z" stroke={color} {...s} />
  </Svg>
);

export const NoteIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6.5 3.5h8l4 4v11a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" stroke={color} {...s} />
    <Path d="M14.5 3.5v4h4M8.5 12h7M8.5 15.5h5" stroke={color} {...s} />
  </Svg>
);

export const TrashIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5" stroke={color} {...s} />
  </Svg>
);

export const StarIcon = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4Z" stroke={color} {...s} />
  </Svg>
);

export const TagDot = ({ color, size }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={5} fill={color} />
  </Svg>
);
