#version 300 es
precision highp float;

// One jittered frame into the running average of a still.

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uFrame;
uniform float uWeight;

void main() {
  outColor = vec4(texture(uFrame, vUv).rgb, uWeight);
}
