// Shader für Kartenflächen: Bild + blickwinkelabhängiger Glanz.
//
// - Alle Karten: ein heller Glanzstreifen wandert über die Karte, wenn man sie kippt.
// - Holo Rare: Regenbogen-Folie (Farbe hängt von Position UND Kippwinkel ab, wie
//   bei echten Holos), dazu Glitzerpunkte, die bei bestimmten Winkeln aufblitzen.
//   Im Bildfenster stark, auf dem Rest der Karte schwach.
// - Rare: goldener, etwas stärkerer Glanz.
// Der Kippwinkel kommt aus der Flächennormale im Kameraraum (n.xy).

import * as THREE from 'three';

export interface HoloOptions {
  map: THREE.Texture;
  holo?: number;
  rare?: number;
  /** Bildfenster in UV [u0, v0, u1, v1] (dort ist der Holo-Effekt stark). */
  artRect?: [number, number, number, number];
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float uHolo;
  uniform float uRare;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec4 uArt;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewV;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec4 base = texture2D(map, vUv);
    vec3 n = normalize(vNormalV);
    // Kippung der Karte relativ zur Blickrichtung (0 = frontal)
    vec2 tilt = n.xy + (vViewV.xy - vec2(0.0)) * 0.35;

    float inArt = step(uArt.x, vUv.x) * step(vUv.x, uArt.z) * step(uArt.y, vUv.y) * step(vUv.y, uArt.w);

    // Glanzstreifen (alle Karten)
    // In Ruhe streift er nur die obere Ecke; Kippen zieht ihn über die Karte.
    float g = vUv.x * 0.75 + vUv.y * 0.55 - 1.15 - tilt.x * 1.9 + tilt.y * 1.3 + sin(uTime * 0.6) * 0.12;
    float glare = exp(-g * g * 22.0) * (0.12 + 0.16 * uRare + 0.12 * uHolo);
    vec3 glareCol = mix(vec3(1.0), vec3(1.0, 0.86, 0.45), uRare);

    // Regenbogen-Folie (Holo)
    float hue = fract(vUv.x * 0.8 + vUv.y * 0.55 + tilt.x * 1.8 - tilt.y * 1.4 + uTime * 0.02);
    vec3 rainbow = hsv2rgb(vec3(hue, 0.65, 1.0));
    float bands = 0.5 + 0.5 * sin((vUv.x * 1.3 + vUv.y) * 22.0 + tilt.x * 11.0 - tilt.y * 8.0);
    float holoAmt = uHolo * mix(0.22, 0.85, inArt) * (0.35 + 0.65 * bands);

    // Glitzer: zufällige Punkte, die je nach Winkel aufblitzen
    vec2 cell = floor(vUv * vec2(70.0, 98.0));
    float h = hash(cell);
    float tw = pow(max(0.0, sin(h * 60.0 + tilt.x * 30.0 + tilt.y * 24.0 + uTime * 1.5)), 16.0);
    float sparkle = step(0.93, h) * tw * uHolo * mix(0.35, 1.0, inArt);

    vec3 col = base.rgb;
    // Überlagern statt Aufhellen: Dunkles bleibt dunkel, Helles schillert -> das Motiv
    // bleibt erkennbar, der Hintergrund wird zur Regenbogenfolie.
    vec3 over = mix(2.0 * col * rainbow, 1.0 - 2.0 * (1.0 - col) * (1.0 - rainbow), step(0.5, col));
    col = mix(col, over, holoAmt);
    col = 1.0 - (1.0 - col) * (1.0 - glareCol * glare);
    col += vec3(sparkle) * 1.4;
    gl_FragColor = vec4(col, base.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function createHoloMaterial({ map, holo = 0, rare = 0, artRect = [0, 0, 1, 1] }: HoloOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uHolo: { value: holo },
      uRare: { value: rare },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uArt: { value: new THREE.Vector4(...artRect) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
}
