// 3D-Objekte: Sammelkarte (Vorder-/Rückseite mit Kante) und Booster-Pack.

import * as THREE from 'three';
import type { CardDef } from '../game/cards/cards';
import { createHoloMaterial } from './holoMaterial';
import { PACK_TEXTURE } from '../assets';
import { createTearRig, type TearRig } from './packTear';
import { ART_RECT_UV, drawCardBack, drawCardFront, drawCrimp, drawPackBack, drawPackFront, isArtLoaded, loadArt } from './textures';

export const CARD_W = 1;
export const CARD_H = 88 / 63;
const CARD_R = 0.05;
const CARD_DEPTH = 0.012;

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Flache Kartenform mit UVs von 0..1 über die ganze Karte. */
function cardFaceGeometry() {
  const geo = new THREE.ShapeGeometry(roundedRectShape(CARD_W, CARD_H, CARD_R), 8);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / CARD_W + 0.5, pos.getY(i) / CARD_H + 0.5);
  uv.needsUpdate = true;
  return geo;
}

function texture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export interface CardObject {
  group: THREE.Group;
  card: CardDef;
  materials: THREE.ShaderMaterial[];
  /** Deckkraft aller Teile setzen (für Ein-/Ausblenden). */
  setOpacity: (v: number) => void;
  /**
   * > 0: Karte immer vor allem anderen zeichnen (ohne Tiefentest, in dieser
   * Reihenfolge). Sonst schneidet die gekippte oberste Karte in den Stapel dahinter.
   */
  setOnTop: (order: number) => void;
  dispose: () => void;
}

/** Karte als Gruppe: Vorderseite (+z), Rückseite (-z), Kante. Vorderseite zeigt nach +z. */
export function createCard(card: CardDef, renderer: THREE.WebGLRenderer): CardObject {
  const group = new THREE.Group();
  const faceGeo = cardFaceGeometry();
  const frontCanvas = drawCardFront(card);
  const frontTex = texture(frontCanvas, renderer);
  let disposed = false;
  // Illustration noch nicht geladen: nachzeichnen, sobald sie da ist (meist < 100 ms).
  if (!isArtLoaded(card.art)) {
    void loadArt(card.art).then((img) => {
      if (!img || disposed) return;
      drawCardFront(card, frontCanvas);
      frontTex.needsUpdate = true;
    });
  }
  const backTex = texture(drawCardBack(), renderer);
  const front = createHoloMaterial({
    map: frontTex,
    holo: card.rarity === 'holo' ? 1 : 0,
    rare: card.rarity === 'rare' ? 1 : 0,
    artRect: ART_RECT_UV,
  });
  const back = createHoloMaterial({ map: backTex });

  const frontMesh = new THREE.Mesh(faceGeo, front);
  frontMesh.position.z = CARD_DEPTH / 2 + 0.0005;
  const backMesh = new THREE.Mesh(faceGeo, back);
  backMesh.rotation.y = Math.PI;
  backMesh.position.z = -CARD_DEPTH / 2 - 0.0005;

  const edgeGeo = new THREE.ExtrudeGeometry(roundedRectShape(CARD_W, CARD_H, CARD_R), { depth: CARD_DEPTH, bevelEnabled: false, curveSegments: 8 });
  edgeGeo.translate(0, 0, -CARD_DEPTH / 2);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xe9e4d8, transparent: true });
  // Gruppe 0 = Deckflächen (unsichtbar, die liefern frontMesh/backMesh), 1 = Kante
  const edge = new THREE.Mesh(edgeGeo, [new THREE.MeshBasicMaterial({ visible: false }), edgeMat]);

  group.add(edge, frontMesh, backMesh);
  const materials = [front, back];
  // Reihenfolge ohne Tiefentest: Kante, dann Flächen (die abgewandte wird weggeschnitten)
  const layers: [THREE.Mesh, THREE.Material[]][] = [
    [edge, [edgeMat]],
    [frontMesh, [front]],
    [backMesh, [back]],
  ];
  return {
    group,
    card,
    materials,
    setOpacity: (v) => {
      for (const m of materials) m.uniforms.uOpacity.value = v;
      edgeMat.opacity = v;
      group.visible = v > 0.001;
    },
    setOnTop: (order) => {
      layers.forEach(([mesh, mats], i) => {
        mesh.renderOrder = order > 0 ? order + i : 0;
        for (const m of mats) m.depthTest = order <= 0;
      });
    },
    dispose: () => {
      disposed = true;
      faceGeo.dispose();
      edgeGeo.dispose();
      frontTex.dispose();
      backTex.dispose();
      front.dispose();
      back.dispose();
      edgeMat.dispose();
    },
  };
}

// ---------------------------------------------------------------- Booster-Pack

/** Seitenverhältnis der Pack-Grafik (public/assets/pack/front.webp, Breite : Höhe). */
const PACK_ART_ASPECT = 687 / 1024;
export const PACK_W = 1.18;
export const CRIMP_H = 0.16;
const BODY_H = PACK_W / PACK_ART_ASPECT;
export const PACK_H = BODY_H + 2 * CRIMP_H;
/** Der Abreißstreifen reicht so weit unter die obere Naht (Risslinie). */
export const TEAR_BAND_H = 0.075;
const BULGE = 0.09;

/**
 * "Kissen": gefüllte Folie, in der Mitte nach vorn gewölbt, an den Nähten flach –
 * dort mit feinen Knitterfalten, in denen sich das Licht fängt. (x, y) in
 * Pack-Koordinaten, außerhalb der Folie 0.
 */
function pillowZ(px: number, py: number) {
  const x = px / (PACK_W / 2);
  const y = py / (BODY_H / 2);
  if (Math.abs(y) >= 1 || Math.abs(x) >= 1) return 0;
  let z = BULGE * Math.pow(1 - x * x, 0.55) * Math.pow(1 - y * y, 0.55);
  const seam = Math.max(0, (Math.abs(y) - 0.8) / 0.2);
  z += 0.008 * seam * Math.sin(x * 23 + Math.sign(y) * 1.7) * (1 - 0.6 * x * x);
  return z;
}

function pillowGeometry() {
  const geo = new THREE.PlaneGeometry(PACK_W, BODY_H, 48, 72);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pillowZ(pos.getX(i), pos.getY(i)));
  geo.computeVertexNormals();
  return geo;
}

export interface PackObject {
  group: THREE.Group;
  /** Abreißstreifen (obere Naht + Packkante), fliegt nach dem Aufreißen davon. */
  top: THREE.Group;
  body: THREE.Group;
  /** Steuerung des Aufreißens (Rissfront, Aufrollen, Fasern). */
  tear: TearRig;
  /** false: unversehrtes Modell (keine Risslinie), true: geteiltes Modell zum Aufreißen. */
  setTorn: (torn: boolean) => void;
  /** fn ausführen, während beide Modelle sichtbar sind (Shader vorab übersetzen). */
  withAllVisible: (fn: () => void) => void;
  /** Erfüllt, sobald die Pack-Grafik geladen ist (oder nicht geladen werden konnte). */
  ready: Promise<void>;
  setOpacity: (v: number) => void;
  setTopOpacity: (v: number) => void;
  dispose: () => void;
}

/**
 * Booster-Pack: Vorderseite mit der Pack-Grafik als metallische Folie. Eine
 * Materialkarte (maps.png, s. scripts/pack-texture.py) sagt, wo Metall ist
 * (Rahmen, Ornamente, goldene Schrift: spiegelt die Umgebung) und wo nicht (das
 * Gemälde), und gibt den Ornamenten Relief. Bis die Grafik geladen ist, zeigt die
 * Folie eine gezeichnete Ersatz-Vorderseite.
 */
export function createPack(renderer: THREE.WebGLRenderer, envMap: THREE.Texture): PackObject {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  const fallbackFront = drawPackFront();
  const frontMat = keep(
    new THREE.MeshPhysicalMaterial({
      map: keep(texture(fallbackFront, renderer)),
      envMap,
      envMapIntensity: 1,
      metalness: 0.5,
      roughness: 0.4,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
      iridescence: 0.18,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [200, 480],
      transparent: true,
      alphaTest: 0.5,
    }),
  );
  const backMat = keep(
    new THREE.MeshPhysicalMaterial({
      map: keep(texture(drawPackBack(), renderer)),
      envMap,
      envMapIntensity: 1.1,
      metalness: 0.75,
      roughness: 0.38,
      clearcoat: 0.4,
      transparent: true,
    }),
  );

  const body = new THREE.Group();
  const bodyGeo = keep(pillowGeometry());
  const bodyFront = new THREE.Mesh(bodyGeo, frontMat);
  const bodyBack = new THREE.Mesh(bodyGeo, backMat);
  bodyBack.rotation.y = Math.PI;
  body.add(bodyFront, bodyBack);

  // Nähte: Silberfolie mit Rillen (Relief aus derselben Zeichnung), Stanzungen per alphaTest
  const crimpMat = (top: boolean) => {
    const t = keep(texture(drawCrimp(top), renderer));
    return keep(
      new THREE.MeshStandardMaterial({
        map: t,
        bumpMap: t,
        bumpScale: 0.4,
        envMap,
        envMapIntensity: 1,
        metalness: 0.9,
        roughness: 0.4,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      }),
    );
  };
  const crimpGeo = keep(new THREE.PlaneGeometry(PACK_W, CRIMP_H));
  const bottom = new THREE.Mesh(crimpGeo, crimpMat(false));
  bottom.position.y = -BODY_H / 2 - CRIMP_H / 2;
  body.add(bottom);

  // Oben: Abreißstreifen (Naht + Packkante) mit gezackter Risslinie
  const topCrimp = drawCrimp(true);
  const tear = keep(createTearRig({ packW: PACK_W, bodyH: BODY_H, crimpH: CRIMP_H, bandH: TEAR_BAND_H, amp: 0.014, surfaceZ: pillowZ }, envMap, renderer, frontMat));
  tear.drawStrip(fallbackFront, topCrimp);
  tear.update(0, 1);
  // Vorderseite bleibt immer dasselbe Modell; ausgeschnitten wird nur am gerissenen Stück
  frontMat.alphaMap = tear.bodyAlpha;
  tear.patchBody(frontMat);
  body.add(tear.bodyRim);
  const top = tear.strip;

  const group = new THREE.Group();
  group.add(body, top, tear.intactTop);

  // Zu Beginn: unversehrte Naht; beim ersten Riss übernimmt der Streifen
  let torn = false;
  const cut = [top, tear.bodyRim];
  const intact = [tear.intactTop];
  const setTorn = (on: boolean) => {
    torn = on;
    for (const o of cut) o.visible = on;
    for (const o of intact) o.visible = !on;
  };
  setTorn(false);
  // Umgebung leicht gedreht: In Ruhelage spiegelt die Folie sonst genau die hellste
  // Lampe (Naht und Oberkante wirkten weiß überstrahlt); beim Kippen wandert der Glanz.
  group.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      if ('envMapRotation' in m) (m as THREE.MeshStandardMaterial).envMapRotation.set(0.35, 0.55, 0);
    }
  });

  // Pack-Grafik + Materialkarte nachladen
  let disposed = false;
  const loader = new THREE.TextureLoader();
  const ready = Promise.all([loader.loadAsync(PACK_TEXTURE.front), loader.loadAsync(PACK_TEXTURE.maps)])
    .then(([front, maps]) => {
      if (disposed) {
        front.dispose();
        maps.dispose();
        return;
      }
      keep(front);
      keep(maps);
      front.colorSpace = THREE.SRGBColorSpace;
      front.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      maps.colorSpace = THREE.NoColorSpace;
      frontMat.map?.dispose();
      frontMat.map = front;
      frontMat.metalnessMap = maps; // Blau
      frontMat.roughnessMap = maps; // Grün
      frontMat.bumpMap = maps; // Rot = Höhe
      frontMat.bumpScale = 2.2;
      frontMat.metalness = 1;
      frontMat.roughness = 1;
      frontMat.needsUpdate = true;
      // Streifen bekommt dieselbe Grafik und dasselbe Material (nahtloser Übergang)
      tear.drawStrip(front.image as HTMLImageElement, topCrimp, maps.image as HTMLImageElement);
    })
    .catch(() => {
      /* Ersatz-Vorderseite bleibt */
    });

  const bodyMats = [frontMat, backMat, bottom.material as THREE.Material, tear.bodyRim.material as THREE.Material];
  return {
    group,
    top,
    body,
    tear,
    ready,
    setOpacity: (v) => {
      for (const m of bodyMats) m.opacity = v;
      group.visible = v > 0.001;
    },
    setTopOpacity: (v) => {
      tear.setOpacity(v);
      top.visible = torn && v > 0.001;
    },
    setTorn,
    withAllVisible: (fn) => {
      const was = torn;
      for (const o of [...cut, ...intact]) o.visible = true;
      try {
        fn();
      } finally {
        setTorn(was);
      }
    },
    dispose: () => {
      disposed = true;
      disposables.forEach((d) => d.dispose());
    },
  };
}
