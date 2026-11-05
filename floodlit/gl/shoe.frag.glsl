#version 300 es
precision highp float;

// A cut-out on a card. Its texture is premultiplied in sRGB, so it is unpremultiplied and decoded here,
// then lit and premultiplied again in linear light. That order is what leaves no fringe on any wall.

#include "common.glsl"

in vec3 vWorld;
in vec2 vFace;
out vec4 outColor;

uniform sampler2D uShoe;
uniform sampler2D uShoeLarge;
uniform float uLargeMix;  // the larger picture fades in over the smaller one when it has arrived
uniform float uMipBias;
uniform float uExposure;
uniform vec3 uLedColor;
uniform float uLedLevel;
uniform float uSoleCatch;
uniform float uBaseline;  // 0..1 from the top of the card
uniform vec2 uPanelFade;  // screen share where a neighbour starts to fade and where it is gone
uniform float uPanelAmount;
uniform float uFadeAll;
uniform vec2 uViewport;
uniform float uFlip;

float panelKeep(float x) {
  return uPanelFade.x < uPanelFade.y ? 1.0 - smoothstep(uPanelFade.x, uPanelFade.y, x) : smoothstep(uPanelFade.y, uPanelFade.x, x);
}

void main() {
  vec2 uv = uFlip > 0.5 ? vec2(1.0 - vFace.x, vFace.y) : vFace;
  vec4 s = texture(uShoe, uv, uMipBias);
  if (uLargeMix > 0.0) s = mix(s, texture(uShoeLarge, uv, uMipBias), uLargeMix);
  if (s.a < 0.002) discard;
  vec3 albedo = srgbToLinear(clamp(s.rgb / s.a, 0.0, 1.0));

  // The sole catches the strip: only the lower part of the shoe, falling away with height above the slab.
  float h = max(uBaseline - vFace.y, 0.0);
  float low = exp(-h / 0.13);
  vec3 lit = albedo * (uExposure + uLedColor * uLedLevel * uSoleCatch * low);

  float a = s.a * uFadeAll;
  if (uPanelAmount > 0.0) {
    float x = gl_FragCoord.x / uViewport.x;
    a *= mix(1.0, panelKeep(x), uPanelAmount);
  }
  outColor = vec4(lit * a, a);
}
