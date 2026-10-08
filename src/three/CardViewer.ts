// Einzelne Karte in 3D (Sammlung): mit dem Finger frei drehen und kippen, mit
// Schwung loslassen -> dreht weiter und rastet auf Vorder- oder Rückseite ein.

import * as THREE from 'three';
import type { CardDef } from '../game/cards/cards';
import { CARD_H, CARD_W, createCard, type CardObject } from './meshes';
import { ease, Stage } from './stage';

const YAW_PER_PX = 0.011;
const PITCH_PER_PX = 0.008;
const MAX_PITCH = 0.7;

export class CardViewer extends Stage {
  private card: CardObject;
  private yaw = 0;
  private pitch = 0;
  private vYaw = 0;
  private vPitch = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private moved = 0;
  private touched = false;
  private raycaster = new THREE.Raycaster();

  constructor(
    container: HTMLElement,
    card: CardDef,
    private onTapOutside: () => void,
  ) {
    super(container);
    this.card = createCard(card, this.renderer);
    this.scene.add(this.card.group);
    this.layout();
    // Auftritt: von der Seite hereindrehen – erst, wenn das Kartenbild geladen ist
    const g = this.card.group;
    g.visible = false;
    g.scale.setScalar(0.6);
    this.yaw = -1.2;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      g.visible = true;
      void this.tween(650, (v) => g.scale.setScalar(0.6 + 0.4 * v), ease.outBack);
      void this.tween(800, (v) => (this.yaw = -1.2 * (1 - v)), ease.outCubic);
    };
    void this.card.ready.then(show);
    window.setTimeout(show, 1500);

    const c = this.canvas;
    c.addEventListener('pointerdown', this.down);
    c.addEventListener('pointermove', this.move);
    c.addEventListener('pointerup', this.up);
    c.addEventListener('pointercancel', this.up);
    this.start();
  }

  protected layout() {
    if (!this.card) return;
    this.camera.position.z = this.fitDistance(CARD_W, CARD_H, 0.62, 0.78);
  }

  private down = (e: PointerEvent) => {
    this.dragging = true;
    this.touched = true;
    this.moved = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.vYaw = this.vPitch = 0;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private move = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    this.yaw += dx * YAW_PER_PX;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * PITCH_PER_PX, -MAX_PITCH, MAX_PITCH);
    // Geschwindigkeit (geglättet) für den Schwung nach dem Loslassen
    this.vYaw = this.vYaw * 0.5 + dx * YAW_PER_PX * 60 * 0.5;
    this.vPitch = this.vPitch * 0.5 + dy * PITCH_PER_PX * 60 * 0.5;
  };

  private up = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved < 8) {
      // Tippen: neben die Karte -> schließen
      const r = this.canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      if (this.raycaster.intersectObject(this.card.group, true).length === 0) this.onTapOutside();
      else this.vYaw = 7; // auf die Karte tippen: einmal herumwirbeln
    }
  };

  protected frame(dt: number) {
    if (!this.dragging) {
      // Schwung abklingen lassen, dann sanft auf die nächste Seite einrasten
      this.yaw += this.vYaw * dt;
      this.pitch += this.vPitch * dt;
      const damp = Math.exp(-dt * 2.6);
      this.vYaw *= damp;
      this.vPitch *= damp;
      if (Math.abs(this.vYaw) < 1.2) {
        const target = Math.round(this.yaw / Math.PI) * Math.PI;
        this.yaw += (target - this.yaw) * Math.min(1, dt * 5);
      }
      this.pitch += (0 - this.pitch) * Math.min(1, dt * 4);
    }
    // Leichtes Schweben, damit Holo und Glanz auch ohne Berührung leben
    const idle = this.touched ? 0.35 : 1;
    const g = this.card.group;
    g.rotation.y = this.yaw + Math.sin(this.time * 0.9) * 0.08 * idle;
    g.rotation.x = this.pitch + Math.sin(this.time * 0.7 + 1) * 0.05 * idle;
    g.position.y = Math.sin(this.time * 1.3) * 0.02;
    for (const m of this.card.materials) m.uniforms.uTime.value = this.time;
  }

  dispose() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.down);
    c.removeEventListener('pointermove', this.move);
    c.removeEventListener('pointerup', this.up);
    c.removeEventListener('pointercancel', this.up);
    this.card.dispose();
    super.dispose();
  }
}
