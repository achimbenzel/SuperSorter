// 3D-Objekte: Sammelkarte (Vorder-/Rückseite mit Kante) und Booster-Pack.

import * as THREE from 'three';
import type { CardDef } from '../game/cards/cards';
import { createHoloMaterial } from './holoMaterial';
import { ART_RECT_UV, drawCardBack, drawCardFront, drawCrimp, drawPackBack, drawPackFront } from './textures';

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
  const frontTex = texture(drawCardFront(card), renderer);
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

export const PACK_W = 1.18;
export const PACK_H = PACK_W * 1.6;
export const CRIMP_H = 0.15;

/** "Kissen": Fläche, die in der Mitte leicht nach vorn gewölbt ist (gefüllte Folie). */
function pillowGeometry(w: number, h: number, bulge: number, v0: number, v1: number) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 32);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    const y = uv.getY(i) * 2 - 1; // Wölbung läuft an den Nähten flach aus
    const z = bulge * Math.pow(Math.max(0, 1 - x * x), 0.55) * Math.pow(Math.max(0, 1 - y * y), 0.55);
    pos.setZ(i, z);
    uv.setY(i, uv.getY(i) * (v1 - v0) + v0);
  }
  geo.computeVertexNormals();
  return geo;
}

export interface PackObject {
  group: THREE.Group;
  /** Obere Naht, die beim Aufreißen davonfliegt. */
  top: THREE.Group;
  body: THREE.Group;
  setOpacity: (v: number) => void;
  setTopOpacity: (v: number) => void;
  dispose: () => void;
}

export function createPack(renderer: THREE.WebGLRenderer, envMap: THREE.Texture): PackObject {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  const frontTex = keep(texture(drawPackFront(), renderer));
  const backTex = keep(texture(drawPackBack(), renderer));
  const foil = (map: THREE.Texture) =>
    keep(
      new THREE.MeshPhysicalMaterial({
        map,
        envMap,
        metalness: 0.4,
        roughness: 0.38,
        envMapIntensity: 0.55,
        iridescence: 0.7,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [180, 520],
        clearcoat: 0.3,
        clearcoatRoughness: 0.35,
        transparent: true,
      }),
    );
  const frontMat = foil(frontTex);
  const backMat = foil(backTex);

  const bodyH = PACK_H - 2 * CRIMP_H;
  const body = new THREE.Group();
  const bodyFront = new THREE.Mesh(keep(pillowGeometry(PACK_W, bodyH, 0.09, CRIMP_H / PACK_H, 1 - CRIMP_H / PACK_H)), frontMat);
  const bodyBack = new THREE.Mesh(keep(pillowGeometry(PACK_W, bodyH, 0.09, CRIMP_H / PACK_H, 1 - CRIMP_H / PACK_H)), backMat);
  bodyBack.rotation.y = Math.PI;
  body.add(bodyFront, bodyBack);

  const crimpMat = (top: boolean) => {
    const t = keep(texture(drawCrimp(top), renderer));
    return keep(new THREE.MeshStandardMaterial({ map: t, envMap, metalness: 0.85, roughness: 0.35, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
  };
  const crimpGeo = keep(new THREE.PlaneGeometry(PACK_W, CRIMP_H));
  const top = new THREE.Group();
  top.add(new THREE.Mesh(crimpGeo, crimpMat(true)));
  top.position.y = PACK_H / 2 - CRIMP_H / 2;
  const bottom = new THREE.Mesh(crimpGeo, crimpMat(false));
  bottom.position.y = -PACK_H / 2 + CRIMP_H / 2;
  body.add(bottom);

  const group = new THREE.Group();
  group.add(body, top);

  const topMat = (top.children[0] as THREE.Mesh).material as THREE.Material;
  const bodyMats = [frontMat, backMat, bottom.material as THREE.Material];
  return {
    group,
    top,
    body,
    setOpacity: (v) => {
      for (const m of bodyMats) m.opacity = v;
      group.visible = v > 0.001;
    },
    setTopOpacity: (v) => {
      topMat.opacity = v;
      top.visible = v > 0.001;
    },
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
