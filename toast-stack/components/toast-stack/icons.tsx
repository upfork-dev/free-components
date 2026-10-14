import Svg, { Circle, Path } from 'react-native-svg';

// The toasts' icons, drawn here: 24-unit boxes, 1.75 strokes. Any of them can go in a toast's `icon`.

type IconProps = { color: string; size?: number };

const stroke = { strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

export function CheckCircleIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.25} stroke={color} {...stroke} />
      <Path d="m8.2 12.3 2.6 2.6 5-5.3" stroke={color} {...stroke} />
    </Svg>
  );
}

export function XCircleIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.25} stroke={color} {...stroke} />
      <Path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" stroke={color} {...stroke} />
    </Svg>
  );
}

export function AlertTriangleIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10.3 4.2 2.9 17.3a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke={color} {...stroke} />
      <Path d="M12 9.5v4.2M12 16.9h.01" stroke={color} {...stroke} />
    </Svg>
  );
}

export function InfoIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9.25} stroke={color} {...stroke} />
      <Path d="M12 11v5.2M12 7.8h.01" stroke={color} {...stroke} />
    </Svg>
  );
}

export function UndoIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 14 4.5 9.5 9 5" stroke={color} {...stroke} />
      <Path d="M4.5 9.5h10a5 5 0 0 1 0 10H11" stroke={color} {...stroke} />
    </Svg>
  );
}

export function ArchiveIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 5.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2.5h-17V5.5Z" stroke={color} {...stroke} />
      <Path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" stroke={color} {...stroke} />
    </Svg>
  );
}

export function UploadIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" stroke={color} {...stroke} />
      <Path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" stroke={color} {...stroke} />
    </Svg>
  );
}

export function WifiOffIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m3.5 3.5 17 17" stroke={color} {...stroke} />
      <Path d="M8.6 13.2a5 5 0 0 1 4.4-1.3M5.2 9.8a10 10 0 0 1 3.5-2.1M12.5 6.1A10 10 0 0 1 18.8 9.8M16.3 12.4l-.4-.3M12 18.2h.01" stroke={color} {...stroke} />
    </Svg>
  );
}

export function CloseIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} {...stroke} strokeWidth={2} />
    </Svg>
  );
}
