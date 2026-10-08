// Abreißstreifen des Booster-Packs (Illusion des echten Aufreißens).
//
// Oben am Pack sitzt ein eigener Streifen: Schweißnaht + ein Stück der Packkante.
// Seine Unterkante ist eine unregelmäßig gezackte Risslinie; die Pack-Vorderseite
// ist an derselben Linie per alphaMap ausgeschnitten – solange nichts gerissen ist,
// sieht man keinen Übergang. Beim Reißen
//   - wandert die Rissfront mit dem Finger über das Pack,
//   - rollt sich der freie Teil des Streifens zum Betrachter hin auf und hebt sich
//     (Verformung der Gitterpunkte pro Frame, Normalen neu → Licht spielt mit),
//   - erscheinen nur am bereits gerissenen Stück helle Folienfasern an beiden
//     Risskanten (drawRange der Fasergeometrie),
//   - zeigt der Streifen hinten die silberne Innenfolie.
//
// Damit die Risslinie vorher nicht zu ahnen ist:
//   - Die Pack-Vorderseite bleibt immer dasselbe Modell. Ausgeschnitten wird sie
//     per Shader nur links bzw. rechts der Rissfront (uTearX) – vor dem ersten Riss
//     also nirgends.
//   - Der Streifen zeigt sein Stück Packkante ebenfalls nur am gerissenen Teil.
//   - Die Naht: vor dem Riss `intactTop`, beim ersten Riss tauscht meshes.ts auf den
//     Streifen. Beide liegen exakt gleich (gleiche Höhe, Normalen, UVs, Materialien).

import * as THREE from 'three';

export interface TearDims {
  packW: number;
  bodyH: number;
  crimpH: number;
  /** Wie weit der Riss unterhalb der Naht durch die Packkante läuft. */
  bandH: number;
  /** Höhe der Zacken der Risslinie. */
  amp: number;
  /** Wölbung der Pack-Vorderseite an (x, y) – der Streifen liegt genau darauf. */
  surfaceZ: (x: number, y: number) => number;
}

export interface TearRig {
  /** Streifen (Ursprung in seiner Mitte, damit er beim Wegfliegen um sich selbst dreht). */
  strip: THREE.Group;
  /** Nur die Naht, an exakt derselben Stelle – für das unversehrte Pack. */
  intactTop: THREE.Group;
  /** Fasern an der Risskante des Packs (gehört zum Pack-Körper). */
  bodyRim: THREE.Mesh;
  /** Ausschnitt für die Pack-Vorderseite (alphaMap): oberhalb der Risslinie leer. */
  bodyAlpha: THREE.Texture;
  /** Shader der Pack-Vorderseite erweitern: Ausschnitt nur am gerissenen Stück. */
  patchBody: (material: THREE.MeshPhysicalMaterial) => void;
  /**
   * Streifen-Texturen aus Naht und Pack-Grafik zeichnen; mit `maps` (Materialkarte
   * der Vorderseite) bekommt der Streifen dasselbe Material wie das Pack darunter –
   * vor dem Reißen ist dann kein Übergang zu sehen.
   */
  drawStrip: (front: CanvasImageSource, crimp: HTMLCanvasElement, maps?: CanvasImageSource) => void;
  /** Material der Streifen-Vorderseite (übernimmt die Einstellungen der Pack-Vorderseite). */
  frontMaterial: THREE.MeshPhysicalMaterial;
  /** Rissfortschritt 0..1; dir +1 = von links nach rechts gerissen. */
  update: (progress: number, dir: number) => void;
  setOpacity: (v: number) => void;
  reset: () => void;
  dispose: () => void;
}

const N = 120; // Abschnitte entlang der Risslinie
const ROWS_BAND = 5; // Gitterzeilen Packkante (Risslinie bis Oberkante der Folie)
const ROWS_CRIMP = 3; // Gitterzeilen Naht – eine Zeile liegt genau auf der Oberkante
const ROWS = ROWS_BAND + ROWS_CRIMP;
const BEND_R = 0.42; // Biegeradius beim Aufrollen
const BEND_MAX = 1.25; // maximaler Biegewinkel (rad)
const LIFT = 0.26; // Anheben des freien Teils je Einheit gerissener Länge

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function createTearRig(dims: TearDims, envMap: THREE.Texture, renderer: THREE.WebGLRenderer, bodyMaterial?: THREE.MeshPhysicalMaterial): TearRig {
  const { packW, bodyH, crimpH, bandH, amp, surfaceZ } = dims;
  const yTop = bodyH / 2 + crimpH;
  const yTear = bodyH / 2 - bandH;
  const yMin = yTear - amp;
  const yCenter = (yMin + yTop) / 2;
  const stripH = yTop - yMin;

  // Risslinie: weiche Wellen + feine Zacken (deterministisch)
  const rnd = seeded(97);
  const xs: number[] = [];
  const jag: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    xs.push(-packW / 2 + u * packW);
    const f = 0.5 * Math.sin(u * Math.PI * 2 * 2.3 + 1.1) + 0.25 * Math.sin(u * Math.PI * 2 * 7.7 + 0.4) + 0.3 * (rnd() * 2 - 1);
    jag.push(yTear + amp * Math.max(-1, Math.min(1, f)));
  }

  // ---------------------------------------------------------------- Streifen
  const cols = N + 1;
  const base = new Float32Array(cols * (ROWS + 1) * 3);
  const uv = new Float32Array(cols * (ROWS + 1) * 2);
  const bodyTop = bodyH / 2;
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const y = j <= ROWS_BAND ? jag[i] + ((bodyTop - jag[i]) * j) / ROWS_BAND : bodyTop + ((yTop - bodyTop) * (j - ROWS_BAND)) / ROWS_CRIMP;
      base[k * 3] = xs[i];
      base[k * 3 + 1] = y;
      base[k * 3 + 2] = surfaceZ(xs[i], y) + 0.0008;
      uv[k * 2] = i / N;
      uv[k * 2 + 1] = (y - yMin) / stripH;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const stripGeo = new THREE.BufferGeometry();
  stripGeo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  stripGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  stripGeo.setIndex(idx);

  // Textur (Naht + Packkante) und Ausschnitt (Aufhängeloch, Zacken der Naht)
  const texW = 1536; // wie die Pack-Grafik: Packkante im Streifen genauso scharf wie am Pack
  const texH = Math.round((stripH / packW) * texW);
  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = texW;
  stripCanvas.height = texH;
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = texW;
  alphaCanvas.height = texH;
  const stripTex = new THREE.CanvasTexture(stripCanvas);
  stripTex.colorSpace = THREE.SRGBColorSpace;
  stripTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const alphaTex = new THREE.CanvasTexture(alphaCanvas);
  const mapsCanvas = document.createElement('canvas');
  mapsCanvas.width = texW / 2;
  mapsCanvas.height = Math.round(texH / 2);
  const mapsTex = new THREE.CanvasTexture(mapsCanvas);

  const frontMat = new THREE.MeshPhysicalMaterial({
    map: stripTex,
    alphaMap: alphaTex,
    alphaTest: 0.5,
    transparent: true,
    envMap,
    envMapIntensity: 1,
    metalness: 0.6,
    roughness: 0.42,
  });
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xc4cad4,
    alphaMap: alphaTex,
    alphaTest: 0.5,
    transparent: true,
    envMap,
    envMapIntensity: 1.2,
    metalness: 1,
    roughness: 0.3,
    side: THREE.BackSide,
  });

  // ---------------------------------------------------------------- Fasern an den Risskanten
  const fiber = () => new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.85, metalness: 0, transparent: true, side: THREE.DoubleSide });
  const stripFiberMat = fiber();
  const bodyFiberMat = fiber();
  /** Band entlang der Risslinie; side -1 = darunter (Pack), +1 = darüber (Streifen). */
  function rimGeometry(side: number, zOff: number) {
    const r = seeded(side > 0 ? 31 : 53);
    const pos = new Float32Array(N * 4 * 3);
    const ind: number[] = [];
    for (let i = 0; i < N; i++) {
      const w0 = 0.004 + r() * 0.006;
      const w1 = 0.004 + r() * 0.006;
      const pts = [
        [xs[i], jag[i]],
        [xs[i + 1], jag[i + 1]],
        [xs[i + 1], jag[i + 1] + side * w1],
        [xs[i], jag[i] + side * w0],
      ];
      pts.forEach(([x, y], q) => {
        pos[(i * 4 + q) * 3] = x;
        pos[(i * 4 + q) * 3 + 1] = y;
        pos[(i * 4 + q) * 3 + 2] = surfaceZ(x, y) + zOff;
      });
      const o = i * 4;
      ind.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(ind);
    g.computeVertexNormals();
    g.setDrawRange(0, 0);
    return g;
  }
  const bodyRimGeo = rimGeometry(-1, 0.0016);
  const stripRimGeo = rimGeometry(1, 0.0016);
  const stripRimBase = (stripRimGeo.attributes.position.array as Float32Array).slice();
  const bodyRim = new THREE.Mesh(bodyRimGeo, bodyFiberMat);

  const strip = new THREE.Group();
  strip.position.y = yCenter;
  const inner = new THREE.Group();
  inner.position.y = -yCenter; // Gitterpunkte bleiben in Pack-Koordinaten
  inner.add(new THREE.Mesh(stripGeo, frontMat), new THREE.Mesh(stripGeo, backMat), new THREE.Mesh(stripRimGeo, stripFiberMat));
  strip.add(inner);

  // Unversehrt: nur die Naht (oberhalb der Packkante), gleiche Materialien und UVs
  const vBodyTop = (bodyH / 2 - yMin) / stripH;
  const crimpGeo = new THREE.PlaneGeometry(packW, crimpH, N, ROWS_CRIMP);
  const cuv = crimpGeo.attributes.uv;
  for (let i = 0; i < cuv.count; i++) cuv.setY(i, vBodyTop + cuv.getY(i) * (1 - vBodyTop));
  const intactTop = new THREE.Group();
  intactTop.position.set(0, bodyH / 2 + crimpH / 2, 0.0008);
  intactTop.add(new THREE.Mesh(crimpGeo, frontMat), new THREE.Mesh(crimpGeo, backMat));

  // ---------------------------------------------------------------- Ausschnitt per Shader
  // uTearX: Rissfront in UV (0..1), uTearDir: Richtung. Gerissen ist links (dir > 0)
  // bzw. rechts (dir < 0) der Front.
  const uniforms = { uTearX: { value: 0 }, uTearDir: { value: 1 }, uBandTop: { value: vBodyTop } };
  const torn = 'bool tornHere = uTearDir > 0.0 ? vAlphaMapUv.x < uTearX : vAlphaMapUv.x > uTearX;';
  function patch(material: THREE.Material, key: string, alphaCode: string) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <alphamap_pars_fragment>', '#include <alphamap_pars_fragment>\nuniform float uTearX;\nuniform float uTearDir;\nuniform float uBandTop;')
        .replace('#include <alphamap_fragment>', `#ifdef USE_ALPHAMAP\n${torn}\n${alphaCode}\n#endif`);
    };
    material.customProgramCacheKey = () => key;
  }
  // Pack-Vorderseite: Risslinien-Maske nur am gerissenen Stück anwenden
  const patchBody = (m: THREE.MeshPhysicalMaterial) => patch(m, 'pack-tear-body', 'if ( tornHere ) diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;');
  // Streifen: Naht immer, Packkante nur wo gerissen (sonst zeigt sie die Vorderseite selbst)
  const stripAlpha = 'diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;\nif ( vAlphaMapUv.y < uBandTop && !tornHere ) diffuseColor.a = 0.0;';
  patch(frontMat, 'pack-tear-strip', stripAlpha);
  patch(backMat, 'pack-tear-strip-back', stripAlpha);

  // ---------------------------------------------------------------- Verformung
  const pos = stripGeo.attributes.position as THREE.BufferAttribute;
  const rimPos = stripRimGeo.attributes.position as THREE.BufferAttribute;

  /** Normale der unverformten Fläche (wie am Pack bzw. flach an der Naht). */
  function restNormal(x: number, y: number, out: Float32Array, k: number) {
    if (y >= bodyTop - 1e-6) {
      out[k] = 0;
      out[k + 1] = 0;
      out[k + 2] = 1;
      return;
    }
    const e = 0.002;
    const dzdx = (surfaceZ(x + e, y) - surfaceZ(x - e, y)) / (2 * e);
    const dzdy = (surfaceZ(x, y + e) - surfaceZ(x, y - e)) / (2 * e);
    const l = Math.hypot(dzdx, dzdy, 1);
    out[k] = -dzdx / l;
    out[k + 1] = -dzdy / l;
    out[k + 2] = 1 / l;
  }

  /** Punkt (x, y, z) des Streifens bei Rissfront xf in Richtung dir verformen. */
  function deform(out: Float32Array, src: Float32Array, k: number, xf: number, dir: number) {
    const x = src[k];
    const y = src[k + 1];
    const z = src[k + 2];
    const d = dir > 0 ? xf - x : x - xf; // so weit liegt der Punkt hinter der Rissfront
    if (d <= 0) {
      out[k] = x;
      out[k + 1] = y;
      out[k + 2] = z;
      return;
    }
    const arc = Math.min(d / BEND_R, BEND_MAX);
    const rest = d - arc * BEND_R;
    const along = BEND_R * Math.sin(arc) + rest * Math.cos(arc);
    const out_ = BEND_R * (1 - Math.cos(arc)) + rest * Math.sin(arc);
    const h = (y - yMin) / stripH; // oben hebt sich der Streifen etwas mehr
    out[k] = xf - dir * along;
    out[k + 1] = y + LIFT * d * (0.7 + 0.5 * h);
    out[k + 2] = z + out_;
  }

  let lastP = -1;
  let lastDir = 0;
  function update(progress: number, dir: number) {
    if (progress === lastP && dir === lastDir) return;
    lastP = progress;
    lastDir = dir;
    const xf = dir >= 0 ? -packW / 2 + progress * packW : packW / 2 - progress * packW;
    const arr = pos.array as Float32Array;
    for (let k = 0; k < arr.length; k += 3) deform(arr, base, k, xf, dir || 1);
    pos.needsUpdate = true;
    stripGeo.computeVertexNormals();
    // Unverformte Punkte: exakt die Normale der Fläche darunter (kein Lichtsprung beim Tausch)
    const nrm = stripGeo.attributes.normal.array as Float32Array;
    for (let k = 0; k < arr.length; k += 3) {
      const d = (dir || 1) > 0 ? xf - base[k] : base[k] - xf;
      if (d <= 0) restNormal(base[k], base[k + 1], nrm, k);
    }
    uniforms.uTearX.value = (dir || 1) > 0 ? progress : 1 - progress;
    uniforms.uTearDir.value = dir || 1;
    const rArr = rimPos.array as Float32Array;
    for (let k = 0; k < rArr.length; k += 3) deform(rArr, stripRimBase, k, xf, dir || 1);
    rimPos.needsUpdate = true;
    // Fasern nur am schon gerissenen Stück
    const torn = Math.round(progress * N);
    const start = dir >= 0 ? 0 : (N - torn) * 6;
    bodyRimGeo.setDrawRange(start, torn * 6);
    stripRimGeo.setDrawRange(start, torn * 6);
  }

  // ---------------------------------------------------------------- Texturen
  function drawStrip(front: CanvasImageSource, crimp: HTMLCanvasElement, maps?: CanvasImageSource) {
    const ctx = stripCanvas.getContext('2d')!;
    const pxPerUnit = texH / stripH;
    const crimpPx = crimpH * pxPerUnit;
    ctx.clearRect(0, 0, texW, texH);
    ctx.drawImage(crimp, 0, 0, texW, crimpPx);
    // Packkante: oberes Stück der Pack-Grafik
    const img = front as HTMLImageElement | HTMLCanvasElement;
    const iw = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const ih = 'naturalHeight' in img ? img.naturalHeight : img.height;
    const srcH = ((bodyH / 2 - yMin) / bodyH) * ih;
    ctx.drawImage(img, 0, 0, iw, srcH, 0, crimpPx, texW, texH - crimpPx);
    stripTex.needsUpdate = true;

    // Ausschnitt: weiß, wo Folie ist (Naht samt Loch/Zacken aus ihrer Alpha, Packkante voll)
    const a = alphaCanvas.getContext('2d')!;
    a.globalCompositeOperation = 'source-over';
    a.fillStyle = '#000';
    a.fillRect(0, 0, texW, texH);
    const tmp = document.createElement('canvas');
    tmp.width = texW;
    tmp.height = Math.ceil(crimpPx);
    const t = tmp.getContext('2d')!;
    t.drawImage(crimp, 0, 0, texW, crimpPx);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = '#fff';
    t.fillRect(0, 0, texW, tmp.height);
    a.drawImage(tmp, 0, 0);
    a.fillStyle = '#fff';
    a.fillRect(0, crimpPx - 1, texW, texH - crimpPx + 1);
    alphaTex.needsUpdate = true;

    if (!maps) return;
    // Materialkarte (R Relief, G Rauheit, B Metall): Naht = Silber mit Rillen-Relief,
    // Packkante = Ausschnitt der Karte der Vorderseite
    const m = mapsCanvas.getContext('2d')!;
    const mw = mapsCanvas.width;
    const mh = mapsCanvas.height;
    const mc = crimpPx / 2;
    m.globalCompositeOperation = 'source-over';
    m.drawImage(crimp, 0, 0, mw, mc);
    m.globalCompositeOperation = 'multiply';
    m.fillStyle = '#ff0000';
    m.fillRect(0, 0, mw, mc);
    m.globalCompositeOperation = 'lighter';
    m.fillStyle = 'rgb(0,135,185)';
    m.fillRect(0, 0, mw, mc);
    m.globalCompositeOperation = 'source-over';
    const mi = maps as HTMLImageElement;
    const mih = mi.naturalHeight || (maps as HTMLCanvasElement).height;
    const miw = mi.naturalWidth || (maps as HTMLCanvasElement).width;
    m.drawImage(mi, 0, 0, miw, ((bodyH / 2 - yMin) / bodyH) * mih, 0, mc, mw, mh - mc);
    mapsTex.needsUpdate = true;
  }

  /** Einstellungen der Pack-Vorderseite übernehmen (Glanz, Klarlack, Relief …). */
  function matchBody(body: THREE.MeshPhysicalMaterial) {
    frontMat.envMapIntensity = body.envMapIntensity;
    frontMat.clearcoat = body.clearcoat;
    frontMat.clearcoatRoughness = body.clearcoatRoughness;
    frontMat.iridescence = body.iridescence;
    frontMat.iridescenceIOR = body.iridescenceIOR;
    frontMat.iridescenceThicknessRange = body.iridescenceThicknessRange;
    frontMat.metalness = 1;
    frontMat.roughness = 1;
    frontMat.metalnessMap = mapsTex;
    frontMat.roughnessMap = mapsTex;
    frontMat.bumpMap = mapsTex;
    frontMat.bumpScale = body.bumpScale;
    frontMat.needsUpdate = true;
  }

  // Pack-Vorderseite oberhalb der Risslinie ausschneiden (minimal überlappend)
  const bodyAlphaCanvas = document.createElement('canvas');
  bodyAlphaCanvas.width = 512;
  bodyAlphaCanvas.height = Math.round((512 * bodyH) / packW);
  {
    const ctx = bodyAlphaCanvas.getContext('2d')!;
    const H = bodyAlphaCanvas.height;
    const toPx = (y: number) => ((bodyH / 2 - y) / bodyH) * H;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, H);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(512, 0);
    for (let i = N; i >= 0; i--) ctx.lineTo((i / N) * 512, toPx(jag[i] + 0.003));
    ctx.closePath();
    ctx.fill();
  }
  const bodyAlpha = new THREE.CanvasTexture(bodyAlphaCanvas);

  const mats = [frontMat, backMat, stripFiberMat];
  return {
    strip,
    intactTop,
    bodyRim,
    bodyAlpha,
    patchBody,
    drawStrip: (front, crimp, maps) => {
      drawStrip(front, crimp, maps);
      if (maps && bodyMaterial) matchBody(bodyMaterial);
    },
    frontMaterial: frontMat,
    update,
    setOpacity: (v) => {
      for (const m of mats) m.opacity = v;
    },
    reset: () => {
      strip.position.set(0, yCenter, 0);
      strip.rotation.set(0, 0, 0);
      lastP = -1;
      update(0, 1);
    },
    dispose: () => {
      stripGeo.dispose();
      crimpGeo.dispose();
      bodyRimGeo.dispose();
      stripRimGeo.dispose();
      stripTex.dispose();
      alphaTex.dispose();
      mapsTex.dispose();
      bodyAlpha.dispose();
      for (const m of mats) m.dispose();
      bodyFiberMat.dispose();
    },
  };
}
