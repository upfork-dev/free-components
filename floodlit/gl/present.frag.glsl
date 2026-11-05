#version 300 es
precision highp float;

// From linear light to the screen. Highlights roll off rather than clip, so a bright strip keeps its hue.
// The dither is static blue noise of about one level, and never animated: it stops banding in dim tails.

#include "common.glsl"

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uScene;
uniform sampler2D uNoise;
uniform float uDither;
uniform float uWorldDim; // the bag is open: the world steps back

vec3 rollOff(vec3 c) {
  const float knee = 0.72;
  vec3 over = max(c - knee, 0.0);
  return min(c, vec3(knee)) + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
}

void main() {
  vec3 c = rollOff(texture(uScene, vUv).rgb * uWorldDim);
  c = linearToSrgb(c);
  float n = texelFetch(uNoise, ivec2(gl_FragCoord.xy) & 63, 0).r - 0.5;
  outColor = vec4(c + n * uDither / 255.0, 1.0);
}
