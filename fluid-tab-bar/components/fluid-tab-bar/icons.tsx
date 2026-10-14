import Svg, { Circle, Path } from 'react-native-svg';

import type { FluidTabIconProps } from './fluid-tab-bar';

/*
 * Icons for the tabs: outlined, and filled when the tab is focused. Any component that takes
 * { color, size, focused } works as a tab's icon; these are here to start with.
 */

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

function Home({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.2H5.5A1.5 1.5 0 0 1 4 19z"
        fill={focused ? color : 'none'}
        {...stroke(color)}
      />
    </Svg>
  );
}

function Search({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={10.8} cy={10.8} r={6.3} fill="none" {...stroke(color)} strokeWidth={focused ? 2.6 : 1.9} />
      <Path d="m15.6 15.6 4.4 4.4" fill="none" {...stroke(color)} strokeWidth={focused ? 2.6 : 1.9} />
    </Svg>
  );
}

function Bell({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.2 16.8V11a5.8 5.8 0 0 1 11.6 0v5.8l1.5 1.7H4.7z"
        fill={focused ? color : 'none'}
        {...stroke(color)}
      />
      <Path d="M10 20.6a2.2 2.2 0 0 0 4 0" fill="none" {...stroke(color)} />
    </Svg>
  );
}

function Chat({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 4.2c4.6 0 8.3 3.1 8.3 7s-3.7 7-8.3 7c-1 0-2-.15-2.9-.42L5 19.6l1.1-3.6C4.8 14.7 3.7 13 3.7 11.2c0-3.9 3.7-7 8.3-7z"
        fill={focused ? color : 'none'}
        {...stroke(color)}
      />
    </Svg>
  );
}

function User({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.4} r={3.9} fill={focused ? color : 'none'} {...stroke(color)} />
      <Path
        d="M4.6 20.2c.8-3.6 3.8-5.6 7.4-5.6s6.6 2 7.4 5.6z"
        fill={focused ? color : 'none'}
        {...stroke(color)}
      />
    </Svg>
  );
}

function Compass({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.4} fill="none" {...stroke(color)} strokeWidth={focused ? 2.4 : 1.9} />
      <Path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z" fill={focused ? color : 'none'} {...stroke(color)} strokeWidth={1.6} />
    </Svg>
  );
}

function Bookmark({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 4.6h11v15.2L12 15.9l-5.5 3.9z" fill={focused ? color : 'none'} {...stroke(color)} />
    </Svg>
  );
}

function Ticket({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 7.2a1.4 1.4 0 0 1 1.4-1.4h13.2A1.4 1.4 0 0 1 20 7.2v2.4a2.4 2.4 0 0 0 0 4.8v2.4a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 16.8v-2.4a2.4 2.4 0 0 0 0-4.8z"
        fill={focused ? color : 'none'}
        {...stroke(color)}
      />
      <Path d="M14.2 6.6v1.6m0 2.8v1.9m0 2.8v1.6" fill="none" {...stroke(focused ? 'transparent' : color)} strokeWidth={1.6} />
    </Svg>
  );
}

function Heart({ color, size, focused }: FluidTabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 19.6s-7.6-4.4-7.6-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.6 2.6c0 5.6-7.6 10-7.6 10z"
        fill={focused ? color : 'none'}
        {...stroke(color)}
      />
    </Svg>
  );
}

/** Icons to start with, each outlined and filled: `icon: TabIcons.Home`. */
export const TabIcons = { Home, Search, Bell, Chat, User, Compass, Bookmark, Ticket, Heart };
