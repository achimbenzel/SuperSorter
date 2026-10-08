// 3D-Objekte: Sammelkarte (Vorder-/Rückseite mit Kante) und Booster-Pack.

import * as THREE from 'three';
import type { CardDef } from '../game/cards/cards';
import { createHoloMaterial } from './holoMaterial';
import { PACK_TEXTURE } from '../assets';
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

/**
 * "Kissen": gefüllte Folie, in der Mitte nach vorn gewölbt, an den Nähten flach –
 * dort mit feinen Knitterfalten, in denen sich das Licht fängt.
 */
function pillowGeometry(w: number, h: number, bulge: number) {
  const geo = new THREE.PlaneGeometry(w, h, 48, 72);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    const y = pos.getY(i) / (h / 2);
    let z = bulge * Math.pow(Math.max(0, 1 - x * x), 0.55) * Math.pow(Math.max(0, 1 - y * y), 0.55);
    const seam = Math.max(0, (Math.abs(y) - 0.8) / 0.2);
    z += 0.012 * seam * Math.sin(x * 23 + Math.sign(y) * 1.7) * (1 - 0.6 * x * x);
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export interface PackObject {
  group: THREE.Group;
  /** Obere Naht, die beim Aufreißen davonfliegt. */
  top: THREE.Group;
  body: THREE.Group;
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

  const frontMat = keep(
    new THREE.MeshPhysicalMaterial({
      map: keep(texture(drawPackFront(), renderer)),
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
  const bodyGeo = keep(pillowGeometry(PACK_W, BODY_H, 0.09));
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
        envMapIntensity: 1.3,
        metalness: 1,
        roughness: 0.3,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      }),
    );
  };
  const crimpGeo = keep(new THREE.PlaneGeometry(PACK_W, CRIMP_H));
  const top = new THREE.Group();
  top.add(new THREE.Mesh(crimpGeo, crimpMat(true)));
  top.position.y = BODY_H / 2 + CRIMP_H / 2;
  const bottom = new THREE.Mesh(crimpGeo, crimpMat(false));
  bottom.position.y = -BODY_H / 2 - CRIMP_H / 2;
  body.add(bottom);

  const group = new THREE.Group();
  group.add(body, top);

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
    })
    .catch(() => {
      /* Ersatz-Vorderseite bleibt */
    });

  const topMat = (top.children[0] as THREE.Mesh).material as THREE.Material;
  const bodyMats = [frontMat, backMat, bottom.material as THREE.Material];
  return {
    group,
    top,
    body,
    ready,
    setOpacity: (v) => {
      for (const m of bodyMats) m.opacity = v;
      group.visible = v > 0.001;
    },
    setTopOpacity: (v) => {
      topMat.opacity = v;
      top.visible = v > 0.001;
    },
    dispose: () => {
      disposed = true;
      disposables.forEach((d) => d.dispose());
    },
  };
}
