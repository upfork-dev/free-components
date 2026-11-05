#version 300 es
precision highp float;

// The small steel bracket under each slab.

in vec3 vWorld;
in vec3 vNormal;
out vec4 outColor;

uniform vec3 uKeyPos;
uniform vec3 uKeyColor;
uniform float uKeyPower;
uniform vec3 uAmbient;
uniform vec3 uSteel;
uniform vec3 uLedColor;
uniform float uLedLevel;
uniform float uStripPower;
uniform vec3 uStripPoint;
uniform vec2 uPanelFade;
uniform float uPanelAmount;
uniform vec2 uViewport;

float panelKeep(float x) {
  return uPanelFade.x < uPanelFade.y ? 1.0 - smoothstep(uPanelFade.x, uPanelFade.y, x) : smoothstep(uPanelFade.y, uPanelFade.x, x);
}

void main() {
  vec3 toKey = uKeyPos - vWorld;
  float d2 = dot(toKey, toKey);
  float nl = max(dot(vNormal, toKey / sqrt(d2)), 0.0);
  vec3 toStrip = uStripPoint - vWorld;
  float s2 = dot(toStrip, toStrip) + 60.0;
  vec3 glow = uLedColor * uLedLevel * uStripPower * 0.04 / (1.0 + s2 * 0.002);
  float fade = 1.0;
  if (uPanelAmount > 0.0) fade = mix(1.0, panelKeep(gl_FragCoord.x / uViewport.x), uPanelAmount);
  outColor = vec4(uSteel * (uAmbient + uKeyColor * uKeyPower * nl / d2 + glow), 1.0) * fade;
}
