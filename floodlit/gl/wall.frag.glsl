#version 300 es
precision highp float;
precision highp sampler2DArray;

// The wall: one surface, lit by an ambient term, one key light with real distance falloff, and the strips.
// Each shoe shades only the light it really blocks.

#include "common.glsl"

#define MAX_SHOES 16

in vec3 vWorld;
out vec4 outColor;

uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uDetail;
uniform sampler2DArray uShadows;

uniform vec2 uWallScale;
uniform vec2 uWallOffset;
uniform float uDetailScale;
uniform float uContrast;
uniform float uRelief;
uniform float uDetailRelief;
uniform float uMapBias;
uniform float uChroma;

uniform vec3 uWallBase;
uniform vec3 uAmbient;
uniform vec3 uKeyPos;
uniform vec3 uKeyColor;
uniform float uKeyPower;
uniform float uKeyShadow;
uniform float uSlabShadow;
uniform float uStripPower;
uniform float uShoeZ;
uniform vec2 uRoom; // centre x, half width: the ambient's slow fall towards the room's far ends
uniform vec3 uTorchPos;
uniform vec3 uTorchColor;
uniform float uTorchPower;
uniform vec2 uPanelFade;
uniform vec2 uViewport;
uniform float uFlip;

uniform int uCount;
uniform vec4 uShoeRect[MAX_SHOES]; // padded shadow quad on the shoe's plane: x0, y0, x1, y1
uniform vec3 uShoeBase[MAX_SHOES]; // baseline y, quad height, how present this shelf is (0 when faded for the panel)
uniform vec4 uStrip[MAX_SHOES];    // x0, x1, y, z
uniform vec4 uLed[MAX_SHOES];      // linear colour, level
uniform vec3 uSlab[MAX_SHOES];     // x0, x1, y of the top face

float panelKeep(float x) {
  return uPanelFade.x < uPanelFade.y ? 1.0 - smoothstep(uPanelFade.x, uPanelFade.y, x) : smoothstep(uPanelFade.y, uPanelFade.x, x);
}

float shadowAt(int i, vec2 q, float lod) {
  vec4 r = uShoeRect[i];
  vec2 uv = (q - r.xy) / (r.zw - r.xy);
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return 0.0;
  return textureLod(uShadows, vec3(uv, float(i)), lod).r;
}

void main() {
  vec2 P = vWorld.xy;
  vec2 uv = P * uWallScale + uWallOffset;

  // Close up the map is enlarged: its pits would read as blurred spots, so they soften into plain variation.
  vec3 ratio = texture(uAlbedo, uv, uMapBias).rgb * 2.0;
  ratio = mix(vec3(dot(ratio, LUMA)), ratio, uChroma);
  ratio = max(vec3(0.0), 1.0 + (ratio - 1.0) * uContrast);

  // Normals are stored with +y up the image, and world y points down.
  vec2 nm = texture(uNormal, uv, uMapBias).rg * 2.0 - 1.0;
  vec2 dt = texture(uDetail, P * uDetailScale).rg * 2.0 - 1.0;
  vec2 tilt = nm * uRelief + dt * uDetailRelief;
  vec3 N = normalize(vec3(tilt.x, -tilt.y, 1.0));

  // Key light: a soft wall-washer. It falls off with real distance, and relief catches it.
  vec3 toKey = uKeyPos - vec3(P, 0.0);
  float keyD2 = dot(toKey, toKey);
  vec3 keyDir = toKey / sqrt(keyD2);
  float keyE = uKeyPower * max(dot(N, keyDir), 0.0) / keyD2;

  // The torch: a soft light that follows the pointer. It rakes across the plaster, and moves the shadows a little.
  vec3 toTorch = uTorchPos - vec3(P, 0.0);
  float torchE = 0.0;
  if (uTorchPower > 0.0) {
    float d2 = dot(toTorch, toTorch);
    torchE = uTorchPower * max(dot(N, toTorch / sqrt(d2)), 0.0) / d2;
  }

  float keyVis = 1.0;
  float torchVis = 1.0;
  float ao = 1.0;
  float screenX = gl_FragCoord.x / uViewport.x;
  float panelGone = panelKeep(screenX);
  for (int i = 0; i < uCount; i++) {
    // The shoe, standing clear of the wall, shades the key light.
    vec2 q = P + toKey.xy * (uShoeZ / toKey.z);
    float h = clamp((uShoeBase[i].x - q.y) / uShoeBase[i].y, 0.0, 1.0);
    float here = mix(1.0, panelGone, uShoeBase[i].z);
    if (uTorchPower > 0.0) {
      vec2 qt = P + toTorch.xy * (uShoeZ / toTorch.z);
      torchVis *= 1.0 - here * 0.7 * shadowAt(i, qt, 1.5);
    }
    keyVis *= 1.0 - here * uKeyShadow * shadowAt(i, q, mix(0.5, 2.6, h));

    // The slab: a faint soft shade from the key, and a closer one where it meets the wall.
    vec3 s = uSlab[i];
    if (abs(P.y - s.z) < 90.0) {
      vec2 qs = P + toKey.xy * (24.0 / toKey.z);
      keyVis *= 1.0 - here * uSlabShadow * softBar(qs, s.xy, s.z + 4.0, 16.0, 11.0);
      ao *= 1.0 - here * 0.34 * softBar(P, s.xy, s.z + 3.0, 10.0, 7.0);
    }
  }

  float room = 1.0 - 0.2 * smoothstep(0.9, 2.2, abs(P.x - uRoom.x) / uRoom.y);
  vec3 E = uAmbient * room * ao + uKeyColor * keyE * keyVis * ao + uTorchColor * torchE * torchVis * ao;

  // The strips.
  for (int i = 0; i < uCount; i++) {
    float level = uLed[i].a;
    if (level < 0.002) continue;
    vec4 st = uStrip[i];
    float dy = P.y - st.z;
    float d2 = dy * dy + st.w * st.w;
    float e = lineIrradiance(st.x - P.x, st.y - P.x, d2, st.w);
    vec3 toLine = normalize(vec3(clamp(P.x, st.x, st.y) - P.x, -dy, st.w));
    float relief = max(dot(N, toLine), 0.0) / max(toLine.z, 0.08);
    // Its own shoe stands between the strip and the wall above it.
    vec2 q = vec2(P.x, P.y + (st.z - P.y) * (uShoeZ / st.w));
    float shade = 1.0 - 0.72 * shadowAt(i, q, 3.2);
    E += uLed[i].rgb * level * uStripPower * e * relief * shade;
  }

  outColor = vec4(uWallBase * ratio * E, 1.0);
}
