import { ImageFormat, Skia, type SkImage } from '@shopify/react-native-skia';

import type { ColorMatrix } from './filters';

// The camera demo's view: a lake under mountains at sunset, drawn by one shader, once. Nothing here is a photo.
// Sky, a low sun with its bloom, clouds, three ranges of mountains in haze, a tree line, a lake with a rippled
// reflection and the sun's glitter, a vignette and fine grain (which also dithers the sky's gradients).
const SCENE = `
uniform float2 res;

const float H = 0.60;

float hash12(float2 p) {
  float3 p3 = fract(float3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash11(float x) {
  x = fract(x * 0.1031);
  x *= x + 33.33;
  x *= x + x;
  return fract(x);
}

float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash11(i), hash11(i + 1.0), u) * 2.0 - 1.0;
}

float noise2(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + float2(1.0, 0.0));
  float c = hash12(i + float2(0.0, 1.0));
  float d = hash12(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise2(p);
    p = p * 2.03 + float2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}

float ridge(float x) {
  float h = 0.0;
  float a = 0.55;
  float f = 1.0;
  for (int i = 0; i < 6; i++) {
    float n = noise1(x * f);
    h += a * (1.0 - abs(n));
    f *= 2.13;
    a *= 0.47;
  }
  return clamp((h - 0.42) / 0.62, 0.0, 1.0);
}

float3 land(float2 uv, float aspect) {
  float2 q = float2(uv.x * aspect, uv.y);
  float t = clamp(uv.y / H, 0.0, 1.0);
  float3 zenith = float3(0.10, 0.13, 0.30);
  float3 upper = float3(0.30, 0.31, 0.54);
  float3 rose = float3(0.80, 0.56, 0.62);
  float3 glow = float3(1.00, 0.70, 0.44);
  float3 col = mix(zenith, upper, smoothstep(0.0, 0.5, t));
  col = mix(col, rose, smoothstep(0.38, 0.82, t));
  col = mix(col, glow, smoothstep(0.72, 1.0, t));

  float2 sun = float2(0.66 * aspect, 0.505);
  float ds = length(q - sun);
  col += float3(1.0, 0.62, 0.36) * 0.30 * exp(-ds * 3.2);

  float cl = fbm2(q * float2(2.2, 16.0) + float2(3.0, 0.0));
  float band = smoothstep(0.16, 0.30, t) * (1.0 - smoothstep(0.62, 0.80, t));
  float cloud = smoothstep(0.52, 0.80, cl) * band;
  float3 cloudCol = mix(float3(0.34, 0.30, 0.48), float3(1.0, 0.74, 0.60), smoothstep(0.25, 0.80, t) * 0.75 + 0.25 * exp(-ds * 4.0));
  col = mix(col, cloudCol, cloud * 0.55);

  float r = 0.017;
  col = mix(col, float3(1.0, 0.95, 0.86), smoothstep(r, r - 0.0025, ds));
  col += float3(1.0, 0.58, 0.30) * (0.45 * exp(-ds * 38.0) + 0.18 * exp(-ds * 10.0));

  float3 haze = mix(rose, glow, 0.65) + float3(1.0, 0.6, 0.35) * 0.18 * exp(-abs(q.x - sun.x) * 4.0);
  float sunSide = exp(-abs(q.x - sun.x) * 2.6);

  float topF = 0.538 - 0.075 * ridge(q.x * 5.2 + 3.1);
  if (uv.y > topF) {
    float m = smoothstep(topF, H, uv.y);
    float3 c = float3(0.58, 0.47, 0.62);
    c *= 0.94 + 0.1 * fbm2(q * float2(22.0, 7.0));
    c = mix(c, haze, 0.5 + 0.45 * m);
    c += float3(1.0, 0.7, 0.5) * 0.08 * (1.0 - smoothstep(0.0, 0.03, uv.y - topF)) * sunSide;
    c += float3(1.0, 0.72, 0.5) * 0.22 * smoothstep(0.004, 0.0, uv.y - topF) * sunSide;
    col = c;
  }

  float topM = 0.570 - 0.08 * ridge(q.x * 3.7 + 11.7);
  if (uv.y > topM) {
    float m = smoothstep(topM, H, uv.y);
    float3 c = float3(0.33, 0.26, 0.42);
    c *= 0.9 + 0.16 * fbm2(q * float2(30.0, 9.0));
    c = mix(c, haze, 0.3 + 0.45 * m * m);
    c += float3(1.0, 0.68, 0.45) * 0.16 * smoothstep(0.003, 0.0, uv.y - topM) * sunSide;
    col = c;
  }

  float lean = 1.25 - uv.x * 0.9;
  float topN = 0.598 - 0.07 * lean * ridge(q.x * 2.6 + 27.3);
  if (uv.y > topN) {
    float m = smoothstep(topN, H, uv.y);
    float3 c = float3(0.15, 0.12, 0.20);
    c *= 0.85 + 0.25 * fbm2(q * float2(46.0, 14.0));
    c = mix(c, haze, 0.10 + 0.25 * m * m);
    c += float3(1.0, 0.66, 0.42) * 0.10 * smoothstep(0.003, 0.0, uv.y - topN) * sunSide;
    col = c;
  }

  float clump = 0.55 + 0.45 * noise1(q.x * 9.0);
  float tree = H - 0.003 - 0.012 * clump * pow(abs(noise1(q.x * 160.0)), 0.6) - 0.003 * noise1(q.x * 23.0);
  if (uv.y > tree) {
    col = mix(float3(0.05, 0.055, 0.075), haze * 0.25, 0.25);
  }
  return col;
}

half4 main(float2 p) {
  float2 uv = p / res;
  float aspect = res.x / res.y;
  float3 col;
  if (uv.y <= H) {
    col = land(uv, aspect);
  } else {
    // The water in perspective: ripples are laid out on the lake's surface, so they shrink towards the horizon.
    float dyH = uv.y - H;
    float t2 = dyH / (1.0 - H);
    float z = 1.0 / (dyH + 0.004);
    float2 world = float2((uv.x - 0.5) * aspect * z, z);
    float n = noise2(world * float2(1.4, 7.0)) - 0.5;
    float n2 = noise2(world * float2(0.6, 3.1) + 7.0) - 0.5;
    float dx = (n * 0.9 + n2 * 0.6) * 0.07 * dyH;
    float dy = n2 * 0.05 * dyH;
    float2 ruv = float2(uv.x + dx, H - dyH * 1.05 + dy);
    float3 refl = land(clamp(ruv, float2(0.0, 0.0), float2(1.0, H)), aspect);
    float3 deep = float3(0.05, 0.07, 0.13);
    float k = mix(0.86, 0.42, smoothstep(0.0, 1.0, t2));
    col = mix(deep, refl * float3(0.88, 0.90, 0.96), k);
    col *= 1.0 + n * 0.07;
    float w = 0.014 + dyH * 0.22;
    float gx = (uv.x - 0.66) / w;
    float sp = smoothstep(0.66, 0.94, noise2(world * float2(4.0, 16.0)));
    col += float3(1.0, 0.74, 0.46) * exp(-gx * gx) * sp * (1.1 - t2) * 0.85;
    col += float3(1.0, 0.8, 0.6) * 0.10 * exp(-dyH * 900.0);
    col *= 1.0 - 0.38 * smoothstep(0.35, 1.0, t2);
  }
  float2 v = (uv - 0.5) * float2(1.25, 0.95);
  col *= 1.0 - 0.5 * dot(v, v);
  col += (hash12(p) - 0.5) * 0.05;
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

/** Where the thumbnails are cut from the scene: a square round the sun and the peaks (fractions of the scene). */
export const THUMB_CROP = { cx: 0.6, cy: 0.54, size: 0.5 };

/**
 * Draws the scene once at a size in pixels and returns it as an image any canvas can draw (not tied to the GPU
 * context it was drawn in).
 */
export function renderScene(width: number, height: number): SkImage | null {
  const effect = Skia.RuntimeEffect.Make(SCENE);
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!effect || !surface) return null;
  const paint = Skia.Paint();
  paint.setShader(effect.makeShader([width, height]));
  surface.getCanvas().drawRect(Skia.XYWHRect(0, 0, width, height), paint);
  surface.flush();
  const image = surface.makeImageSnapshot().makeNonTextureImage();
  surface.dispose();
  return image;
}

/** Every filter's thumbnail: the scene's crop in miniature through each matrix, as JPEG data URIs. */
export function renderThumbnails(scene: SkImage, matrices: ColorMatrix[], size: number): string[] {
  const surface = Skia.Surface.MakeOffscreen(size, size);
  if (!surface) return [];
  const canvas = surface.getCanvas();
  const side = scene.width() * THUMB_CROP.size;
  const src = Skia.XYWHRect(scene.width() * THUMB_CROP.cx - side / 2, scene.height() * THUMB_CROP.cy - side / 2, side, side);
  const dst = Skia.XYWHRect(0, 0, size, size);
  const out = matrices.map((matrix) => {
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
    canvas.drawImageRect(scene, src, dst, paint);
    surface.flush();
    return `data:image/jpeg;base64,${surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 90)}`;
  });
  surface.dispose();
  return out;
}

let frameSurface: { width: number; height: number; surface: ReturnType<typeof Skia.Surface.MakeOffscreen> } | null = null;

/** A photo of the whole frame through a filter, for the shutter's flight into the gallery. */
export function renderFrame(scene: SkImage, matrix: ColorMatrix, width: number, height: number): string | null {
  if (!frameSurface || frameSurface.width !== width || frameSurface.height !== height) {
    frameSurface?.surface?.dispose();
    frameSurface = { width, height, surface: Skia.Surface.MakeOffscreen(width, height) };
  }
  const surface = frameSurface.surface;
  if (!surface) return null;
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));
  surface
    .getCanvas()
    .drawImageRect(scene, Skia.XYWHRect(0, 0, scene.width(), scene.height()), Skia.XYWHRect(0, 0, width, height), paint);
  surface.flush();
  return `data:image/jpeg;base64,${surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 88)}`;
}
