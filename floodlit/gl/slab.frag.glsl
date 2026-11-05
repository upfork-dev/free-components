#version 300 es
precision highp float;

// Clear acrylic. Almost nothing in the body, light caught along its edges, the strip inside its front
// edge, and on top: the shoe's contact shadow and a faint reflection.

#include "common.glsl"

in vec3 vWorld;
in vec3 vNormal;
out vec4 outColor;

uniform vec3 uCamera;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform vec2 uStripX;
uniform vec3 uLedColor;
uniform float uLedLevel;

uniform vec3 uKeyPos;
uniform vec3 uKeyColor;
uniform float uKeyPower;
uniform vec3 uAmbient;

uniform vec3 uBodyTint;
uniform float uBodyAlpha;
uniform float uRimGain;
uniform float uStripGain;
uniform float uStripIdle;

uniform sampler2D uShoe;
uniform vec4 uShoeRect;     // the shoe's card: x0, y0, x1, y1
uniform float uShoeZ;
uniform float uBaselineY;
uniform vec2 uContact;      // world x range of the sole that touches
uniform float uContactGain;
uniform float uReflectGain;
uniform vec2 uPanelFade;
uniform float uPanelAmount;
uniform vec2 uViewport;
uniform float uFlip;

float panelKeep(float x) {
  return uPanelFade.x < uPanelFade.y ? 1.0 - smoothstep(uPanelFade.x, uPanelFade.y, x) : smoothstep(uPanelFade.y, uPanelFade.x, x);
}

void main() {
  vec3 V = normalize(uCamera - vWorld);
  vec3 N = vNormal;
  float ndv = abs(dot(N, V));
  float fresnel = pow(max(1.0 - ndv, 0.0), 4.0);

  // How far this pixel is from the edge of its face, in world units.
  vec3 dd = min(vWorld - uBoxMin, uBoxMax - vWorld);
  float edge = abs(N.z) > 0.5 ? min(dd.x, dd.y) : (abs(N.y) > 0.5 ? min(dd.x, dd.z) : min(dd.y, dd.z));
  // With multisampling a sample may sit just outside the face, where this goes negative: that made a white dot.
  edge = max(edge, 0.0);
  float px = max(fwidth(edge), 1e-3);
  float rim = exp(-edge / max(0.9, px * 1.1));

  vec3 toKey = uKeyPos - vWorld;
  float keyE = uKeyPower / dot(toKey, toKey);
  vec3 light = uAmbient + uKeyColor * keyE;

  float alpha = uBodyAlpha + 0.22 * fresnel + 0.20 * rim;
  vec3 color = uBodyTint * light * (0.35 + 1.6 * rim + 1.2 * fresnel) * uRimGain;
  vec3 emission = vec3(0.0);
  float shade = 0.0;

  // The strip: a line in the front edge, with the acrylic edge-lit around it.
  float level = uLedLevel;
  vec3 led = uLedColor;
  float zFront = uBoxMax.z;
  float toFront = zFront - vWorld.z;
  if (N.z > 0.5) {
    float yMid = 0.5 * (uBoxMin.y + uBoxMax.y);
    float dx = max(max(uStripX.x - vWorld.x, vWorld.x - uStripX.y), 0.0);
    float d = length(vec2(dx, vWorld.y - yMid));
    float core = exp(-pow(d / 0.95, 2.0));
    float halo = exp(-d / 3.2);
    emission += led * (level * (core * uStripGain + halo * uStripGain * 0.16));
    emission += led * uStripIdle * core;
    // Unlit, the strip is a thin dark line inside the edge.
    shade += core * 0.45 * (1.0 - level);
  } else if (abs(N.y) > 0.5) {
    // Light travels through the slab and leaves through its faces, strongest near the front.
    emission += led * level * uStripGain * 0.045 * exp(-toFront / 15.0);
  }

  // On top: contact shadow and reflection.
  vec3 reflected = vec3(0.0);
  if (N.y < -0.5) {
    float dz = (vWorld.z - uShoeZ) / 11.0;
    float across = exp(-dz * dz);
    float along = smoothstep(uContact.x - 14.0, uContact.x + 18.0, vWorld.x) * (1.0 - smoothstep(uContact.y - 18.0, uContact.y + 14.0, vWorld.x));
    shade += uContactGain * along * across;

    vec3 I = vWorld - uCamera;
    if (vWorld.z > uShoeZ && I.y > 0.0 && I.z < 0.0) {
      vec3 R = vec3(I.x, -I.y, I.z);
      vec2 hit = vWorld.xy + R.xy * ((uShoeZ - vWorld.z) / R.z);
      vec2 uv = (hit - uShoeRect.xy) / (uShoeRect.zw - uShoeRect.xy);
      if (uFlip > 0.5) uv.x = 1.0 - uv.x;
      float up = (uBaselineY - hit.y) / (uShoeRect.w - uShoeRect.y);
      if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0 && up > -0.02) {
        vec4 s = texture(uShoe, uv, 2.0);
        if (s.a > 0.01) {
          reflected = srgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0)) * s.a * exp(-max(up, 0.0) * 9.0) * uReflectGain * smoothstep(0.0, 8.0, zFront - vWorld.z);
        }
      }
    }
  }

  shade = clamp(shade, 0.0, 0.92);
  vec3 rgb = color * alpha + emission + reflected;
  // `shade` darkens what is behind, as a black layer with this alpha does.
  float a = 1.0 - (1.0 - alpha) * (1.0 - shade);
  float fade = 1.0;
  if (uPanelAmount > 0.0) fade = mix(1.0, panelKeep(gl_FragCoord.x / uViewport.x), uPanelAmount);
  outColor = vec4(rgb, a) * fade;
}
