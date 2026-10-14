import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { registerRootComponent } from 'expo';

// Skia's engine first (public/canvaskit.wasm, copied there by npm install), then the app.
LoadSkiaWeb({ locateFile: (file: string) => `/${file}` })
  .then(() => import('./App'))
  .then(({ default: App }) => registerRootComponent(App));
