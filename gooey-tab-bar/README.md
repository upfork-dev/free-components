# Gooey Tab Bar

A bottom tab bar where the focused tab rides in a bubble that melts out of the bar. Tap another tab and the bubble
pinches off its liquid neck, flies over, and a new neck grows to catch it where it lands. In `cradle` style the
bubble sits half-sunk in a notch that flows along the bar's edge instead. A centre button can bloom two to four
quick actions that bud off it the same way.

The liquid is geometry, not a filter: the bar, the necks and the bubbles are smooth curves computed every frame and
drawn with Skia, so the edges are crisp and the whole shape takes one real shadow and a fine hairline.

React Native (Expo SDK 57): Skia 2, Reanimated 4, `react-native-safe-area-context`, `react-native-svg` (icons),
`expo-haptics`.

[Live preview on UpFork](https://upfork.dev/products/gooey-tab-bar-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/gooey-tab-bar/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets react-native-safe-area-context react-native-svg expo-haptics
```

The bar keeps clear of the bottom safe area using your app's `SafeAreaProvider` (from
`react-native-safe-area-context`; Expo Router and React Navigation add one for you). Without a provider it assumes
no safe area, so it never crashes.

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

The bar positions itself along the bottom of its parent, which should fill the window. Put it last, so it draws over
the screen, and give the screen's content some bottom padding (the bar's height plus the safe area).

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { GooeyIcons, GooeyTabBar, type GooeyTab } from './components/gooey-tab-bar';

const TABS: GooeyTab[] = [
  { key: 'home', label: 'Home', icon: GooeyIcons.home },
  { key: 'search', label: 'Search', icon: GooeyIcons.search },
  { key: 'cart', label: 'Cart', icon: GooeyIcons.bag, badge: 3 },
  { key: 'profile', label: 'Profile', icon: GooeyIcons.user },
];

export function App() {
  const [tab, setTab] = useState(0);
  return (
    <View style={{ flex: 1 }}>
      {/* your screens */}
      <GooeyTabBar
        tabs={TABS}
        index={tab}
        onChange={(index) => setTab(index)}
        centerAction={{
          label: 'Order',
          actions: [
            { key: 'reorder', label: 'Reorder', icon: GooeyIcons.bag, onPress: () => {} },
            { key: 'scan', label: 'Scan', icon: GooeyIcons.search, onPress: () => {} },
          ],
        }}
      />
    </View>
  );
}
```

### With React Navigation

```tsx
<Tab.Navigator tabBar={({ state, navigation }) => (
  <GooeyTabBar
    tabs={state.routes.map((route) => ({ key: route.key, label: route.name, icon: ICONS[route.name] }))}
    index={state.index}
    onChange={(index) => navigation.navigate(state.routes[index].name)}
  />
)}>
```

### With Expo Router

```tsx
<Tabs tabBar={({ state, navigation }) => (
  <GooeyTabBar
    tabs={state.routes.map((route) => ({ key: route.key, label: LABELS[route.name], icon: ICONS[route.name] }))}
    index={state.index}
    onChange={(index) => navigation.navigate(state.routes[index].name)}
  />
)} />
```

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `tabs` | required | 2 to 5 tabs (2 or 4 with a centre action): `{ key, label, icon, badge?, accessibilityLabel? }`. |
| `index` | required | The focused tab. |
| `onChange` | required | `(index, key)` when another tab is pressed. |
| `onReselect` | | `(index, key)` when the focused tab (or its bubble) is pressed again. |
| `variant` | `'drop'` | `'drop'`: the bubble floats above the bar on a liquid neck. `'cradle'`: it sits in a notch that flows along the bar. |
| `showLabels` | `true` | Labels under the icons. The focused tab's label stays in the bar, under its bubble. |
| `centerAction` | | `{ label, icon?, onPress?, actions? }`: a raised button in the middle. With `actions` (2 to 4: `{ key, label, icon, onPress }`) it blooms them; without, it calls `onPress`. |
| `colors` | the theme's | Any of `bar`, `bubble`, `onBubble`, `icon`, `label`, `badge`, `onBadge`, `center`, `onCenter`. |
| `height` | `64` | The bar's height, not counting the bottom safe area. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | A tick on tab change, a light tap when the centre opens. |

`badge` is a count (shown as "99+" past 99) or `'dot'`. A badge pops when its count grows.

Icons are any `({ color, size, focused }) => ReactNode`. `GooeyIcons` has ten, outlined and filled: `home`,
`search`, `compass`, `bag`, `heart`, `chat`, `bell`, `user`, `chart`, `settings`. The bubble shows the filled one.

## How it moves

- **Switching.** The bubble flies on a spring. Its neck thins as it leaves and pinches off; it lifts a little in the
  air (higher over a centre button, to clear it) and stretches with its speed, keeping its area; a new neck grows
  under it as it arrives, and it settles round. Taps while it's flying turn it from where it is.
- **The bloom.** The actions bud off the centre button through liquid bridges that stretch and snap, their labels
  appear once they're free, and a scrim dims the screen. Tapping the centre button or the scrim pulls them back, in
  reverse order. The plus turns into a close mark (a custom icon cross-fades into one).
- **Reduced motion.** No flight, no wobble: the bubble glides, its neck stays put, and the bloom fades.

## Accessibility

The bar is a tab list; each tab is a tab with its selected state and its badge in its label ("Cart, 3"). The centre
button is a button with an expanded state, and each action is a button. Every target is at least 44 points.

## Performance

Everything moves on the UI thread from one shared position; React renders only when the focused tab changes.
Shapes the GPU meets only in flight are drawn once, invisibly, while the bar appears, so the first tap is as smooth
as the rest. Measured in Chrome on integrated graphics (Intel Iris Plus), in a production web build: 60 fps through
repeated tab switches.

## Demos

- `demos/food.tsx`: a food-delivery app with `drop`, a centre "Order" that blooms Reorder, Scan menu and Group order,
  and a cart badge that pops when you add a dish.
- `demos/fitness.tsx`: a training app with `cradle` in electric lime, and a "Start" button that blooms Run, Ride
  and Swim.
- `demos/messages.tsx`: a messenger with four tabs, no labels and no centre action: the bar at its simplest.

## Limits

- A bottom bar, horizontal. Up to five tabs.
- With a centre action, an even number of tabs (two or four), so the button sits in the middle.
