import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import {
  I18nManager,
  Platform,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { clamp, trackedSpeed } from './layout';
import type { FilmItem, RenderImage } from './types';

export type FilmstripViewerProps<T extends FilmItem> = {
  data: readonly T[];
  /** The float index the viewer shows and sets: share it with a FilmstripStrip. */
  position: SharedValue<number>;
  renderImage: RenderImage<T>;
  /** How much the picture lags its page while paging (0–0.3). */
  parallax?: number;
  /** Double-tap (double-click) to zoom 2× about that point, then drag to look around. */
  zoom?: boolean;
  /** Space between two pages while paging, points. */
  pageGap?: number;
  /** `contain` (default): the whole picture, letterboxed. `cover`: fills the page, cropped. */
  fit?: 'contain' | 'cover';
  /** Called when a swipe settles on an item. */
  onIndexChange?: (index: number) => void;
  /** Turns on swipe-down-to-close; called once the picture has been flicked away. */
  onRequestClose?: () => void;
  /** Drawn over the current picture, inside its box (badges, a play button of your own). */
  renderOverlay?: (item: T, index: number) => ReactNode;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PAGE_SNAP = { stiffness: 260, damping: 30, mass: 1 };
const ZOOM_SPRING = { stiffness: 220, damping: 22, mass: 1 };
const ZOOM = 2;
const RUBBER = 0.3;
const CAN_BUZZ = Platform.OS !== 'web';
const webGrab = Platform.OS === 'web' ? ({ cursor: 'grab', outlineStyle: 'none' } as unknown as ViewStyle) : null;

/** The picture's box inside a page, keeping its shape: as big as fits, or just big enough to fill. */
function fitBox(item: FilmItem, w: number, h: number, fit: 'contain' | 'cover') {
  const aspect = item.width > 0 && item.height > 0 ? item.width / item.height : 1;
  const wider = aspect > w / h;
  if (fit === 'cover') return wider ? { width: h * aspect, height: h } : { width: w, height: w / aspect };
  return wider ? { width: w, height: w / aspect } : { width: h * aspect, height: h };
}

/**
 * The big viewer: a pager of whole pictures, each fitted to the space with a soft vignette inside
 * the picture. Swipe between them (with a parallax), double-tap to zoom, swipe down to close.
 */
export function FilmstripViewer<T extends FilmItem>({
  data,
  position,
  renderImage,
  parallax = 0.12,
  zoom = true,
  pageGap = 16,
  fit = 'contain',
  onIndexChange,
  onRequestClose,
  renderOverlay,
  haptics = true,
  style,
}: FilmstripViewerProps<T>) {
  const reduceMotion = useReducedMotion();
  const n = data.length;
  const last = Math.max(0, n - 1);
  const dir = I18nManager.isRTL ? -1 : 1;
  const lag = reduceMotion ? 0 : clamp(parallax, 0, 0.3);
  const closable = !!onRequestClose;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const pageW = useSharedValue(0);
  const pageH = useSharedValue(0);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    pageW.value = width;
    pageH.value = height;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };

  const [center, setCenter] = useState(() => Math.round(clamp(position.value, 0, last)));
  useAnimatedReaction(
    () => Math.round(position.value),
    (now, before) => {
      if (now !== before) scheduleOnRN(setCenter, Math.min(Math.max(now, 0), last));
    },
    [last],
  );

  // Zoom belongs to one page at a time.
  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const zoomed = useSharedValue(-1);
  const box = useSharedValue({ width: 0, height: 0 });
  const dismiss = useSharedValue(0);

  const mode = useSharedValue(0); // 0 undecided, 1 paging, 2 closing, 3 looking around a zoomed picture
  const startPos = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startPanX = useSharedValue(0);
  const startPanY = useSharedValue(0);
  const samples = useSharedValue<number[]>([]);
  const lastMove = useSharedValue(0);

  const settled = useCallback(
    (index: number) => {
      if (CAN_BUZZ && haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      onIndexChange?.(index);
    },
    [haptics, onIndexChange],
  );
  const close = useCallback(() => onRequestClose?.(), [onRequestClose]);

  const unzoom = (animated: boolean) => {
    'worklet';
    if (animated) {
      scale.value = withSpring(1, ZOOM_SPRING);
      panX.value = withSpring(0, ZOOM_SPRING);
      panY.value = withSpring(0, ZOOM_SPRING);
    } else {
      cancelAnimation(scale);
      cancelAnimation(panX);
      cancelAnimation(panY);
      scale.value = 1;
      panX.value = 0;
      panY.value = 0;
    }
  };

  const springTo = (target: number, velocity = 0) => {
    'worklet';
    const done = (finished?: boolean) => {
      'worklet';
      if (!finished) return;
      if (zoomed.value !== target) unzoom(false);
      scheduleOnRN(settled, target);
    };
    position.value = reduceMotion
      ? withTiming(target, { duration: 160 }, done)
      : withSpring(target, { ...PAGE_SNAP, velocity }, done);
  };

  /** Where the zoomed picture may go: so its edges never come inside the page (or it stays centred). */
  const panLimit = (s: number) => {
    'worklet';
    return {
      x: Math.max(0, (box.value.width * s - pageW.value) / 2),
      y: Math.max(0, (box.value.height * s - pageH.value) / 2),
    };
  };

  const zoomAt = (x: number, y: number) => {
    'worklet';
    if (!zoom) return;
    if (scale.value > 1.01) {
      unzoom(true);
      return;
    }
    zoomed.value = Math.round(position.value);
    const limit = panLimit(ZOOM);
    // The point under the finger stays put: pan = focus × (1 − scale), within the limits.
    const fx = x - pageW.value / 2;
    const fy = y - pageH.value / 2;
    scale.value = withSpring(ZOOM, ZOOM_SPRING);
    panX.value = withSpring(clamp(fx * (1 - ZOOM), -limit.x, limit.x), ZOOM_SPRING);
    panY.value = withSpring(clamp(fy * (1 - ZOOM), -limit.y, limit.y), ZOOM_SPRING);
  };

  const pan = Gesture.Pan()
    .minDistance(6)
    .onBegin((event) => {
      startX.value = event.absoluteX;
      startY.value = event.absoluteY;
      startPos.value = position.value;
      startPanX.value = panX.value;
      startPanY.value = panY.value;
      samples.value = [event.absoluteX, Date.now()];
      lastMove.value = Date.now();
      mode.value = 0;
    })
    .onStart((event) => {
      const dx = event.absoluteX - startX.value;
      const dy = event.absoluteY - startY.value;
      if (scale.value > 1.01) mode.value = 3;
      else if (closable && dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2) mode.value = 2;
      else if (n > 1) mode.value = 1;
      else mode.value = 0;
      if (mode.value === 1) {
        cancelAnimation(position);
        startPos.value = position.value;
      }
      if (mode.value === 3) {
        cancelAnimation(panX);
        cancelAnimation(panY);
        startPanX.value = panX.value;
        startPanY.value = panY.value;
      }
    })
    .onUpdate((event) => {
      const dx = event.absoluteX - startX.value;
      const dy = event.absoluteY - startY.value;
      lastMove.value = Date.now();
      samples.value = [...samples.value.slice(-10), event.absoluteX, Date.now()];
      if (mode.value === 1) {
        const raw = startPos.value - (dir * dx) / (pageW.value + pageGap);
        position.value = raw < 0 ? raw * RUBBER : raw > last ? last + (raw - last) * RUBBER : raw;
      } else if (mode.value === 2) {
        dismiss.value = dy > 0 ? dy : dy * 0.2;
      } else if (mode.value === 3) {
        const limit = panLimit(scale.value);
        panX.value = clamp(startPanX.value + dx, -limit.x, limit.x);
        panY.value = clamp(startPanY.value + dy, -limit.y, limit.y);
      }
    })
    .onEnd((event) => {
      if (mode.value === 1) {
        const resting = Date.now() - lastMove.value > 80;
        const speed = Math.abs(event.velocityX) > 1 ? event.velocityX : trackedSpeed(samples.value);
        const velocity = resting ? 0 : (-dir * speed) / (pageW.value + pageGap);
        const from = clamp(Math.round(startPos.value), 0, last);
        const moved = position.value - startPos.value;
        let target = from;
        if (moved > 0.35 || velocity > 0.6) target = from + 1;
        else if (moved < -0.35 || velocity < -0.6) target = from - 1;
        springTo(clamp(target, 0, last), velocity);
      } else if (mode.value === 2) {
        if (dismiss.value > 110 || event.velocityY > 800) {
          dismiss.value = withTiming(pageH.value, { duration: 200 }, (finished) => {
            if (finished) scheduleOnRN(close);
          });
        } else {
          dismiss.value = withSpring(0, PAGE_SNAP);
        }
      } else if (mode.value === 3) {
        const limit = panLimit(scale.value);
        panX.value = withDecay({ velocity: event.velocityX, clamp: [-limit.x, limit.x], deceleration: 0.994 });
        panY.value = withDecay({ velocity: event.velocityY, clamp: [-limit.y, limit.y], deceleration: 0.994 });
      }
    })
    .onFinalize((_, success) => {
      if (!success && mode.value === 0 && Math.abs(position.value - Math.round(position.value)) > 0.001) {
        springTo(clamp(Math.round(position.value), 0, last));
      }
    });

  const doubleTap = Gesture.Tap()
    .enabled(zoom)
    .numberOfTaps(2)
    .maxDelay(280)
    .onEnd((event, success) => {
      if (success) zoomAt(event.x, event.y);
    });

  const gesture = Gesture.Race(pan, doubleTap);

  const stepBy = (by: number) => {
    if (n < 2) return;
    unzoom(false);
    const target = clamp(Math.round(position.value) + by, 0, last);
    cancelAnimation(position);
    springTo(target);
  };
  const onKeyDown = (event: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const key = event.nativeEvent.key;
    if (key === (dir > 0 ? 'ArrowRight' : 'ArrowLeft')) stepBy(1);
    else if (key === (dir > 0 ? 'ArrowLeft' : 'ArrowRight')) stepBy(-1);
    else if (key === 'Escape' && scale.value > 1.01) unzoom(true);
    else if (key === 'Escape' && closable) close();
    else if (key === 'Enter' || key === ' ') zoomAt(pageW.value / 2, pageH.value / 2);
    else return;
    event.preventDefault?.();
  };
  const webProps = Platform.OS === 'web' ? ({ onKeyDown, focusable: true } as Record<string, unknown>) : {};

  const pages: number[] = [];
  if (size.width > 0) for (let i = Math.max(0, center - 1); i <= Math.min(last, center + 1); i++) pages.push(i);

  return (
    <GestureDetector gesture={gesture}>
      <View onLayout={onLayout} style={[styles.viewer, webGrab, style]} {...webProps}>
        {pages.map((i) => (
          <Page
            key={data[i].key}
            item={data[i]}
            index={i}
            current={i === center}
            size={size}
            position={position}
            pageW={pageW}
            pageGap={pageGap}
            dir={dir}
            lag={lag}
            scale={scale}
            panX={panX}
            panY={panY}
            zoomed={zoomed}
            box={box}
            dismiss={dismiss}
            zoomable={zoom}
            fit={fit}
            onZoomAction={() => zoomAt(pageW.value / 2, pageH.value / 2)}
            renderImage={renderImage}
            renderOverlay={renderOverlay}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

type PageProps<T extends FilmItem> = {
  item: T;
  index: number;
  current: boolean;
  size: { width: number; height: number };
  position: SharedValue<number>;
  pageW: SharedValue<number>;
  pageGap: number;
  dir: number;
  lag: number;
  scale: SharedValue<number>;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  zoomed: SharedValue<number>;
  box: SharedValue<{ width: number; height: number }>;
  dismiss: SharedValue<number>;
  zoomable: boolean;
  fit: 'contain' | 'cover';
  onZoomAction: () => void;
  renderImage: RenderImage<T>;
  renderOverlay?: (item: T, index: number) => ReactNode;
};

function Page<T extends FilmItem>({
  item,
  index,
  current,
  size,
  position,
  pageW,
  pageGap,
  dir,
  lag,
  scale,
  panX,
  panY,
  zoomed,
  box,
  dismiss,
  zoomable,
  fit: fitMode,
  onZoomAction,
  renderImage,
  renderOverlay,
}: PageProps<T>) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fit = fitBox(item, size.width, size.height, fitMode);
  useEffect(() => {
    if (current) box.value = { width: fit.width, height: fit.height };
  }, [current, fit.width, fit.height, box]);

  const page = useAnimatedStyle(() => {
    const off = index - position.value;
    const near = Math.abs(off) < 0.5;
    const pull = near ? dismiss.value : 0;
    const shrink = near ? 1 - 0.22 * Math.min(Math.max(pull, 0) / (pageW.value || 1), 1) : 1;
    return {
      transform: [{ translateX: dir * off * (pageW.value + pageGap) }, { translateY: pull }, { scale: shrink }],
    };
  });
  const picture = useAnimatedStyle(() => {
    const off = index - position.value;
    const mine = zoomed.value === index;
    return {
      transform: [
        // The picture lags its page a little while paging: a parallax between the two.
        { translateX: -dir * off * pageW.value * lag + (mine ? panX.value : 0) },
        { translateY: mine ? panY.value : 0 },
        { scale: mine ? scale.value : 1 },
      ],
    };
  });

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'zoom') onZoomAction();
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.page, page]} pointerEvents="box-none">
      <Animated.View
        accessible={current}
        accessibilityRole="image"
        accessibilityLabel={item.accessibilityLabel}
        accessibilityActions={current && zoomable ? [{ name: 'zoom', label: 'Zoom' }] : undefined}
        onAccessibilityAction={onAccessibilityAction}
        style={[{ width: fit.width, height: fit.height }, picture]}
      >
        {renderImage({ item, index, variant: 'viewer' })}
        {/* A soft vignette inside the picture only: nothing is painted outside it. */}
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={fit.width} height={fit.height}>
          <Defs>
            <RadialGradient id={`${id}v`} cx="50%" cy="50%" rx="72%" ry="72%">
              <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.3} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={fit.width} height={fit.height} fill={`url(#${id}v)`} />
        </Svg>
        {item.type === 'video' ? <PlayGlyph /> : null}
        {renderOverlay ? <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{renderOverlay(item, index)}</View> : null}
      </Animated.View>
    </Animated.View>
  );
}

/** A round play mark for video items (playing them is yours: there's no video package here). */
function PlayGlyph() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Svg width={68} height={68} viewBox="0 0 68 68">
        <Circle cx={34} cy={34} r={33} fill="rgba(0, 0, 0, 0.42)" stroke="rgba(255, 255, 255, 0.55)" strokeWidth={1.5} />
        <Path d="M28 22.5v23l19-11.5-19-11.5Z" fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, overflow: 'hidden' },
  page: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
