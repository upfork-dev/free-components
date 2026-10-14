# Fluid Tab Bar

A floating tab bar whose highlight moves like a drop of liquid: its leading edge darts to the tab you pick and its
trailing edge follows, so it stretches and thins on the way and settles round on arrival. Icons it passes light up,
badges pop when their count grows, and in `expand` the focused tab opens to show its label. Light and dark, finger
and mouse, with a haptic tick on phones.

React Native (Expo SDK 57): Reanimated 4, `react-native-svg`, `expo-haptics`.

[Live preview on UpFork](https://upfork.dev/products/fluid-tab-bar-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/fluid-tab-bar/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-svg expo-haptics
```

## Use

```tsx
import { FluidTabBar, TabIcons } from './components/fluid-tab-bar';

const [tab, setTab] = useState('home');

<FluidTabBar
  value={tab}
  onChange={setTab}
  tabs={[
    { key: 'home', label: 'Home', icon: TabIcons.Home },
    { key: 'search', label: 'Search', icon: TabIcons.Search },
    { key: 'activity', label: 'Activity', icon: TabIcons.Bell, badge: 3 },
    { key: 'profile', label: 'Profile', icon: TabIcons.User },
  ]}
/>;
```

It sizes to its parent's width: put it in a view absolutely placed over the bottom of your screen (the demos use
`left: 20, right: 20, bottom: 30`), and give your content enough bottom padding to scroll clear of it. With React
Navigation, render it from your tab navigator's `tabBar`, passing the focused route's name and `navigation.navigate`.

| Prop | Default | What it does |
| --- | --- | --- |
| `tabs` | required | `{ key, label, icon, badge? }` for each tab. `label` is read by screen readers, and shown in `expand`. |
| `value` | required | The focused tab's key. |
| `onChange` | required | Called with a tab's key when it's pressed. |
| `variant` | `'pill'` | `'pill'`: equal tabs, the pill hugging the icon. `'expand'`: the focused tab grows to show its label. |
| `tint` | the theme's ink | The pill's color. |
| `onTint` | white, or the page color | The focused icon's and label's color on the pill. |
| `height` | `64` | The bar's height; the pill and the icons follow. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `style` | | The bar's style (margins, width). |

A tab's `icon` is any component that takes `{ color, size, focused }`: draw it outlined, and filled when `focused`.
`TabIcons` has Home, Search, Bell, Chat, User, Compass, Bookmark, Ticket and Heart to start with. `badge` is a count
(`99+` past 99) or `true` for a dot; on the pill it turns the pill's text color so it still reads.

Screen readers get a tab list with each tab's label and which is selected. With "reduce motion" on, the pill glides
without stretching.

## Demos

- `demos/social.tsx`: five tabs in the pill style; Activity's badge clears once you've looked.
- `demos/travel.tsx`: four tabs in `expand`, in a warm accent of their own.
