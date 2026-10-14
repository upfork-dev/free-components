# Lustre Cards

Payment cards in live materials (brushed steel, champagne gold, black titanium, rose gold, an iridescent "prism"
and frosted glass), drawn by a shader. A light sits in front of the card: as the card turns in the carousel, tilts
under a finger (or towards the mouse) or flips over, its reflection slides across the metal and stretches along the
brushing. The card in focus faces you, lifted; the others turn away at depth. Cards turn over to their backs, where
the security code shows only while it's held, and freezing a card grows frost across it from one corner.

React Native (Expo SDK 57): Skia 2 (one runtime shader, compiled once), Reanimated 4, Gesture Handler,
`react-native-svg` (the chip and marks), `expo-haptics`.

[Live preview on UpFork](https://upfork.dev/products/lustre-cards-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/lustre-cards/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg expo-haptics
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`).

### On the web

On the web, Skia runs on CanvasKit (WebAssembly), which must be loaded before any module that uses Skia is imported.
Copy the engine into `public/` once with `npx setup-skia-web public`, then load it in a web-only entry, `index.web.ts`:

```ts
import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(async () => {
  const { default: App } = await import('./App');
  registerRootComponent(App);
});
```

On phones nothing is needed.

## Use

### A carousel

```tsx
import { LustreCarousel, type PaymentCard } from './components/lustre-cards';

const CARDS: PaymentCard[] = [
  { id: 'a', material: 'steel', label: 'Steel', holder: 'Maya Ortiz', last4: '4821', expiry: '08/29', cvv: '317' },
  { id: 'b', material: 'titanium', label: 'Titanium', holder: 'Maya Ortiz', last4: '0954', expiry: '03/30' },
  { id: 'c', material: 'holo', label: 'Prism', holder: 'Maya Ortiz', last4: '6618', expiry: '06/30' },
];

<LustreCarousel
  cards={CARDS}
  initialIndex={1}
  onIndexChange={setPlan}
  renderDetails={(card) => <PlanSummary card={card} />}
  style={{ flex: 1 }}
/>;
```

Swipe (or drag with a mouse) to move between cards; a fling keeps its speed and lands on a card. Tap the card in
focus to turn it over; tap a card beside it to bring it into focus. Press and hold on the card in focus and move to
tilt it; with a mouse, it tilts towards the pointer. `renderDetails` draws something for each card under the
carousel (its plan, its price), cross-fading and sliding as the cards pass.

### One card

```tsx
import { LustreTiltCard } from './components/lustre-cards';

<LustreTiltCard
  card={{ ...card, frozen }}
  width={320}
  orientation="landscape"
  flipped={showBack}
  onPress={() => setShowBack((v) => !v)}
/>;
```

`LustreTiltCard` tilts under a drag (and towards a hovering mouse). For full control, `LustreCard` takes shared
values for `yaw`, `tilt`, `flip`, `time` and `shine`.

## The card

| Field | What it is |
| --- | --- |
| `id` | A stable key. |
| `material` | `'steel'`, `'gold'`, `'titanium'`, `'rose'`, `'holo'`, `'frost'`, or your own `MaterialParams`. |
| `holder`, `last4`, `expiry` | Printed on the front ("•••• 4821"). |
| `cvv` | Shown on the back only while it's held. |
| `issuer` | The wordmark (defaults to "aurel", the demo's made-up bank). |
| `label` | The card's name, set small along its edge. |
| `frozen` | Frost grows over the card from its top left corner, and a "Frozen" badge appears; the print turns frost-dark so it stays readable. |

The card's front has a chip, a contactless mark, an embossed number whose lit and shaded edges follow the light,
the holder, the expiry and an original network mark (not any real network's). The back has a magnetic stripe, a
signature panel and the code.

## Carousel props

| Prop | Default | What it does |
| --- | --- | --- |
| `cards` | required | The cards. |
| `initialIndex` | `0` | The card in focus at first. |
| `onIndexChange` | | `(index)` when another card comes into focus. |
| `onCardPress` | flips it | `(card, index)` on a tap on the card in focus. |
| `orientation` | `'portrait'` | `'portrait'` or `'landscape'` cards. |
| `cardWidth` | 62% of the width, ≤ 260 | The cards' width (their height follows the card ratio). |
| `tiltEnabled` | `true` | Tilt by press-and-hold, or hovering with a mouse. |
| `tiltX`, `tiltY` | | Shared values from −1 to 1, added to the tilt: feed them from a motion sensor to tilt with the phone. |
| `renderDetails` | | `(card, index)`: drawn under the carousel for each card, cross-fading as they pass. |
| `progress` | | A shared value that follows the carousel as a fractional index. |
| `breathe` | `true` | A slow, barely-there drift of the light at rest. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | A tick for each new card in focus, a tap on a flip. |

Ref: `scrollToIndex(index, animated?)` and `flip()`.

### Tilting with the phone

Install any motion sensor package you like (it's not a dependency) and feed its readings in:

```tsx
const tiltX = useSharedValue(0);
const tiltY = useSharedValue(0);
// in your sensor's listener, with x and y from −1 to 1:
tiltX.value = withSpring(x);
tiltY.value = withSpring(y);

<LustreCarousel cards={CARDS} tiltX={tiltX} tiltY={tiltY} />;
```

## Materials

`MATERIALS` holds the six presets. Copy one and change it:

```ts
import { MATERIALS, type MaterialParams } from './components/lustre-cards';

const copper: MaterialParams = { ...MATERIALS.rose, toneA: [0.85, 0.52, 0.34], toneB: [0.55, 0.3, 0.18] };
```

`toneA`/`toneB` are the metal's light and deep tones, `specular` the reflection's colour, `roughness` from mirror
(0.15) to satin (0.6), `brush` how strongly it's brushed and `brushAngle` which way, `coat` a small sharp glint,
`holo` a hue-shifting film, `frost` frosted glass, and `ink`, `inkLight`, `inkShade` the print.

The shader dithers its colours by a fraction of a level, so slow gradients on the dark metals never band, and rolls
highlights off softly instead of clipping them.

## Accessibility

The carousel is one adjustable element ("Titanium ending 0954, 3 of 4"): swipe up or down to move between cards,
double-tap to turn the card over, and a "Show the security code" action turns it and reads the code out. The code
is never in a label until it's revealed. Reduced motion: no drift, a quick flip, and no spring overshoot.

## Performance

One shader, compiled once and shared by every card; uniforms change on the UI thread and nothing re-renders while
cards move. Up to six cards stay mounted; longer lists keep two on each side of the one in focus. Measured in Chrome
on integrated graphics (Intel Iris Plus), in a production web build: 60 fps while swiping, flipping and freezing.

## Demos

- `demos/choose-card.tsx`: onboarding at a made-up bank, "Pick your card": four materials, and a plan panel that
  follows the card.
- `demos/card-detail.tsx`: one landscape card to tilt, freeze and turn over, with the balance, a spending limit and
  recent payments.

## Limits

- The material is a convincing look, not a physical simulation.
- A card's face is laid out for its two orientations; for a very different design, build your own face over
  `LustreCard`'s canvas.
