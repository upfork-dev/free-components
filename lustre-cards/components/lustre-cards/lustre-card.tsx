import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { useEffect, useId, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';

import { MATERIALS, resolveMaterial, type MaterialName, type MaterialParams } from './materials';

const FROST_PRINT = MATERIALS.frost;
import { MATERIAL_SHADER } from './shader';

export type CardMaterial = MaterialName | MaterialParams;

export type PaymentCard = {
  id: string;
  material: CardMaterial;
  holder: string;
  last4: string;
  /** "08/29" */
  expiry: string;
  cvv?: string;
  /** The issuer's wordmark, set on the card. */
  issuer?: string;
  /** A name for the card ("Titanium"), set small along its edge. */
  label?: string;
  frozen?: boolean;
};

type Value<T> = SharedValue<T> | DerivedValue<T>;

export type LustreCardProps = {
  card: PaymentCard;
  width: number;
  orientation?: 'portrait' | 'landscape';
  /** An extra turn, in radians: the carousel turns its cards as they move. */
  yaw?: Value<number>;
  /** The tilt, each axis from -1 to 1 (from a finger, the mouse or a sensor). */
  tilt?: Value<{ x: number; y: number }>;
  /** 0 shows the front, 1 the back. */
  flip?: Value<number>;
  /** Seconds, for the light's drift and the frost's sparkle. Leave it out for a still card. */
  time?: Value<number>;
  /** How bright the reflections are, 0 to 1 (the carousel dims the cards beside the one in focus). */
  shine?: Value<number>;
  /** Show the CVV on the back. */
  cvvVisible?: boolean;
  /** Called with true while someone presses and holds the CVV, false when they let go. */
  onRevealCvv?: (visible: boolean) => void;
  style?: ViewStyle;
};

export const CARD_RATIO = 1.586;

/** One payment card in a live material: the reflection follows the turn and the tilt, and it flips to its back. */
export function LustreCard({
  card,
  width,
  orientation = 'portrait',
  yaw,
  tilt,
  flip,
  time,
  shine,
  cvvVisible = false,
  onRevealCvv,
  style,
}: LustreCardProps) {
  const reduceMotion = useReducedMotion();
  const material = useMemo(() => resolveMaterial(card.material), [card.material]);
  const portrait = orientation === 'portrait';
  const height = Math.round(portrait ? width * CARD_RATIO : width / CARD_RATIO);
  const radius = Math.round(Math.min(width, height) * 0.075);

  const freeze = useSharedValue(card.frozen ? 1 : 0);
  useEffect(() => {
    freeze.value = withTiming(card.frozen ? 1 : 0, { duration: reduceMotion ? 0 : 760 });
  }, [card.frozen, freeze, reduceMotion]);

  const uniforms = useDerivedValue(() => {
    const t = tilt ? tilt.value : { x: 0, y: 0 };
    const flipped = flip ? flip.value : 0;
    return {
      size: [width, height],
      yaw: (yaw ? yaw.value : 0) + flipped * Math.PI * 0.6 + t.x * 0.28,
      tilt: [t.x, t.y],
      time: time ? time.value : 0,
      toneA: material.toneA,
      toneB: material.toneB,
      specular: material.specular,
      roughness: material.roughness,
      brush: material.brush,
      brushAngle: material.brushAngle,
      coat: material.coat,
      holo: material.holo,
      frost: material.frost,
      freeze: freeze.value,
      strength: shine ? shine.value : 1,
    };
  });

  const turn = useAnimatedStyle(() => {
    const t = tilt ? tilt.value : { x: 0, y: 0 };
    const flipped = flip ? flip.value : 0;
    return {
      transform: [
        { perspective: 900 },
        { rotateX: `${-t.y * 12}deg` },
        { rotateY: `${t.x * 12 + flipped * 180}deg` },
        // A little lift at the middle of the flip, as if picked up to turn.
        { scale: 1 + Math.sin(flipped * Math.PI) * 0.04 },
      ],
    };
  });
  // The faces swap exactly when the card is edge-on: never a blank or mirrored frame.
  const front = useAnimatedStyle(() => ({ opacity: Math.cos((flip ? flip.value : 0) * Math.PI) >= 0 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ opacity: Math.cos((flip ? flip.value : 0) * Math.PI) >= 0 ? 0 : 1 }));
  // The card darkens a touch as it turns edge-on, and its rim shows.
  const edgeShade = useAnimatedStyle(() => ({ opacity: (1 - Math.abs(Math.cos((flip ? flip.value : 0) * Math.PI))) * 0.45 }));
  const frozenBadge = useAnimatedStyle(() => ({ opacity: freeze.value, transform: [{ scale: 0.9 + freeze.value * 0.1 }] }));
  const frostPrint = useAnimatedStyle(() => ({ opacity: freeze.value }));

  // Type and marks are designed for a 232-wide portrait card and a 340-wide landscape one.
  const scale = portrait ? width / 232 : width / 340;
  return (
    <Animated.View style={[{ width, height }, style, turn]}>
      <View style={[styles.clip, { width, height, borderRadius: radius }]}>
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill>
            <Shader source={MATERIAL_SHADER} uniforms={uniforms} />
          </Fill>
        </Canvas>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, front]}>
          <Front card={card} material={material} scale={scale} portrait={portrait} yaw={yaw} tilt={tilt} />
          {/* Under frost the print turns frost-dark, fading in with the freeze, so it stays readable. */}
          {material.frost < 0.5 ? (
            <Animated.View style={[StyleSheet.absoluteFill, frostPrint]}>
              <Front card={card} material={FROST_PRINT} scale={scale} portrait={portrait} yaw={yaw} tilt={tilt} />
            </Animated.View>
          ) : null}
          <View style={[styles.frozenRow, { top: 54 * scale }]}>
            <Animated.View style={[styles.frozen, frozenBadge]}>
              <LockIcon size={12 * scale} color="#1F3B5C" />
              <Text style={[styles.frozenText, { fontSize: 11 * scale }]}>Frozen</Text>
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backFace, back]}>
          <Back card={card} material={card.frozen && material.frost < 0.5 ? FROST_PRINT : material} scale={scale} cvvVisible={cvvVisible} onRevealCvv={onRevealCvv} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, edgeShade]} />
        {/* A hairline rim: light on the top edge, shade on the bottom one. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rim, { borderRadius: radius }]} />
      </View>
    </Animated.View>
  );
}

function Front({
  card,
  material,
  scale,
  portrait,
  yaw,
  tilt,
}: {
  card: PaymentCard;
  material: MaterialParams;
  scale: number;
  portrait: boolean;
  yaw?: Value<number>;
  tilt?: Value<{ x: number; y: number }>;
}) {
  const pad = 18 * scale;
  // The embossed digits catch the light from the side it falls on.
  const lit = useAnimatedStyle(() => {
    const t = tilt ? tilt.value : { x: 0, y: 0 };
    const side = Math.max(-1, Math.min(1, -Math.sin(yaw ? yaw.value : 0) * 1.4 + t.x));
    return { opacity: 0.55 + 0.45 * Math.max(0, -side) };
  });
  const shaded = useAnimatedStyle(() => {
    const t = tilt ? tilt.value : { x: 0, y: 0 };
    const side = Math.max(-1, Math.min(1, -Math.sin(yaw ? yaw.value : 0) * 1.4 + t.x));
    return { opacity: 0.55 + 0.45 * Math.max(0, side) };
  });
  const number = `•••• ${card.last4}`;
  const railLength = 120 * scale;
  const numberStyle = { fontSize: (portrait ? 17 : 19) * scale, letterSpacing: 2.2 * scale };
  return (
    <View style={[StyleSheet.absoluteFill, { padding: pad }]}>
      <View style={styles.topRow}>
        <Text style={[styles.issuer, { color: material.ink, fontSize: 19 * scale }]}>{card.issuer ?? 'aurel'}</Text>
        <Contactless size={22 * scale} color={material.ink} />
      </View>
      <View style={{ marginTop: (portrait ? 26 : 12) * scale }}>
        <Chip scale={scale} />
      </View>
      <View style={styles.fill} />
      <View>
        <View>
          <Animated.Text style={[styles.number, numberStyle, { color: material.inkLight, position: 'absolute', left: -0.7, top: -0.7 }, lit]}>
            {number}
          </Animated.Text>
          <Animated.Text style={[styles.number, numberStyle, { color: material.inkShade, position: 'absolute', left: 0.8, top: 0.8 }, shaded]}>
            {number}
          </Animated.Text>
          <Text style={[styles.number, numberStyle, { color: material.ink }]}>{number}</Text>
        </View>
        <View style={[styles.bottomRow, { marginTop: 10 * scale }]}>
          <View>
            <Text style={[styles.small, { color: material.ink, fontSize: 10 * scale }]}>{card.holder.toUpperCase()}</Text>
            <Text style={[styles.small, { color: material.ink, fontSize: 10 * scale, opacity: 0.75, marginTop: 2 * scale }]}>
              {card.expiry}
            </Text>
          </View>
          <NetworkMark size={30 * scale} color={material.ink} />
        </View>
      </View>
      {card.label ? (
        // The card's name, set small along its right edge.
        <View
          pointerEvents="none"
          style={[
            styles.labelRail,
            { width: railLength, height: 14 * scale, right: 7 * scale - railLength / 2, top: '50%', marginTop: -7 * scale - 20 * scale },
          ]}>
          <Text numberOfLines={1} style={[styles.label, { color: material.ink, fontSize: 8.5 * scale }]}>
            {card.label.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Back({
  card,
  material,
  scale,
  cvvVisible,
  onRevealCvv,
}: {
  card: PaymentCard;
  material: MaterialParams;
  scale: number;
  cvvVisible: boolean;
  onRevealCvv?: (visible: boolean) => void;
}) {
  const [held, setHeld] = useState(false);
  const shown = cvvVisible || held;
  const digits = card.cvv ?? '•••';
  const reveal = useAnimatedStyle(() => ({ opacity: withTiming(shown ? 1 : 0, { duration: 180 }) }), [shown]);
  const dots = useAnimatedStyle(() => ({ opacity: withTiming(shown ? 0 : 1, { duration: 180 }) }), [shown]);
  return (
    <View style={[StyleSheet.absoluteFill, { paddingVertical: 20 * scale }]}>
      <View style={[styles.stripe, { height: 36 * scale, marginTop: 8 * scale }]} />
      <View style={{ paddingHorizontal: 18 * scale, marginTop: 18 * scale }}>
        <Text style={[styles.small, { color: material.ink, fontSize: 8 * scale, opacity: 0.7 }]}>AUTHORISED SIGNATURE</Text>
        <View style={[styles.signatureRow, { marginTop: 5 * scale, height: 34 * scale }]}>
          <View style={[styles.signature, { borderRadius: 4 * scale }]}>
            <SignatureLines />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown && card.cvv ? `Security code ${card.cvv.split('').join(' ')}` : 'Hold to show the security code'}
            onPressIn={() => {
              setHeld(true);
              onRevealCvv?.(true);
            }}
            onPressOut={() => {
              setHeld(false);
              onRevealCvv?.(false);
            }}
            style={[styles.cvv, { width: 58 * scale, borderRadius: 4 * scale }, webPointer]}>
            <Animated.Text style={[styles.cvvText, { fontSize: 15 * scale }, dots]}>•••</Animated.Text>
            <Animated.Text style={[styles.cvvText, styles.cvvDigits, { fontSize: 15 * scale }, reveal]}>{digits}</Animated.Text>
          </Pressable>
        </View>
        <Text style={[styles.small, { color: material.ink, fontSize: 9 * scale, marginTop: 6 * scale, textAlign: 'right', opacity: 0.75 }]}>
          {shown ? 'Security code' : 'Hold to reveal'}
        </Text>
      </View>
      <View style={styles.fill} />
      <View style={{ paddingHorizontal: 18 * scale }}>
        <Text style={[styles.small, { color: material.ink, fontSize: 9 * scale, opacity: 0.8 }]}>Lost or stolen? Freeze it in the app,</Text>
        <Text style={[styles.small, { color: material.ink, fontSize: 9 * scale, opacity: 0.8 }]}>or call +00 20 0000 4821 any time.</Text>
        <Text style={[styles.small, { color: material.ink, fontSize: 7.5 * scale, opacity: 0.55, marginTop: 8 * scale }]}>
          {(card.issuer ?? 'aurel').toUpperCase()} · CARD {card.last4} · VALID THRU {card.expiry}
        </Text>
      </View>
    </View>
  );
}

const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

function Chip({ scale }: { scale: number }) {
  const id = useId().replace(/:/g, '');
  const w = 40 * scale;
  const h = 30 * scale;
  return (
    <Svg width={w} height={h} viewBox="0 0 40 30">
      <Defs>
        <SvgGradient id={`chip${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F3DDA0" />
          <Stop offset="0.45" stopColor="#D4A85A" />
          <Stop offset="1" stopColor="#B0843C" />
        </SvgGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={39} height={29} rx={6} fill={`url(#chip${id})`} stroke="rgba(90, 60, 20, 0.45)" strokeWidth={0.8} />
      <Path d="M0.5 10h11M0.5 20h11M28.5 10h11M28.5 20h11M11.5 0.5v29M28.5 0.5v29M11.5 15h17" stroke="rgba(90, 60, 20, 0.5)" strokeWidth={0.9} fill="none" />
      <Rect x={15} y={6} width={10} height={18} rx={3} fill="none" stroke="rgba(90, 60, 20, 0.5)" strokeWidth={0.9} />
    </Svg>
  );
}

function Contactless({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {[4, 8, 12, 16].map((x, i) => (
        <Path key={i} d={`M${x} ${6 + i * 0.4}c${2 + i * 0.6} ${3.5} ${2 + i * 0.6} ${8.5 - i * 0.8} 0 ${12 - i * 0.8}`} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

/** An original mark: a ring, its orbit and a moon. Not any real card network's. */
function NetworkMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size * 1.4} height={size} viewBox="0 0 42 30" fill="none">
      <Circle cx={21} cy={15} r={9} stroke={color} strokeWidth={2.2} />
      <Ellipse cx={21} cy={15} rx={18} ry={6} stroke={color} strokeWidth={1.4} transform="rotate(-22 21 15)" />
      <Circle cx={35.5} cy={8.5} r={2.6} fill={color} />
    </Svg>
  );
}

function SignatureLines() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
      {Array.from({ length: 9 }, (_, i) => (
        <Path key={i} d={`M${i * 12 - 6} 30L${i * 12 + 14} 0`} stroke="rgba(120, 110, 100, 0.18)" strokeWidth={4} />
      ))}
      <Path d="M8 20c6-10 10 6 16-2s6-8 12 0 10 6 16-4" stroke="rgba(40, 50, 90, 0.7)" strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

function LockIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10.5} width={14} height={10} rx={2.5} fill={color} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth={2.4} />
    </Svg>
  );
}

export function cardHeight(width: number, orientation: 'portrait' | 'landscape' = 'portrait') {
  return Math.round(orientation === 'portrait' ? width * CARD_RATIO : width / CARD_RATIO);
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  issuer: { fontWeight: '800', letterSpacing: -0.6 },
  number: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  small: { fontWeight: '700', letterSpacing: 1.1 },
  labelRail: { position: 'absolute', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  label: { fontWeight: '800', letterSpacing: 2.4, textAlign: 'center', opacity: 0.7 },
  backFace: { transform: [{ rotateY: '180deg' }] },
  stripe: { backgroundColor: 'rgba(12, 12, 14, 0.86)' },
  signatureRow: { flexDirection: 'row', gap: 6 },
  signature: { flex: 1, backgroundColor: 'rgba(250, 248, 242, 0.92)', overflow: 'hidden' },
  cvv: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  cvvText: { color: '#1A1A22', fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 2 },
  cvvDigits: { position: 'absolute' },
  frozenRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  frozen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  frozenText: { color: '#1F3B5C', fontWeight: '800', letterSpacing: 0.4 },
  rim: {
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(0, 0, 0, 0.18)',
    borderBottomColor: 'rgba(0, 0, 0, 0.28)',
  },
});
