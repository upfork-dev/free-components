import { Canvas, ColorMatrix, Image as SkiaImage, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Image, PixelRatio, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ArcPicker } from '../components/arc-picker';
import { renderFrame, renderScene, renderThumbnails } from '../lib/camera-scene';
import { FILTERS, FILTER_MATRICES, blendFilters } from '../lib/filters';
import type { Scheme } from '../lib/use-scheme';

const ITEM = 64;
const START = 1; // Vivid
const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as unknown as ViewStyle) : null;

const UI = {
  dark: { icon: '#FFFFFF', pill: 'rgba(10, 10, 14, 0.34)', pillLine: 'rgba(255, 255, 255, 0.14)', tray: null, text: '#FFFFFF' },
  light: { icon: '#16161E', pill: 'rgba(255, 255, 255, 0.86)', pillLine: 'rgba(22, 22, 30, 0.08)', tray: 'rgba(248, 247, 244, 0.94)', text: '#16161E' },
} as const;

type Flash = 'off' | 'auto' | 'on';
const NEXT_FLASH: Record<Flash, Flash> = { off: 'auto', auto: 'on', on: 'off' };
const TIMERS = [0, 3, 10];
const RATIOS = ['4:3', '16:9', '1:1'];

/** A camera: the dial of filters at the bottom blends the viewfinder live as it turns; its ring is the shutter. */
function CameraScreen({ scheme = 'dark' }: { scheme?: Scheme }) {
  const ui = UI[scheme];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [scene, setScene] = useState<SkImage | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [index, setIndex] = useState(START);
  const [flash, setFlash] = useState<Flash>('auto');
  const [timer, setTimer] = useState(0);
  const [ratio, setRatio] = useState(0);
  const [gallery, setGallery] = useState<string | null>(null);
  const [flying, setFlying] = useState<string | null>(null);
  const [dialHeight, setDialHeight] = useState(0);

  // The scene is drawn once; only the filter changes from frame to frame.
  useEffect(() => {
    const ratioPx = PixelRatio.get();
    const image = renderScene(Math.round(width * ratioPx), Math.round(height * ratioPx));
    if (!image) return;
    setScene(image);
    const shots = renderThumbnails(image, FILTER_MATRICES, Math.round(ITEM * 1.28 * ratioPx));
    setThumbs(shots);
    setGallery(shots[0] ?? null);
    // Drawn once for its size; a resize just scales it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useSharedValue(START);
  const matrix = useDerivedValue(() => blendFilters(FILTER_MATRICES, progress.value));

  // The shutter: a white flash, then the frame shrinks into the gallery chip.
  const flashOpacity = useSharedValue(0);
  const fly = useSharedValue(0);
  const rowBottom = insets.bottom + 18;
  const chip = { left: 24, top: height - rowBottom - 48 + 1, size: 46 };
  const land = useCallback((uri: string) => {
    setGallery(uri);
    setFlying(null);
  }, []);
  const shoot = useCallback(() => {
    if (!scene) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    flashOpacity.value = withSequence(withTiming(0.92, { duration: 50 }), withTiming(0, { duration: 340 }));
    const uri = renderFrame(scene, FILTERS[index].matrix, Math.round(width), Math.round(height));
    if (!uri) return;
    setFlying(uri);
    fly.value = 0;
    // The flash peaks first, then the photo shrinks away into the gallery.
    fly.value = withDelay(
      90,
      withTiming(1, { duration: 640, easing: Easing.bezier(0.32, 0.72, 0, 1) }, (finished) => {
        if (finished) scheduleOnRN(land, uri);
      }),
    );
  }, [scene, index, width, height, flashOpacity, fly, land]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const flyStyle = useAnimatedStyle(() => {
    const t = fly.value;
    return {
      left: interpolate(t, [0, 1], [0, chip.left]),
      top: interpolate(t, [0, 1], [0, chip.top]),
      width: interpolate(t, [0, 1], [width, chip.size]),
      height: interpolate(t, [0, 1], [height, chip.size]),
      borderRadius: interpolate(t, [0, 1], [0, 12]),
      borderWidth: interpolate(t, [0, 0.6, 1], [0, 1, 2]),
    };
  });

  return (
    <View style={styles.page}>
      <Canvas style={StyleSheet.absoluteFill}>
        {scene ? (
          <SkiaImage image={scene} x={0} y={0} width={width} height={height} fit="cover">
            <ColorMatrix matrix={matrix} />
          </SkiaImage>
        ) : null}
      </Canvas>

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <RoundButton label={`Flash ${flash}`} ui={ui} onPress={() => setFlash((f) => NEXT_FLASH[f])}>
          <FlashIcon mode={flash} color={ui.icon} />
        </RoundButton>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Aspect ratio ${RATIOS[ratio]}`}
          onPress={() => setRatio((r) => (r + 1) % RATIOS.length)}
          style={[styles.pill, { backgroundColor: ui.pill, borderColor: ui.pillLine }, webPointer]}>
          <Text style={[styles.pillText, { color: ui.text }]}>{RATIOS[ratio]}</Text>
        </Pressable>
        <RoundButton
          label={timer ? `Timer ${timer} seconds` : 'Timer off'}
          ui={ui}
          onPress={() => setTimer((t) => TIMERS[(TIMERS.indexOf(t) + 1) % TIMERS.length])}>
          <TimerIcon color={ui.icon} />
          {timer ? <Text style={[styles.timerText, { color: ui.text }]}>{timer}</Text> : null}
        </RoundButton>
      </View>

      {ui.tray ? (
        <View
          pointerEvents="none"
          style={[styles.tray, { height: rowBottom + 54 + dialHeight + 10, backgroundColor: ui.tray }]}
        />
      ) : null}

      <View
        onLayout={(e) => setDialHeight(Math.round(e.nativeEvent.layout.height))}
        style={[styles.dial, { bottom: rowBottom + 54 }]}>
        <ArcPicker
          data={FILTERS}
          keyExtractor={(f) => f.key}
          getLabel={(f) => f.name}
          accessibilityLabel="Filter"
          accessibilityLabelForItem={(f) => f.name}
          defaultIndex={START}
          loop
          progress={progress}
          onChange={setIndex}
          itemSize={ITEM}
          scheme={scheme}
          onPressSelected={shoot}
          accessibilityHint="Double-tap to take a photo"
          renderCenter={({ pressed }) => <ShutterFace pressed={pressed} />}
          renderItem={({ index: i }) =>
            thumbs[i] ? (
              <Image source={{ uri: thumbs[i] }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbWaiting]} />
            )
          }
        />
      </View>

      <View style={[styles.row, { bottom: rowBottom }]}>
        <View style={[styles.gallery, { borderColor: scheme === 'dark' ? '#FFFFFF' : '#16161E' }]}>
          {gallery ? <Image source={{ uri: gallery }} style={styles.galleryImage} accessibilityLabel="Last photo" /> : null}
        </View>
        <Text style={[styles.mode, { color: ui.text }]}>PHOTO</Text>
        <FlipButton ui={ui} />
      </View>

      {flying ? (
        <Animated.View pointerEvents="none" style={[styles.flying, flyStyle]}>
          <Image source={{ uri: flying }} style={styles.galleryImage} />
        </Animated.View>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
}

/** The shutter's face inside the ring: a white disc that lights up while the ring is pressed. */
function ShutterFace({ pressed }: { pressed: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: pressed.value * 0.34, transform: [{ scale: 0.86 + 0.08 * pressed.value }] }));
  return <Animated.View style={[styles.shutter, style]} />;
}

function RoundButton({
  label,
  ui,
  onPress,
  children,
}: {
  label: string;
  ui: (typeof UI)[Scheme];
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: ui.pill, borderColor: ui.pillLine, opacity: pressed ? 0.75 : 1 },
        webPointer,
      ]}>
      {children}
    </Pressable>
  );
}

function FlipButton({ ui }: { ui: (typeof UI)[Scheme] }) {
  const turn = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Switch camera"
      onPress={() => {
        turn.value = withTiming(Math.round(turn.value) + 1, { duration: 420, easing: Easing.bezier(0.3, 0.7, 0.2, 1) });
      }}
      style={[styles.round, styles.flip, { backgroundColor: ui.pill, borderColor: ui.pillLine }, webPointer]}>
      <Animated.View style={style}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4.5 10a7.6 7.6 0 0 1 13.4-3.6M19.5 14a7.6 7.6 0 0 1-13.4 3.6" stroke={ui.icon} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M18.6 3.2v3.6H15M5.4 20.8v-3.6H9" stroke={ui.icon} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

function FlashIcon({ mode, color }: { mode: Flash; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.2 2.8 5.6 13.1a.6.6 0 0 0 .5 1H11l-1.1 7.1 7.6-10.3a.6.6 0 0 0-.5-1H12l1.2-7.1Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
        fill={mode === 'on' ? color : 'none'}
      />
      {mode === 'off' ? <Path d="M4 4l16 16" stroke={color} strokeWidth={1.7} strokeLinecap="round" /> : null}
      {mode === 'auto' ? <Circle cx={19.2} cy={5.2} r={2.2} fill={color} /> : null}
    </Svg>
  );
}

function TimerIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13.5} r={7.5} stroke={color} strokeWidth={1.7} />
      <Path d="M12 9.5v4l2.6 1.6M9.5 2.8h5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Rect x={18.2} y={5.1} width={2.6} height={1.7} rx={0.85} transform="rotate(42 19.5 6)" fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07070A' },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: {
    height: 44,
    minWidth: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 11,
  },
  pill: { height: 34, borderRadius: 17, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  pillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  timerText: { fontSize: 13, fontWeight: '700' },
  tray: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(22, 22, 30, 0.08)',
  },
  dial: { position: 'absolute', left: 0, right: 0 },
  thumb: { width: '100%', height: '100%' },
  thumbWaiting: { backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  row: { position: 'absolute', left: 24, right: 24, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gallery: { width: 46, height: 46, borderRadius: 12, borderWidth: 2, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  galleryImage: { width: '100%', height: '100%' },
  mode: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
  flip: { width: 46, height: 46, borderRadius: 23, paddingHorizontal: 0 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF' },
  flying: { position: 'absolute', overflow: 'hidden', borderColor: '#FFFFFF' },
  flash: { backgroundColor: '#FFFFFF' },
});

/** The demo with a safe-area provider of its own, so it runs anywhere (UpFork's preview gives it none). */
export default function Camera({ scheme }: { scheme?: Scheme }) {
  return (
    <SafeAreaProvider>
      <CameraScreen scheme={scheme} />
    </SafeAreaProvider>
  );
}
