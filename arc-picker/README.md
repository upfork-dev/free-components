# Arc Picker

A curved dial carousel. Items ride a true circular arc, like the lens dial of a camera app, and the one under the
fixed ring is chosen. Turn it with a finger, a mouse drag or the mouse wheel: it has weight and momentum, it clicks
past each item, and it lands exactly under the ring. While it turns, it reports a fractional index, so the screen
above can blend between neighbouring choices live. Camera filters, avatars, moods, themes, stickers, lenses.

React Native (Expo SDK 57): Reanimated 4, Gesture Handler, `expo-haptics`. The component draws with plain views; the
camera demo's scene and filters use Skia, and the demos use `react-native-svg` and `react-native-safe-area-context`.

[Live preview on UpFork](https://upfork.dev/products/arc-picker-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/arc-picker/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

Your app needs Gesture Handler's root view (`GestureHandlerRootView`) at the top, as usual. Skia is only for the
camera demo: install `@shopify/react-native-skia` if you use `lib/camera-scene.ts` and `lib/filters.ts`.

## Use

```tsx
import { Image } from 'react-native';
import { ArcPicker } from './components/arc-picker';

const LENSES = [
  { id: 'wide', name: 'Wide', uri: '…' },
  { id: 'macro', name: 'Macro', uri: '…' },
  { id: 'portrait', name: 'Portrait', uri: '…' },
];

export function Lenses() {
  return (
    <ArcPicker
      data={LENSES}
      keyExtractor={(lens) => lens.id}
      getLabel={(lens) => lens.name}
      accessibilityLabel="Lens"
      accessibilityLabelForItem={(lens) => lens.name}
      onChange={(index) => console.log('Chosen', LENSES[index].name)}
      renderItem={({ item }) => <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} />}
    />
  );
}
```

The dial is as wide as its parent and sets its own height (the ring, the arc's drop and the label). Put it where it
goes; there's room built in for the ring's glow and the items' shadows, so nothing is clipped.

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `data` | required | The items. |
| `keyExtractor` | required | A stable key for each item. |
| `renderItem` | required | `({ item, index, active })`: the item's face. `active` is a shared value, 1 under the ring and 0 one place away. |
| `accessibilityLabelForItem` | required | The item's name for screen readers. |
| `getLabel` | | A label under the ring that slides and cross-fades as the dial turns. |
| `accessibilityLabel` | `'Picker'` | What the dial chooses: "Filter". |
| `accessibilityHint` | | What activating does, when there's `onPressSelected`. |
| `index` / `defaultIndex` | `0` | The chosen item, controlled or not. |
| `onChange` | | `(index)`, once the dial has settled on another item. |
| `onPressSelected` | | `(index)`, a tap on the item under the ring (or activating it with a screen reader). |
| `progress` | | A shared value you pass in, to follow the dial as a fractional index (0 to `length` with `loop`). |
| `itemSize` | `64` | The items' size. The ring is 1.25× it; the chosen item grows 1.28× into it. |
| `spacing` | `14` | The gap between items along the arc. |
| `radius` | 1.6 × width | The circle's radius. Smaller is a stronger curve. |
| `span` | `110` | How many degrees of the circle show items; past it they fade out. |
| `position` | `'bottom'` | `'bottom'`: the circle's centre is below, the ends fall away. `'top'`: it's above, the ends rise. |
| `orientation` | `'upright'` | `'tangent'` turns items along the arc. |
| `shape` | `'circle'` | `'rounded'` or `'none'`: how items are clipped (the ring follows). |
| `loop` | `false` | Turns without end, from the last item back to the first. Needs six items or more. |
| `renderCenter` | | `({ pressed })`: drawn inside the ring, over the chosen item (a shutter's face). `pressed` follows a finger on the ring. |
| `ringColor`, `labelColor` | the theme's | Colours of the ring and the label. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | A tick as each item passes the ring and a firmer one when it settles (phones only). |

`ref` gives `scrollToIndex(index, animated?)`.

## How it moves

- **One scroller.** Your finger, a mouse drag and the mouse wheel drive the same dial (one wheel notch is one item).
  A touch catches a spinning dial. A release keeps your speed, travels as a decelerating dial would (`withDecay`'s
  deceleration of 0.995), then springs onto the nearest item: a hard fling crosses many, a gentle one exactly one.
- **Detents.** The ring's stroke brightens for a moment as each item passes under it, with a haptic tick (no more
  than one every 45 ms, so a fast spin doesn't buzz), and a firmer tick when it settles.
- **Ends.** Without `loop`, the dial resists past the first and last items (a rubber band) and springs back.
- **Tap to select.** Tap any visible item and the dial turns to it.
- **Reduced motion.** No bounce: the dial snaps with a short timing. The detents stay.

## Live blend

`progress` follows the dial every frame, as a fractional index: 2.5 is halfway between items 2 and 3. Blend
anything with it on the UI thread:

```tsx
const progress = useSharedValue(0);
const backdrop = useAnimatedStyle(() => ({ backgroundColor: mixColors(COLORS, progress.value) }));

<ArcPicker progress={progress} … />
```

`lib/oklab.ts` mixes colours in OKLab, so a turn from teal to coral passes through clean colours, not grey (the
avatar and mood demos use it).

## The camera-filter recipe

The camera demo blends its viewfinder between two filters' colour matrices as you turn:

1. `lib/camera-scene.ts` draws the scene once, into an image, with a Skia shader. Each frame only the filter changes.
2. `lib/filters.ts` holds nine filters as colour matrices (20 numbers), built from saturation, contrast, gains,
   lift and sepia. `blendFilters(matrices, progress.value)` mixes the two around the dial's position.
3. The viewfinder draws the image with `<ColorMatrix matrix={matrix} />`, where `matrix` is a derived value.
4. The thumbnails are the scene's crop through each filter, rendered once offscreen and handed to `<Image>`.

With your own camera, apply the same blended matrix to the camera frames (a Skia frame processor, for instance).

## Accessibility

The dial is an adjustable control: "Filter, Vivid, 2 of 9". Swipe up and down (or the arrow keys on the web) to
move one item; the item is announced when the dial settles. With `onPressSelected`, activating the dial calls it.
The ring and the items are hidden from screen readers.

## Performance

The dial is one shared value. Every item's place, scale and fade derive from it on the UI thread; React renders
only when the chosen item changes (and, for long lists, when the mounted window moves: only the items near the ring
are mounted). Measured in Chrome on integrated graphics (Intel Iris Plus), in a production web build: 60 fps while
turning, in all three demos.

## Demos

- `demos/camera.tsx`: a camera. The viewfinder is a lakeside sunset drawn in Skia; the dial holds nine filters,
  each a thumbnail of the scene through it, and the viewfinder blends between them as you turn. The ring is the
  shutter: a flash, then the photo shrinks into the gallery.
- `demos/avatar.tsx`: profile setup. A dial of ten drawn faces, and a top-arc dial of backdrops curving under the
  avatar; the face cross-fades and the backdrop blends in OKLab as they turn.
- `demos/mood.tsx`: a journal check-in. Seven moods on a rising arc; the whole screen's gradient follows the mood.

## Limits

- One dial along one arc: horizontal turning only.
- `loop` needs six items or more (with fewer it's bounded).
- Items are square (`itemSize`); clip what you draw to that box.
