// Booster-Pack öffnen in 3D (Ablauf wie in Sammelkarten-Apps):
//
//   pack     Pack schwebt; ziehen = kippen (federt zurück); über die obere Naht wischen
//            = aufreißen (alternativ tear() per Knopf)
//   opening  Naht fliegt weg, Karten steigen verdeckt aus dem Pack, Pack fällt weg
//   reveal   oberste Karte antippen = umdrehen; aufgedeckt: ziehen = kippen (Holo!),
//            antippen oder wischen = weg, nächste Karte
//   done     alle Karten gesehen -> onFinished
//
// Die Rare liegt zuletzt; verdeckt glüht sie schon (Gold bzw. Regenbogen bei Holo).

import * as THREE from 'three';
import { playSfx } from '../audio/sfx';
import type { CardDef } from '../game/cards/cards';
import { CARD_H, CARD_W, createCard, createPack, CRIMP_H, PACK_H, PACK_W, TEAR_BAND_H, type CardObject, type PackObject } from './meshes';
import { ease, Stage } from './stage';
import { drawGlow } from './textures';

export type PackHint = 'swipe' | 'flip' | 'next' | null;

export interface TearLine {
  x0: number;
  x1: number;
  y: number;
}

export interface PackOpeningEvents {
  /** Pack reißt auf: Inhalt ziehen (und speichern). */
  requestCards: () => CardDef[];
  onHint: (hint: PackHint) => void;
  onTearLine: (line: TearLine) => void;
  onCardShown: (index: number, card: CardDef) => void;
  onCardGone: (index: number) => void;
  onFinished: () => void;
}

type Phase = 'pack' | 'opening' | 'reveal' | 'busy' | 'done';

interface Pointer {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t0: number;
  /** Zeitpunkt und x der letzten Bewegung (für die Wisch-Geschwindigkeit). */
  tPrev: number;
  xPrev: number;
  vx: number;
  dragged: boolean;
  /** Pack-Phase: Geste noch offen, Aufreißen oder Kippen. */
  mode: 'undecided' | 'tear' | 'tilt';
  /** Beginnt an der oberen Kante des Packs (dort reißt man auf). */
  tearZone: boolean;
}

const TAP_PX = 10;

/** Kamera: Abstand und Höhe (verschoben, damit das Objekt zwischen den Overlays sitzt). */
interface View {
  z: number;
  y: number;
}

// Platz in px, den die React-Overlays oben/unten brauchen (Titel, Knopf, Hinweise).
const PACK_PAD = { top: 48, bottom: 150 };
const CARDS_PAD = { top: 58, bottom: 104 };

export class PackOpening extends Stage {
  private pack: PackObject;
  private cards: CardObject[] = [];
  private index = 0;
  private flipped = false;
  private phase: Phase = 'pack';
  private glow: THREE.Sprite;
  private glowTex: THREE.CanvasTexture;
  private glowTarget = 0;
  private pointer: Pointer | null = null;
  /** Ziel-Kippung durch den Finger und geglätteter Ist-Wert. */
  private tilt = { yaw: 0, pitch: 0, curYaw: 0, curPitch: 0 };
  private flipAngle = Math.PI;
  private viewPack: View = { z: 6, y: 0 };
  private viewCards: View = { z: 5, y: 0 };
  private shown = false;
  private disposedPack = false;
  /** Aufreißen: geglätteter Fortschritt, Ziel (vom Finger), Richtung (0 = noch nicht begonnen). */
  private tearP = 0;
  private tearTarget = 0;
  private tearDir = 0;
  /** Finger reißt gerade. */
  private tearing = false;
  /** Nächste Schwelle für ein Knister-Geräusch. */
  private tearTick = 0;
  /** Zug am Pack (0..1) – lässt es leicht zittern. */
  private tension = 0;
  private completing = false;
  /** Versatz durch das Einfliegen (wird im Frame zur Schwebebewegung addiert). */
  private drop = { y: 0, rx: 0, ry: 0, rz: 0 };
  /** Zählt bei reset()/skip() hoch: laufende Abläufe erkennen daran, dass sie veraltet sind. */
  private run = 0;

  constructor(
    container: HTMLElement,
    private ev: PackOpeningEvents,
  ) {
    super(container);
    this.pack = createPack(this.renderer, this.envMap);
    this.scene.add(this.pack.group);

    this.glowTex = new THREE.CanvasTexture(drawGlow());
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffd23f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.glow.scale.set(CARD_W * 2.3, CARD_H * 2.0, 1);
    this.glow.renderOrder = -1;
    this.scene.add(this.glow);

    this.layout();
    this.applyView(this.viewPack);
    // Erst einfliegen, wenn die Pack-Grafik da ist (aus dem Cache meist sofort).
    this.pack.group.visible = false;
    const show = () => {
      if (this.shown || this.disposedPack) return;
      this.shown = true;
      this.pack.group.visible = true;
      // Shader beider Modelle (unversehrt / geteilt) jetzt übersetzen, nicht erst beim Reißen
      this.pack.withAllVisible(() => this.renderer.compile(this.scene, this.camera));
      void this.dropIn();
    };
    void this.pack.ready.then(show);
    window.setTimeout(show, 2500);

    const c = this.canvas;
    c.addEventListener('pointerdown', this.down);
    c.addEventListener('pointermove', this.move);
    c.addEventListener('pointerup', this.up);
    c.addEventListener('pointercancel', this.cancel);
    this.start();
    ev.onHint('swipe');
    // Nur in der Entwicklung: Zugriff für Tests (z. B. Modelltausch pixelgenau prüfen)
    if (import.meta.env.DEV) (window as { __packOpening?: PackOpening }).__packOpening = this;
  }

  // ------------------------------------------------------------ Layout

  protected layout() {
    if (!this.pack) return;
    this.viewPack = this.fitView(PACK_W, PACK_H, PACK_PAD, 0.92, 0.6);
    this.viewCards = this.fitView(CARD_W, CARD_H, CARDS_PAD, 0.94, 0.66);
    if (this.phase === 'pack') this.applyView(this.viewPack);
    else if (this.phase !== 'opening') this.applyView(this.viewCards);
    this.emitTearLine();
  }

  /** Objekt (w × h) füllt `fill` des freien Bands zwischen den Overlays und sitzt in dessen Mitte. */
  private fitView(w: number, h: number, pad: { top: number; bottom: number }, fill: number, fillW: number): View {
    const free = Math.max(0.35, (this.height - pad.top - pad.bottom) / this.height);
    const z = this.fitDistance(w, h, free * fill, fillW);
    const worldPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * z) / this.height;
    return { z, y: -((pad.bottom - pad.top) / 2) * worldPerPx };
  }

  private applyView(v: View) {
    this.camera.position.set(0, v.y, v.z);
  }

  /** Bildschirm-Rechteck des Packs (ohne Kippung) in Container-Pixeln. */
  private packRect() {
    const y = this.pack.group.position.y;
    const a = this.project(new THREE.Vector3(-PACK_W / 2, y + PACK_H / 2, 0));
    const b = this.project(new THREE.Vector3(PACK_W / 2, y - PACK_H / 2, 0));
    return { left: a.x, right: b.x, top: a.y, bottom: b.y, width: b.x - a.x, height: b.y - a.y };
  }

  /** Bildschirm-Rechteck der obersten Karte (im Stapel, ungekippt) in Container-Pixeln. */
  cardRect() {
    const a = this.project(new THREE.Vector3(-CARD_W / 2, CARD_H / 2, 0));
    const b = this.project(new THREE.Vector3(CARD_W / 2, -CARD_H / 2, 0));
    return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
  }

  private emitTearLine() {
    if (this.phase !== 'pack') return;
    const r = this.packRect();
    this.ev.onTearLine({ x0: r.left, x1: r.right, y: this.tearLineY(r) });
  }

  /** Risslinie (unterhalb der Naht) in Container-Pixeln. */
  private tearLineY(r: { top: number; height: number }) {
    return r.top + ((CRIMP_H + TEAR_BAND_H) / PACK_H) * r.height;
  }

  // ------------------------------------------------------------ Gesten

  private local(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down = (e: PointerEvent) => {
    const p = this.local(e);
    const now = performance.now();
    let tearZone = false;
    if (this.phase === 'pack') {
      const r = this.packRect();
      tearZone = p.y > r.top - 60 && p.y < this.tearLineY(r) + r.height * 0.16 && p.x > r.left - 50 && p.x < r.right + 50;
    }
    this.pointer = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: now, tPrev: now, xPrev: p.x, vx: 0, dragged: false, mode: 'undecided', tearZone };
    this.canvas.setPointerCapture(e.pointerId);
  };

  private move = (e: PointerEvent) => {
    const ptr = this.pointer;
    if (!ptr || ptr.id !== e.pointerId) return;
    const p = this.local(e);
    const now = performance.now();
    const dtm = Math.max(1, now - ptr.tPrev);
    ptr.vx = ptr.vx * 0.4 + ((p.x - ptr.xPrev) / dtm) * 0.6;
    ptr.tPrev = now;
    ptr.xPrev = p.x;
    ptr.x = p.x;
    ptr.y = p.y;
    const dx = p.x - ptr.x0;
    const dy = p.y - ptr.y0;
    if (this.phase === 'pack') {
      if (ptr.mode === 'undecided' && Math.hypot(dx, dy) > TAP_PX) {
        this.ev.onHint(null);
        if (ptr.tearZone && this.shown && !this.completing && Math.abs(dx) > Math.abs(dy) * 0.8) {
          // An der Kante quer gewischt: aufreißen – der Riss folgt dem Finger
          ptr.mode = 'tear';
          if (!this.tearDir) this.beginTear(Math.sign(dx) || 1);
          this.tearing = true;
          this.tilt.yaw = this.tilt.pitch = 0;
        } else {
          ptr.mode = 'tilt';
          ptr.dragged = true;
        }
      }
      if (ptr.mode === 'tear') {
        const r = this.packRect();
        const u = (p.x - r.left) / r.width;
        const along = this.tearDir > 0 ? u : 1 - u;
        // nur vorwärts: Gerissenes bleibt gerissen
        this.tearTarget = Math.max(this.tearTarget, THREE.MathUtils.clamp(along + 0.03, 0, 1));
        if (this.tearTarget > 0.97) this.tearTarget = 1;
      } else if (ptr.mode === 'tilt') {
        this.tilt.yaw = THREE.MathUtils.clamp(dx * 0.006, -0.65, 0.65);
        this.tilt.pitch = THREE.MathUtils.clamp(dy * 0.005, -0.45, 0.45);
      }
    } else if (this.phase === 'reveal' && this.flipped) {
      this.tilt.yaw = THREE.MathUtils.clamp(dx * 0.0075, -0.8, 0.8);
      this.tilt.pitch = THREE.MathUtils.clamp(dy * 0.006, -0.55, 0.55);
    }
  };

  private up = (e: PointerEvent) => {
    const ptr = this.pointer;
    this.pointer = null;
    this.tilt.yaw = this.tilt.pitch = 0;
    if (!ptr || ptr.id !== e.pointerId) return;
    const dx = ptr.x - ptr.x0;
    const dy = ptr.y - ptr.y0;
    const dist = Math.hypot(dx, dy);
    if (this.phase === 'pack') {
      if (ptr.mode === 'tear') {
        this.tearing = false;
        // Über die Hälfte gerissen: der Rest reißt von selbst, sonst bleibt der Riss stehen
        if (this.tearTarget >= 0.5) this.tearTarget = 1;
        else this.ev.onHint('swipe');
      } else if (dist < TAP_PX) this.nudge();
      else if (ptr.dragged) this.ev.onHint('swipe');
    } else if (this.phase === 'reveal') {
      if (dist < TAP_PX) {
        if (this.flipped) void this.dismiss(1);
        else void this.flip();
      } else if (this.flipped && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.3 && (performance.now() - ptr.t0 < 500 || Math.abs(ptr.vx) > 0.4 || Math.abs(dx) > 160)) {
        // Wischen (kurz, mit Schwung oder weit zur Seite) = weg; kurzes langsames Ziehen = nur Kippen
        void this.dismiss(Math.sign(dx));
      }
    }
  };

  private cancel = () => {
    this.pointer = null;
    this.tearing = false;
    this.tilt.yaw = this.tilt.pitch = 0;
  };

  // ------------------------------------------------------------ Ablauf

  private async dropIn() {
    const d = this.drop;
    const set = (v: number) => {
      d.y = 2.2 * (1 - v);
      d.rx = 0.4 * (1 - v);
      d.ry = -0.6 * (1 - v);
      d.rz = 0.15 * (1 - v);
    };
    set(0);
    await this.tween(750, set, ease.outBack);
    this.emitTearLine();
  }

  /** Antippen des Packs: kurz wackeln (Hinweis aufs Wischen kommt aus React). */
  private nudge() {
    const g = this.pack.body;
    void this.tween(420, (v) => (g.rotation.z = Math.sin(v * Math.PI * 4) * 0.05 * (1 - v)), ease.linear);
    this.ev.onHint('swipe');
  }

  /** Erster Riss: nahtlos vom unversehrten auf das geteilte Modell wechseln. */
  private beginTear(dir: number) {
    this.tearDir = dir;
    this.tearTick = 0.03;
    this.pack.tear.update(0, dir);
    this.pack.setTorn(true);
  }

  /** Aufreißen per Knopf: Der Riss läuft von selbst über das Pack (`dir` +1 = nach rechts). */
  tear(dir = 1) {
    if (this.phase !== 'pack' || !this.shown || this.completing) return;
    if (!this.tearDir) this.beginTear(dir);
    this.ev.onHint(null);
    const from = this.tearTarget;
    void this.tween(700, (v) => (this.tearTarget = Math.max(this.tearTarget, from + (1 - from) * v)), ease.inOutCubic);
  }

  /** Riss ist durch: Streifen fliegt weg, Karten steigen heraus, Pack fällt. */
  private async open(dir: number) {
    this.phase = 'opening';
    const run = this.run;
    this.ev.onHint(null);
    const defs = this.ev.requestCards();
    playSfx('pack-tear');

    const pg = this.pack.group;
    const rot0 = { x: pg.rotation.x, y: pg.rotation.y };
    void this.tween(160, (v) => pg.rotation.set(rot0.x * (1 - v), rot0.y * (1 - v), 0));

    // Karten verdeckt im Pack (zwischen Vorder- und Rückseite der Folie)
    this.cards = defs.map((d, i) => {
      const c = createCard(d, this.renderer);
      c.group.rotation.y = Math.PI;
      c.group.scale.setScalar(0.92);
      c.group.position.set(0, pg.position.y - 0.18, -0.012 - i * 0.008);
      this.scene.add(c.group);
      return c;
    });

    // 1) Streifen reißt los und fliegt mit Drall in Wischrichtung davon
    const top = this.pack.top;
    const t0 = top.position.clone();
    void this.tween(
      850,
      (v) => {
        top.position.set(t0.x + dir * 1.6 * v, t0.y + 0.9 * v - 1.5 * v * v, t0.z + 0.7 * v);
        top.rotation.set(0.7 * v, dir * 0.8 * v, -dir * 1.9 * v);
        this.pack.setTopOpacity(1 - v * v * v);
      },
      ease.outCubic,
    );
    // kleiner Ruck des Packs
    void this.tween(260, (v) => (this.pack.body.position.y = -Math.sin(v * Math.PI) * 0.06), ease.outCubic);

    // 2) Karten steigen heraus
    await this.wait(170);
    if (run !== this.run) return;
    this.cards.forEach((c, i) => {
      const y0 = c.group.position.y;
      void this.tween(680, (v) => (c.group.position.y = y0 + (PACK_H * 0.5 + 0.05) * v), ease.outCubic, i * 50);
    });
    // 3) Pack fällt weg
    const py0 = pg.position.y;
    void this.tween(
      560,
      (v) => {
        pg.position.y = py0 - 2.8 * v;
        this.pack.setOpacity(1 - v);
      },
      ease.inCubic,
      560,
    );
    await this.wait(1000);
    if (run !== this.run) return;
    this.scene.remove(pg);

    // 4) Stapel in die Mitte, Kamera etwas näher
    const from = { y: this.camera.position.y, z: this.camera.position.z };
    void this.tween(
      560,
      (v) => {
        const to = this.viewCards;
        this.applyView({ y: from.y + (to.y - from.y) * v, z: from.z + (to.z - from.z) * v });
      },
      ease.inOutCubic,
    );
    await Promise.all(
      this.cards.map((c, i) => {
        const s = c.group.position.clone();
        const t = this.stackPos(i);
        return this.tween(
          560,
          (v) => {
            c.group.position.lerpVectors(s, t, v);
            c.group.scale.setScalar(0.92 + 0.08 * v);
          },
          ease.outBack,
          i * 35,
        );
      }),
    );
    if (run !== this.run) return;
    this.index = 0;
    this.flipped = false;
    this.flipAngle = Math.PI;
    this.cards[0]?.setOnTop(10);
    this.phase = 'reveal';
    this.ev.onHint('flip');
  }

  private stackPos(k: number) {
    return new THREE.Vector3(0, -k * 0.04, -k * 0.035);
  }

  private async flip() {
    if (this.phase !== 'reveal' || this.flipped) return;
    const c = this.cards[this.index];
    if (!c) return;
    this.phase = 'busy';
    const run = this.run;
    this.ev.onHint(null);
    playSfx('card-flip');
    const z0 = c.group.position.z;
    await this.tween(
      600,
      (v) => {
        this.flipAngle = Math.PI + Math.PI * v;
        c.group.position.z = z0 + Math.sin(v * Math.PI) * 0.5;
      },
      ease.inOutCubic,
    );
    if (run !== this.run) return;
    this.flipped = true;
    this.phase = 'reveal';
    if (c.card.rarity === 'holo') playSfx('card-holo');
    else if (c.card.rarity === 'rare') playSfx('card-rare');
    this.ev.onCardShown(this.index, c.card);
    this.ev.onHint('next');
  }

  private async dismiss(dir: number) {
    if (this.phase !== 'reveal' || !this.flipped) return;
    this.phase = 'busy';
    const run = this.run;
    const leaving = this.index;
    const c = this.cards[leaving];
    const g = c.group;
    const start = g.position.clone();
    const rz = g.rotation.z;
    playSfx('card-slide');
    c.setOnTop(20);
    this.index++;
    this.cards[this.index]?.setOnTop(10);
    this.flipped = false;
    this.flipAngle = Math.PI;
    this.tilt.curYaw = this.tilt.curPitch = 0;
    this.ev.onCardGone(leaving);
    void this.tween(
      420,
      (v) => {
        g.position.set(start.x + dir * 3.4 * v, start.y + 0.35 * v, start.z + 0.25 * v);
        g.rotation.z = rz - dir * 0.55 * v;
      },
      ease.inCubic,
    ).then(() => {
      this.scene.remove(g);
      c.dispose();
    });

    if (this.index >= this.cards.length) {
      await this.wait(320);
      if (run !== this.run) return;
      this.phase = 'done';
      this.ev.onHint(null);
      this.ev.onFinished();
      return;
    }
    await Promise.all(
      this.cards.slice(this.index).map((cc, j) => {
        const s = cc.group.position.clone();
        const t = this.stackPos(j);
        return this.tween(280, (v) => cc.group.position.lerpVectors(s, t, v), ease.outCubic);
      }),
    );
    if (run !== this.run) return;
    this.phase = 'reveal';
    this.ev.onHint('flip');
  }

  private clearCards() {
    this.run++;
    for (const c of this.cards) {
      this.scene.remove(c.group);
      c.dispose();
    }
    this.cards = [];
    this.index = 0;
    this.flipped = false;
    this.flipAngle = Math.PI;
    this.glow.material.opacity = 0;
  }

  /** Restliche Karten überspringen (Übersicht wird in React gezeigt). */
  skip() {
    if (this.phase !== 'reveal' && this.phase !== 'busy') return;
    this.clearCards();
    this.phase = 'done';
    this.ev.onHint(null);
  }

  /** Nächstes Pack ("Open another"). */
  reset() {
    this.clearCards();
    this.pack.tear.reset();
    this.pack.setTorn(false);
    this.tearP = this.tearTarget = 0;
    this.tearDir = 0;
    this.tearing = false;
    this.completing = false;
    this.tension = 0;
    this.pack.setTopOpacity(1);
    this.pack.setOpacity(1);
    this.pack.body.position.set(0, 0, 0);
    this.pack.body.rotation.set(0, 0, 0);
    this.scene.add(this.pack.group);
    this.phase = 'pack';
    this.applyView(this.viewPack);
    void this.dropIn();
    this.ev.onHint('swipe');
  }

  // ------------------------------------------------------------ Frame

  /** Rissfront dem Ziel nachführen, Streifen verformen, Knistern, Zug. */
  private updateTear(dt: number) {
    const prev = this.tearP;
    // dem Finger weich folgen; nach dem Loslassen mit Mindesttempo zu Ende reißen
    const gap = this.tearTarget - this.tearP;
    const step = Math.max(gap * Math.min(1, dt * (this.tearing ? 16 : 12)), this.tearing ? 0 : dt * 1.1);
    this.tearP = Math.min(this.tearTarget, this.tearP + step);
    if (this.tearTarget - this.tearP < 0.002) this.tearP = this.tearTarget;
    this.pack.tear.update(this.tearP, this.tearDir);
    const speed = (this.tearP - prev) / Math.max(dt, 1e-3);
    this.tension += (Math.min(1, speed * 1.3) - this.tension) * Math.min(1, dt * 10);
    while (this.tearP >= this.tearTick && this.tearTick < 1) {
      playSfx('tear-tick');
      this.tearTick += 0.07;
    }
    if (this.tearP >= 0.999 && !this.completing) {
      this.completing = true;
      this.tension = 0;
      void this.open(this.tearDir);
    }
  }

  protected frame(dt: number) {
    const k = Math.min(1, dt * 12);
    this.tilt.curYaw += (this.tilt.yaw - this.tilt.curYaw) * k;
    this.tilt.curPitch += (this.tilt.pitch - this.tilt.curPitch) * k;
    const t = this.time;

    if (this.phase === 'pack') {
      const g = this.pack.group;
      if (this.tearDir) this.updateTear(dt);
      // Beim Aufreißen hält man das Pack ruhig; unter Zug zittert es leicht
      const calm = this.tearDir ? 0.25 : 1;
      const d = this.drop;
      g.rotation.y = d.ry + this.tilt.curYaw + Math.sin(t * 0.8) * 0.12 * calm;
      g.rotation.x = d.rx + this.tilt.curPitch + Math.sin(t * 0.6 + 1) * 0.05 * calm;
      g.rotation.z = d.rz + Math.sin(t * 61) * 0.007 * this.tension;
      g.position.x = this.tearDir * 0.018 * this.tension;
      g.position.y = d.y + Math.sin(t * 1.4) * 0.04 * calm;
    }

    const top = this.cards[this.index];
    if (top && (this.phase === 'reveal' || this.phase === 'busy')) {
      const sway = this.flipped && !this.pointer ? 1 : 0;
      top.group.rotation.y = this.flipAngle + this.tilt.curYaw + Math.sin(t * 1.1) * 0.07 * sway;
      top.group.rotation.x = this.tilt.curPitch + Math.sin(t * 0.8 + 2) * 0.05 * sway;
    }
    for (const c of this.cards) for (const m of c.materials) m.uniforms.uTime.value = t;

    // Glühen hinter der Rare/Holo (schon verdeckt als Vorahnung)
    const special = top && (top.card.rarity === 'rare' || top.card.rarity === 'holo') && this.phase !== 'opening';
    this.glowTarget = special ? (this.flipped ? 1 : 0.75 + Math.sin(t * 5) * 0.25) : 0;
    const mat = this.glow.material;
    mat.opacity += (this.glowTarget - mat.opacity) * Math.min(1, dt * 6);
    if (top) {
      this.glow.position.set(top.group.position.x, top.group.position.y, top.group.position.z - 0.3);
      if (top.card.rarity === 'holo') mat.color.setHSL((t * 0.25) % 1, 0.9, 0.6);
      else mat.color.set(0xffc93a);
      const s = 1 + Math.sin(t * 3) * 0.04;
      this.glow.scale.set(CARD_W * 2.3 * s, CARD_H * 2.0 * s, 1);
    }
  }

  dispose() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.down);
    c.removeEventListener('pointermove', this.move);
    c.removeEventListener('pointerup', this.up);
    c.removeEventListener('pointercancel', this.cancel);
    for (const card of this.cards) card.dispose();
    this.disposedPack = true;
    this.pack.dispose();
    this.glowTex.dispose();
    this.glow.material.dispose();
    super.dispose();
  }
}
