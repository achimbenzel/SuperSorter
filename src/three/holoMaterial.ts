// Shader der Kartenflächen: Kartenbild + blickwinkelabhängiger Glanz.
//
// Holo Rares (Stil wie Yu-Gi-Oh-Holos): Prismenfolie nur dort, wo die Holo-Maske
// hell ist (weiß = stark, grau = etwas, schwarz = nichts):
//   - Regenbogen läuft diagonal über die Karte und verschiebt sich beim Kippen,
//   - feines Linienraster (wie bei Secret Rares), das beim Neigen schimmert,
//   - breites Reflexionsband, das mit dem Winkel über die Karte wandert,
//   - winzige Glitzersterne, die bei bestimmten Winkeln aufblitzen.
//   Gemischt per Farbabwedeln: Die Kunst bleibt erkennbar, helle Stellen schillern.
// Alle Karten: weicher Glanzstreifen (Rares goldener und stärker).
// Der Kippwinkel kommt aus der Flächennormale im Kameraraum (n.xy).

import * as THREE from 'three';

export interface HoloOptions {
  map: THREE.Texture;
  /** Holo-Maske (Alpha = Stärke); ohne Maske kein Holo. */
  holoMask?: THREE.Texture | null;
  rare?: number;
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
  uniform sampler2D holoMask;
  uniform float uHolo;
  uniform float uRare;
  uniform float uTime;
  uniform float uOpacity;
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
    if (base.a < 0.5) discard; // runde Ecken des Kartenbilds
    vec3 n = normalize(vNormalV);
    vec2 tilt = n.xy + vViewV.xy * 0.35;
    vec3 col = base.rgb;

    float m = uHolo > 0.5 ? texture2D(holoMask, vUv).a : 0.0;
    if (m > 0.003) {
      // Reflexionsband: dort spiegelt die Folie das Licht zum Auge (hell, wandert beim Kippen)
      float band = vUv.x * 0.55 + vUv.y * 0.85 - 0.72 - tilt.x * 1.5 + tilt.y * 1.7;
      float zone = 0.35 + 0.95 * exp(-band * band * 2.6);
      // Regenbogen, diagonal, wandert beim Kippen
      float hue = fract((vUv.x - vUv.y * 0.8) * 1.3 + tilt.x * 1.6 - tilt.y * 1.2 + uTime * 0.015);
      vec3 prism = hsv2rgb(vec3(hue, 0.68, 1.0));
      // feines Prismenraster (diagonal + quer), verschiebt sich mit dem Winkel
      vec2 px = vUv * vec2(1024.0, 1550.0);
      float l1 = 0.5 + 0.5 * sin((px.x + px.y) * 0.55 + tilt.x * 26.0);
      float l2 = 0.5 + 0.5 * sin((px.x - px.y) * 0.47 - tilt.y * 22.0);
      float grain = mix(0.5, 1.0, l1 * 0.6 + l2 * 0.4);
      vec3 foil = prism * grain * zone;
      // Farbabwedeln: Motiv bleibt erkennbar, helle Stellen schillern; dazu eine
      // dünne Farbschicht, damit auch dunkle Flächen die Folie zeigen
      vec3 dodge = min(col / max(vec3(1.0) - foil * 0.8, vec3(0.1)), vec3(1.0));
      col = mix(col, dodge, m * 0.95);
      col += foil * m * 0.2;
      // Glitzersterne: weich und rund mit kleinem Strahlenkreuz, blitzen je nach Winkel
      vec2 cell = floor(px / 16.0);
      vec2 local = fract(px / 16.0) - 0.5;
      float h = hash(cell);
      vec2 c = vec2(hash(cell + 7.1), hash(cell + 3.3)) - 0.5;
      vec2 d = (local - c * 0.6) * 16.0;
      float star = exp(-dot(d, d) * 0.35) + 0.5 * exp(-abs(d.x) * 1.4 - d.y * d.y * 0.6) + 0.5 * exp(-abs(d.y) * 1.4 - d.x * d.x * 0.6);
      float tw = pow(max(0.0, sin(h * 80.0 + tilt.x * 30.0 - tilt.y * 24.0 + uTime * 1.1)), 18.0);
      col += vec3(1.0, 0.97, 0.9) * star * step(0.9, h) * tw * m * 0.9;
    }

    // Glanzstreifen: in Ruhe streift er die obere Ecke, Kippen zieht ihn über die Karte
    float g = vUv.x * 0.75 + vUv.y * 0.55 - 1.15 - tilt.x * 1.9 + tilt.y * 1.3 + sin(uTime * 0.6) * 0.12;
    float glare = exp(-g * g * 22.0) * (0.1 + 0.16 * uRare);
    vec3 glareCol = mix(vec3(1.0), vec3(1.0, 0.86, 0.5), uRare);
    col = 1.0 - (1.0 - col) * (1.0 - glareCol * glare);

    gl_FragColor = vec4(col, base.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** 1×1 schwarz: Platzhalter, solange keine Maske da ist (gleicher Shader, kein Neu-Übersetzen). */
let emptyMask: THREE.DataTexture | null = null;
function noMask() {
  if (!emptyMask) {
    emptyMask = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    emptyMask.needsUpdate = true;
  }
  return emptyMask;
}

export function createHoloMaterial({ map, holoMask = null, rare = 0 }: HoloOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      holoMask: { value: holoMask ?? noMask() },
      uHolo: { value: holoMask ? 1 : 0 },
      uRare: { value: rare },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
}

/** Holo-Maske nachträglich setzen (sobald geladen). */
export function setHoloMask(material: THREE.ShaderMaterial, mask: THREE.Texture) {
  material.uniforms.holoMask.value = mask;
  material.uniforms.uHolo.value = 1;
}
