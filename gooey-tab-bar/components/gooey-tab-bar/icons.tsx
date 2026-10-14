import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type GooeyIconProps = { color: string; size: number; focused: boolean };
export type GooeyIcon = (props: GooeyIconProps) => ReactNode;

const STROKE = 1.75;

/** An icon drawn on a 24 px grid: outlined, or filled when focused. */
function make(outline: (color: string) => ReactNode, solid?: (color: string) => ReactNode): GooeyIcon {
  return function Icon({ color, size, focused }: GooeyIconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {focused && solid ? solid(color) : outline(color)}
      </Svg>
    );
  };
}

const line = { strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Ten outlined-and-filled icons that come with the tab bar. Any `{ color, size, focused }` component works too. */
export const GooeyIcons = {
  home: make(
    (c) => <Path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.6Z" stroke={c} {...line} />,
    (c) => <Path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5h-6v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.6Z" fill={c} stroke={c} {...line} />,
  ),
  search: make(
    (c) => (
      <>
        <Circle cx={10.8} cy={10.8} r={6.3} stroke={c} {...line} />
        <Path d="m15.6 15.6 4.4 4.4" stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Circle cx={10.8} cy={10.8} r={6.3} stroke={c} {...line} strokeWidth={2.6} />
        <Path d="m15.6 15.6 4.4 4.4" stroke={c} {...line} strokeWidth={2.8} />
      </>
    ),
  ),
  compass: make(
    (c) => (
      <>
        <Circle cx={12} cy={12} r={8.5} stroke={c} {...line} />
        <Path d="m15.4 8.6-2.1 5-4.7 1.8 2.1-5 4.7-1.8Z" stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Circle cx={12} cy={12} r={8.5} stroke={c} {...line} strokeWidth={2.2} />
        <Path d="m15.4 8.6-2.1 5-4.7 1.8 2.1-5 4.7-1.8Z" fill={c} stroke={c} {...line} />
      </>
    ),
  ),
  bag: make(
    (c) => (
      <>
        <Path d="M5.5 8.5h13l-.9 10.7a1.5 1.5 0 0 1-1.5 1.3H7.9a1.5 1.5 0 0 1-1.5-1.3L5.5 8.5Z" stroke={c} {...line} />
        <Path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Path d="M5.5 8.5h13l-.9 10.7a1.5 1.5 0 0 1-1.5 1.3H7.9a1.5 1.5 0 0 1-1.5-1.3L5.5 8.5Z" fill={c} stroke={c} {...line} />
        <Path d="M9 9V7a3 3 0 0 1 6 0v2" stroke={c} {...line} />
      </>
    ),
  ),
  heart: make(
    (c) => <Path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" stroke={c} {...line} />,
    (c) => <Path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" fill={c} stroke={c} {...line} />,
  ),
  chat: make(
    (c) => <Path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6V16h0A1.8 1.8 0 0 1 5 14.2V6.5Z" stroke={c} {...line} />,
    (c) => <Path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6V16h0A1.8 1.8 0 0 1 5 14.2V6.5Z" fill={c} stroke={c} {...line} />,
  ),
  bell: make(
    (c) => (
      <>
        <Path d="M6.5 16.5v-5.2a5.5 5.5 0 0 1 11 0v5.2l1.5 1.5H5l1.5-1.5Z" stroke={c} {...line} />
        <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Path d="M6.5 16.5v-5.2a5.5 5.5 0 0 1 11 0v5.2l1.5 1.5H5l1.5-1.5Z" fill={c} stroke={c} {...line} />
        <Path d="M10 20.5a2.2 2.2 0 0 0 4 0" stroke={c} {...line} />
      </>
    ),
  ),
  user: make(
    (c) => (
      <>
        <Circle cx={12} cy={8.5} r={3.8} stroke={c} {...line} />
        <Path d="M4.8 19.6a7.4 7.4 0 0 1 14.4 0" stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Circle cx={12} cy={8.5} r={3.8} fill={c} stroke={c} {...line} />
        <Path d="M4.8 19.6a7.4 7.4 0 0 1 14.4 0Z" fill={c} stroke={c} {...line} />
      </>
    ),
  ),
  chart: make(
    (c) => (
      <>
        <Path d="M4.5 19.5h15" stroke={c} {...line} />
        <Rect x={6} y={11} width={3} height={6} rx={1} stroke={c} {...line} />
        <Rect x={10.5} y={6.5} width={3} height={10.5} rx={1} stroke={c} {...line} />
        <Rect x={15} y={9} width={3} height={8} rx={1} stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Path d="M4.5 19.5h15" stroke={c} {...line} />
        <Rect x={6} y={11} width={3} height={6} rx={1} fill={c} stroke={c} {...line} />
        <Rect x={10.5} y={6.5} width={3} height={10.5} rx={1} fill={c} stroke={c} {...line} />
        <Rect x={15} y={9} width={3} height={8} rx={1} fill={c} stroke={c} {...line} />
      </>
    ),
  ),
  settings: make(
    (c) => (
      <>
        <Path d="M10.3 4.3h3.4l.5 2.2 1.6.9 2.1-.7 1.7 2.9-1.6 1.6v1.6l1.6 1.6-1.7 2.9-2.1-.7-1.6.9-.5 2.2h-3.4l-.5-2.2-1.6-.9-2.1.7-1.7-2.9 1.6-1.6v-1.6L4.3 9.6 6 6.7l2.1.7 1.6-.9.6-2.2Z" stroke={c} {...line} />
        <Circle cx={12} cy={12} r={2.6} stroke={c} {...line} />
      </>
    ),
    (c) => (
      <>
        <Path
          d="M10.3 4.3h3.4l.5 2.2 1.6.9 2.1-.7 1.7 2.9-1.6 1.6v1.6l1.6 1.6-1.7 2.9-2.1-.7-1.6.9-.5 2.2h-3.4l-.5-2.2-1.6-.9-2.1.7-1.7-2.9 1.6-1.6v-1.6L4.3 9.6 6 6.7l2.1.7 1.6-.9.6-2.2ZM15.1 12a3.1 3.1 0 1 0-6.2 0 3.1 3.1 0 0 0 6.2 0Z"
          fill={c}
          fillRule="evenodd"
          stroke={c}
          {...line}
        />
      </>
    ),
  ),
} satisfies Record<string, GooeyIcon>;

/** The centre action's mark: a plus that turns into a close mark as the actions open. */
export function PlusIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
