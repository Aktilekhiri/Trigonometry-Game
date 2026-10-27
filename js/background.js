/**
 * background.js
 * Decorative background:
 *  1. floating math symbols (DOM + GSAP),
 *  2. an optional Three.js scene of slowly turning wireframe shapes and particles.
 *
 * The 3D scene is loaded on demand and protects performance:
 *  - skipped if "reduced motion" is on or effects are switched off,
 *  - paused while the tab is hidden,
 *  - switched off automatically if the frame rate is poor,
 *  - the game works the same (with CSS blobs) if Three.js cannot load.
 */

import { effectsEnabled, floatElements, stopTweens, canAnimate } from './motion.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const SYMBOLS = ['sin', 'cos', 'tan', 'π', 'θ', '√', '∠', 'Δ', '90°', '½', 'sin²+cos²=1', '∞'];

/* ---------------------------------------------------------- floating symbols */

let symbolTweens = [];
let symbolsBuilt = false;

function buildSymbols() {
  const field = document.getElementById('symbol-field');
  if (!field || symbolsBuilt) return;
  symbolsBuilt = true;

  SYMBOLS.forEach((text, index) => {
    const span = document.createElement('span');
    span.className = 'math-symbol';
    span.textContent = text;
    span.style.left = `${6 + ((index * 37) % 88)}%`;
    span.style.top = `${8 + ((index * 53) % 80)}%`;
    span.style.fontSize = `${text.length > 3 ? 22 : 30 + ((index * 11) % 46)}px`;
    field.appendChild(span);
  });
}

export function startSymbols() {
  buildSymbols();
  stopTweens(symbolTweens);
  if (effectsEnabled() && canAnimate()) {
    symbolTweens = floatElements([...document.querySelectorAll('.math-symbol')], { distance: 38, rotate: 14 });
  }
}

/* ------------------------------------------------------------------- Three.js */

const scene3d = {
  loading: false,
  ready: false,
  running: false,
  failed: false,
  THREE: null,
  renderer: null,
  scene: null,
  camera: null,
  group: null,
  points: null,
  pointer: { x: 0, y: 0 },
  frameId: 0,
  lastTime: 0,
  slowFrames: 0,
  sampledFrames: 0,
};

function createScene(THREE, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 15;

  const group = new THREE.Group();
  scene.add(group);

  const palette = [0x22e4ff, 0x9b6bff, 0xff4fd8, 0x4d7cff];
  const geometries = [
    new THREE.IcosahedronGeometry(1.4, 0),
    new THREE.TorusGeometry(1.2, 0.35, 8, 24),
    new THREE.OctahedronGeometry(1.3, 0),
    new THREE.TorusKnotGeometry(0.9, 0.28, 48, 8),
    new THREE.TetrahedronGeometry(1.5, 0),
  ];

  for (let i = 0; i < 9; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: palette[i % palette.length],
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });
    const mesh = new THREE.Mesh(geometries[i % geometries.length], material);
    const angle = (i / 9) * Math.PI * 2;
    const radius = 7 + (i % 3) * 3;
    mesh.position.set(Math.cos(angle) * radius * 1.4, Math.sin(angle * 1.3) * 5, -4 - (i % 4) * 3);
    mesh.userData.spin = { x: 0.08 + (i % 3) * 0.05, y: 0.1 + (i % 4) * 0.04 };
    group.add(mesh);
  }

  const count = 220;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = -14 + Math.random() * 20;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({ color: 0xb9c2ff, size: 0.09, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  scene.add(points);

  Object.assign(scene3d, { renderer, scene, camera, group, points, THREE, ready: true });
}

function renderFrame(now) {
  if (!scene3d.running) return;
  scene3d.frameId = requestAnimationFrame(renderFrame);

  const delta = Math.min((now - scene3d.lastTime) / 1000, 0.1);
  scene3d.lastTime = now;

  // Performance guard: if the first ~2 seconds average below 30 fps, stop the 3D scene for good.
  if (scene3d.sampledFrames < 150) {
    scene3d.sampledFrames += 1;
    if (scene3d.sampledFrames > 20 && delta > 1 / 30) scene3d.slowFrames += 1;
    if (scene3d.sampledFrames === 150 && scene3d.slowFrames > 75) {
      disableScene(true);
      return;
    }
  }

  scene3d.group.children.forEach((mesh) => {
    mesh.rotation.x += mesh.userData.spin.x * delta;
    mesh.rotation.y += mesh.userData.spin.y * delta;
  });
  scene3d.group.rotation.y += delta * 0.03;
  scene3d.points.rotation.y += delta * 0.01;

  // Gentle pointer parallax.
  const { camera, pointer } = scene3d;
  camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.03;
  camera.position.y += (pointer.y * 0.9 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  scene3d.renderer.render(scene3d.scene, camera);
}

function startLoop() {
  if (!scene3d.ready || scene3d.running || document.hidden) return;
  scene3d.running = true;
  scene3d.lastTime = performance.now();
  scene3d.frameId = requestAnimationFrame(renderFrame);
}

function stopLoop() {
  scene3d.running = false;
  cancelAnimationFrame(scene3d.frameId);
}

function disableScene(poorPerformance = false) {
  stopLoop();
  const canvas = document.getElementById('bg-canvas');
  if (canvas) canvas.style.display = 'none';
  if (poorPerformance) scene3d.failed = true;
}

async function loadScene() {
  if (scene3d.loading || scene3d.ready || scene3d.failed) return;
  scene3d.loading = true;
  const canvas = document.getElementById('bg-canvas');
  try {
    if (!canvas || !window.WebGLRenderingContext) throw new Error('WebGL not available');
    const THREE = await import(THREE_URL);
    createScene(THREE, canvas);
  } catch (error) {
    scene3d.failed = true;
    console.info('3D background unavailable, using the CSS background instead.', error?.message || error);
  } finally {
    scene3d.loading = false;
  }
}

/** Turns the decorative 3D scene on or off (also called by the "Effects" button). */
export async function setBackgroundEnabled(enabled) {
  const canvas = document.getElementById('bg-canvas');
  const shouldRun = enabled && effectsEnabled();

  if (!shouldRun) {
    stopLoop();
    if (canvas) canvas.style.display = 'none';
    return;
  }
  if (canvas && !scene3d.failed) canvas.style.display = '';
  await loadScene();
  if (scene3d.ready && !scene3d.failed) startLoop();
}

export function initBackground() {
  window.addEventListener('pointermove', (event) => {
    scene3d.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    scene3d.pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!scene3d.ready) return;
      scene3d.camera.aspect = window.innerWidth / window.innerHeight;
      scene3d.camera.updateProjectionMatrix();
      scene3d.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (effectsEnabled() && document.getElementById('bg-canvas')?.style.display !== 'none') startLoop();
  });

  startSymbols();
  setBackgroundEnabled(true);
}
