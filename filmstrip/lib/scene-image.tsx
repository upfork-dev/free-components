import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Scene } from './scenes';

/**
 * A scene filling its box (cropped to fit). Its wash colour holds the place until the picture has
 * loaded, then the picture fades in. What the demos pass as `renderImage`; use any image component.
 */
export function SceneImage({ scene }: { scene: Scene }) {
  const [loaded, setLoaded] = useState(false);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (loaded) shown.value = withTiming(1, { duration: 180 });
  }, [loaded, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: scene.wash[1] }]}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <Image source={scene.source} style={styles.fill} resizeMode="cover" fadeDuration={0} onLoad={() => setLoaded(true)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
