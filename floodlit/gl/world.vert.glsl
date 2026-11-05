#version 300 es
// Everything in the room is positioned in world units: CSS pixels at the rest camera, wall at z = 0.
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aFace;

uniform mat4 uViewProj;
uniform vec3 uOrigin;
uniform vec3 uScale;

out vec3 vWorld;
out vec3 vNormal;
out vec2 vFace;

void main() {
  vWorld = uOrigin + aPosition * uScale;
  vNormal = aNormal;
  vFace = aFace;
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}
