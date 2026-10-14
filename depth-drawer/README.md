# Depth Drawer

A side menu for React Native and Expo where the current screen doesn't just slide away: it steps back into depth.
It scales down, rounds its corners and moves aside (with faint ghost copies behind it), or swings back like a door,
or simply slides, or stays while the menu floats over it. The menu's items arrive in a stagger that follows your
finger, and the menu button's three bars turn into a close mark as you drag. Everything is scrubbed by one progress,
from the first pixel of an edge swipe to the settle: nothing runs on a timer.

React Native (Expo SDK 57): Reanimated 4, Gesture Handler, `react-native-svg`, `expo-haptics`, `expo-status-bar`,
`react-native-safe-area-context`. No navigation library.

[Live preview on UpFork](https://upfork.dev/products/depth-drawer-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/depth-drawer/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
components import `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg expo-haptics expo-status-bar react-native-safe-area-context
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`), as Gesture Handler
asks. The menu reads the safe area when a `SafeAreaProvider` is above it, and works without one.

## Use

```tsx
import { Drawer, DrawerMenu, DrawerHeader, DrawerSection, DrawerItem, DrawerFooter, MenuButton } from './components/depth-drawer';

<Drawer
  variant="scale"
  renderMenu={() => (
    <DrawerMenu>
      <DrawerHeader order={0} name="Maya Ortiz" badge="Premium" detail="Personal" avatar={<Avatar />} />
      <DrawerSection title="Money" order={1}>
        <DrawerItem order={2} label="Accounts" icon={AccountsIcon} active={route === 'accounts'} onPress={() => go('accounts')} />
        <DrawerItem order={3} label="Payments" icon={PaymentsIcon} badge={2} active={route === 'payments'} onPress={() => go('payments')} />
      </DrawerSection>
      <DrawerFooter scheme={scheme} onSchemeChange={setScheme} onSignOut={signOut} />
    </DrawerMenu>
  )}
>
  <Screen /> {/* put <MenuButton /> in its header */}
</Drawer>;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `renderMenu` | required | The menu. Use the menu kit below, or anything of yours. |
| `children` | required | The screen. |
| `variant` | `'scale'` | `push`: the screen slides by the menu's width. `scale`: it shrinks to 0.84, moves until its near edge is at 70% of the width, rounds its corners and casts a large soft shadow, with ghost layers behind it. `swing`: it slides and turns back 16° in perspective, like a door hinged on its far edge, darkening towards the edge that recedes. `float`: the screen stays, dimmed, and the menu is a floating card over it. |
| `side` | `'left'` (`'right'` in RTL) | Which edge the menu comes from. Everything mirrors. |
| `open` / `defaultOpen` / `onOpenChange` | | Controlled or uncontrolled. |
| `menuWidth` | `'78%'` | Points or a percentage. Under `scale` and `swing` the menu also stops before the screen's resting edge. |
| `edgeWidth` | `28` | The strip along the edge that a swipe opens from. |
| `swipeEnabled` | `true` | Edge swipe to open, drag to close. |
| `ghostLayers` | `2` | `scale` only: 0, 1 or 2 faint copies of the screen's edge behind it (white at 4% and 2% on dark, black on light). |
| `screenRadius` | `28` | The screen's corner radius when it steps back. |
| `menuBackground` | the theme's | The stage behind the screen (`#0E0E12` dark, `#F1EFEA` light). |
| `screenBackground` | black / white | Your screen's colour: its rounded corners and its shadow are cut from it. |
| `statusBarStyle` | | `{ open, closed }`: switch the status bar's style as the drawer opens (a light menu on a dark screen…). |
| `scheme`, `haptics`, `style`, `ref` | | `ref.current.open()`, `close()`, `toggle()`. |

### Hooks

- `useDrawer()` inside the drawer: `open()`, `close()`, `toggle()`, `progress` (a shared value, 0 → 1, a little past
  1 while pulled further) and `isOpen`.
- `useDrawerProgress()`: just the progress, to make anything of yours follow the drawer.
- `useEntrance(order)`: the style the menu kit's pieces enter with, for pieces of your own.

### The gesture

- A swipe from the edge (`edgeWidth`) opens it; the drag maps 1:1 from where the pointer went down. It only starts on
  a sideways move, so the screen's vertical scrolling is never blocked.
- When open, drag the visible part of the screen or the menu to close, or tap the screen.
- On release, the position is projected with the velocity (x + v·0.18) and springs open or closed, starting with
  the release's speed. Past fully open it gives like a rubber band.
- Android's back button closes it; so does Esc on the web.

## The menu kit

- `DrawerMenu`: the frame. Safe-area padding, the active item's pill (which slides between items with a spring when
  the active one changes), a scroll view when the menu is tall, the footer kept at the bottom.
- `DrawerHeader`: `avatar`, `name`, `badge` (a plan), `detail`. The avatar grows in as the drawer opens.
- `DrawerSection`: a small capitals `title` over a group.
- `DrawerItem`: `label`, `icon` (a component `({ color, size })`), `badge`, `active`, `onPress`.
- `DrawerFooter`: a light/dark switch (`scheme`, `onSchemeChange`), sign out (`onSignOut`), or your own children.

Every piece takes `order`: its place in the entrance. As the progress goes from 0.25 to 1, each piece slides in from
18 points out and fades in, 0.06 of the progress after the one before. With "reduce motion" on, they only fade.

## MenuButton

Three bars (round-capped strokes) that turn into a close mark (`morph="close"`) or a back arrow (`morph="arrow"`)
as the drawer opens, following the progress. Pressing it toggles the drawer. "Open menu" / "Close menu" with an
expanded state for screen readers, and at least 44×44 points to press.

## Navigation libraries

The drawer needs no navigation library, so it fits any. With React Navigation, put your stack inside it and close
it when the route changes:

```tsx
function Root() {
  const drawer = useRef<DrawerHandle>(null);
  const nav = useNavigationContainerRef();
  return (
    <Drawer ref={drawer} renderMenu={() => <Menu onGo={(name) => { nav.navigate(name); drawer.current?.close(); }} />}>
      <NavigationContainer ref={nav}><Stack /></NavigationContainer>
    </Drawer>
  );
}
```

With Expo Router, wrap the `Stack` (or `Slot`) in `app/_layout.tsx`, and in the menu call `router.push(href)` then
`close()` from `useDrawer()`.

## Accessibility

While the drawer is open the menu is modal (`accessibilityViewIsModal` on iOS, `aria-modal` on the web), the screen
behind it is hidden from screen readers, and the screen's visible part is a "Close menu" button. Focus moves to the
first item. Items have the button role and a selected state; badges are read with their labels.

## Limits

- One drawer per screen, from one side.
- The screen is moved as one picture: its own animations keep running inside it.
- The status bar style switch needs `expo-status-bar` (part of Expo).

## Demos

- `demos/wallet.tsx`: a finance app, `scale` with two ghost layers, starts open (the poster). The footer's switch
  changes the theme.
- `demos/music.tsx`: a player, `swing`, with album covers drawn in the menu.
- `demos/notes.tsx`: a notes list, `float`: the menu is a card over the dimmed list, with folders and tags.
