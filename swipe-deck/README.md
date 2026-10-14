# Swipe Deck

A stack of cards to swipe through: right to keep, left to pass, and up, if you want it, for something special. The
card follows your finger (or mouse) one to one and tilts as it goes, the card under it rises as you drag, a stamp in
your color says what letting go will do, and a fling sends it off. Buttons can swipe for you, and the last card can
come back the way it left. Light and dark, with haptics on phones.

React Native (Expo SDK 57): Reanimated 4, Gesture Handler, `expo-haptics`. The demos also draw with `react-native-svg`.

[Live preview on UpFork](https://upfork.dev/products/swipe-deck-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/swipe-deck/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`), as Gesture Handler
asks.

## Use

```tsx
import { useRef } from 'react';
import { SwipeDeck, type SwipeDeckHandle } from './components/swipe-deck';

const deck = useRef<SwipeDeckHandle>(null);

<SwipeDeck
  ref={deck}
  data={albums}
  keyExtractor={(album) => album.id}
  renderCard={(album) => <AlbumCover album={album} />}
  directions={['left', 'right', 'up']}
  stamps={{
    right: { label: 'Save', color: '#16A34A' },
    left: { label: 'Skip', color: '#E5484D' },
    up: { label: 'Playlist', color: '#6D4AFF' },
  }}
  onSwipe={(album, direction) => save(album, direction)}
  style={{ flex: 1, margin: 20 }}
/>;

<Button title="Skip" onPress={() => deck.current?.swipe('left')} />
<Button title="Undo" onPress={() => deck.current?.undo()} />
```

The deck fills its own box (give it a size or `flex: 1`), and each card fills the deck. Keep `data` the same while
people swipe: the deck keeps its own place in it. To start over, give the deck a new `key`.

| Prop | Default | What it does |
| --- | --- | --- |
| `data` | required | The cards' items, first on top. |
| `keyExtractor` | required | A stable key for each item. |
| `renderCard` | required | Draws an item's card. Its corners are rounded and clipped for you. |
| `onSwipe` | | `(item, direction, index)`, as a card goes, by a gesture, a button or a screen reader. |
| `onUndo` | | `(item, direction, index)`, as a card comes back, with the way it had gone. |
| `onEnd` | | Called once the last card has gone. |
| `renderEmpty` | | Shown when every card is gone. |
| `directions` | `['left', 'right']` | The ways a card may go: any of `'left'`, `'right'`, `'up'`. |
| `stamps` | | `{ label, color }` for each way, shown on the card as it's dragged that way. |
| `stackSize` | `3` | How many cards show in the stack, the top one included. |
| `initialIndex` | `0` | The index of the first card on top. |
| `ref` | | `swipe(direction)` and `undo()`. |
| `scheme` | the phone's | `'light'` or `'dark'`: the cards' color and shadow. |
| `style` | | The deck's style. |

A card goes when it's dragged past 30% of the deck's width (20% of its height upwards) or flung past it. Screen
readers get an action for each way, named after its stamp. With "reduce motion" on, cards leave quickly and the stack
moves without springs.

## Demos

- `demos/music.tsx`: new albums with covers drawn in code; save, skip or add to a playlist, with buttons and undo.
- `demos/flashcards.tsx`: Spanish words; tap a card to reveal its meaning, swipe right if you knew it, left to see it
  again, with a progress bar and a score at the end.
