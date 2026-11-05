// Shared by the room's fragment shaders. All lighting happens in linear light.
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// A soft bar, used for what a slab does to the wall. It has no box anywhere: both axes fall away smoothly.
float softBar(vec2 p, vec2 xRange, float y, float along, float across) {
  float ax = smoothstep(xRange.x - along, xRange.x + along, p.x) * (1.0 - smoothstep(xRange.y - along, xRange.y + along, p.x));
  float d = (p.y - y) / across;
  return ax * exp(-d * d);
}

// Light from a straight line of length b - a, on a plane parallel to it. This closed form is why a
// strip's glow has no box to have an edge: its ends are soft by construction.
float lineIrradiance(float a, float b, float d2, float z) {
  return (b / sqrt(b * b + d2) - a / sqrt(a * a + d2)) * z / d2;
}
