// Gemeinsame Basis der 3D-Ansichten: Renderer, Kamera, Umgebungslicht, Render-Schleife,
// kleine Tween-Engine, Bildschirm-Projektion. Läuft nur, solange die Seite sichtbar ist.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Ease = (t: number) => number;
export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => {
    const c1 = 1.5;
    return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

interface Tween {
  start: number;
  duration: number;
  ease: Ease;
  update: (v: number) => void;
  resolve: () => void;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly envMap: THREE.Texture;
  protected width = 1;
  protected height = 1;
  protected time = 0;
  /** Spielzeit in ms (läuft nur mit der Render-Schleife; Tweens hängen daran). */
  private clock = 0;
  private tweens: Tween[] = [];
  private raf = 0;
  private last = 0;
  private resizeObserver: ResizeObserver;
  private disposed = false;
  private paused = false;

  constructor(protected container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    container.appendChild(canvas);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    this.camera.position.set(0, 0, 6);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2, 3, 4);
    this.scene.add(key);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Render-Schleife starten – am Ende des Unterklassen-Konstruktors aufrufen. */
  protected start(): void {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Render-Schleife anhalten, z. B. solange eine Übersicht die leere Szene verdeckt. */
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    cancelAnimationFrame(this.raf);
    if (!paused && !this.disposed && !document.hidden) this.start();
  }

  /** Pro Frame (dt in s). Für Unterklassen. */
  protected frame(_dt: number): void {}
  /** Nach Größenänderung (Kamera neu ausrichten). */
  protected layout(): void {}

  private resize() {
    const r = this.container.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.layout();
  }

  private onVisibility = () => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden && !this.disposed && !this.paused) this.start();
  };

  private loop = (now: number) => {
    if (this.disposed || this.paused) return;
    // Ruckler werden gekappt statt übersprungen; in der Entwicklung per
    // window.__ss3dTimeScale zu verlangsamen (Zeitlupe für Screenshots).
    const scale = import.meta.env.DEV ? ((window as { __ss3dTimeScale?: number }).__ss3dTimeScale ?? 1) : 1;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000) * scale;
    this.last = now;
    this.time += dt;
    this.clock += dt * 1000;
    for (const tw of [...this.tweens]) {
      if (this.clock < tw.start) continue;
      const p = Math.min(1, (this.clock - tw.start) / tw.duration);
      tw.update(tw.ease(p));
      if (p >= 1) {
        this.tweens.splice(this.tweens.indexOf(tw), 1);
        tw.resolve();
      }
    }
    this.frame(dt);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Tween von 0 → 1 über `duration` ms; `update` bekommt den geglätteten Fortschritt. */
  tween(duration: number, update: (v: number) => void, easeFn: Ease = ease.outCubic, delay = 0): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.push({ start: this.clock + delay, duration, ease: easeFn, update, resolve });
    });
  }

  wait(ms: number): Promise<void> {
    return this.tween(ms, () => {}, ease.linear);
  }

  /** Kameraabstand, bei dem ein Objekt (w × h) höchstens fh der Höhe und fw der Breite füllt. */
  fitDistance(w: number, h: number, fh: number, fw: number): number {
    const t = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return Math.max(h / (fh * t), w / (fw * t * this.camera.aspect));
  }

  /** Weltpunkt -> Pixel im Container. */
  project(v: THREE.Vector3): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.width, y: ((1 - p.y) / 2) * this.height };
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.envMap.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
