/**
 * boards.js
 * The interactive pictures of the game, drawn as SVG: Crystal Cannon, Lighthouse Bay,
 * the unit circle and the boss scene. A board is created once, then updated with set(state).
 * Boards never decide anything about right or wrong: puzzles.js does that.
 */

import { toRadians } from './trig.js';
import { prefersReducedMotion } from './motion.js';
import { rayHeight } from './puzzles.js';

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (parent) parent.appendChild(node);
  return node;
}

const setAttrs = (node, attrs) => Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
const f = (n) => Number(n.toFixed(1));

/** Frame-based tween. With reduced motion it jumps to the end. Resolves when finished. */
export function tween(duration, onUpdate, ease = (t) => t) {
  return new Promise((resolve) => {
    if (prefersReducedMotion() || duration <= 0) {
      onUpdate(1);
      resolve();
      return;
    }
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      onUpdate(ease(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function makeSvg(container, viewBox, label) {
  const svg = el('svg', { viewBox, class: 'board-svg', role: 'img', 'aria-label': label });
  container.appendChild(svg);
  return svg;
}

/** Converts SVG coordinates to page coordinates (used for particle bursts). */
function screenPoint(svg, viewW, viewH, x, y) {
  const rect = svg.getBoundingClientRect();
  return { x: rect.left + (x / viewW) * rect.width, y: rect.top + (y / viewH) * rect.height };
}

/* ============================================================ CRYSTAL CANNON */

const C_SCALE = 20;
const C_OX = 60;
const C_OY = 320;
const C_W = 480;
const C_H = 350;
const cx = (units) => C_OX + units * C_SCALE;
const cy = (units) => C_OY - units * C_SCALE;

export function createCannonBoard(container) {
  const svg = makeSvg(container, `0 -16 ${C_W} ${C_H + 16}`, 'Crystal cannon. A bolt leaves the cannon at an angle. Dotted lines show how far it goes across and how high it goes up.');

  // Grid and axes
  const grid = el('g', { class: 'b-grid' }, svg);
  for (let u = 0; u <= 16; u += 2) {
    el('line', { x1: cx(u), y1: cy(0), x2: cx(u), y2: cy(16), class: u === 0 ? 'b-axis' : '' }, grid);
    if (u > 0 && u % 4 === 0) el('text', { x: cx(u), y: C_OY + 16, 'text-anchor': 'middle', class: 'b-tick' }, grid).textContent = u;
  }
  for (let u = 0; u <= 16; u += 2) {
    el('line', { x1: cx(0), y1: cy(u), x2: cx(15), y2: cy(u), class: u === 0 ? 'b-axis' : '' }, grid);
    if (u > 0 && u % 4 === 0) el('text', { x: cx(0) - 8, y: cy(u) + 4, 'text-anchor': 'end', class: 'b-tick' }, grid).textContent = u;
  }
  el('rect', { x: 0, y: C_OY + 1, width: C_W, height: C_H - C_OY, class: 'b-ground' }, svg);

  // Target: crystal, or a guide line when it is hidden
  const guide = el('g', { class: 'b-guide' }, svg);
  const guideLine = el('line', {}, guide);
  const guideText = el('text', { 'text-anchor': 'end' }, guide);
  const crystal = el('g', { class: 'b-crystal' }, svg);
  el('polygon', { points: '0,-17 11,0 0,17 -11,0', class: 'b-crystal-body' }, crystal);
  el('polygon', { points: '0,-17 11,0 0,0', class: 'b-crystal-shine' }, crystal);

  // Legs of the shot
  const legAcross = el('line', { class: 'b-leg b-leg-across' }, svg);
  const legUp = el('line', { class: 'b-leg b-leg-up' }, svg);
  const labelAcross = el('text', { class: 'b-label b-label-across', 'text-anchor': 'middle' }, svg);
  const labelUp = el('text', { class: 'b-label b-label-up' }, svg);
  const bolt = el('line', { class: 'b-bolt' }, svg);
  const tipDot = el('circle', { r: 6, class: 'b-tip' }, svg);
  const arc = el('path', { class: 'b-arc' }, svg);
  const arcLabel = el('text', { class: 'b-label b-label-angle', 'text-anchor': 'middle' }, svg);

  // The cannon
  const cannon = el('g', { class: 'b-cannon' }, svg);
  const barrel = el('g', {}, cannon);
  el('rect', { x: 0, y: -10, width: 52, height: 20, rx: 6, class: 'b-barrel' }, barrel);
  el('rect', { x: 44, y: -13, width: 12, height: 26, rx: 4, class: 'b-barrel-ring' }, barrel);
  el('path', { d: `M ${C_OX - 24} ${C_OY} L ${C_OX - 10} ${C_OY - 14} L ${C_OX + 10} ${C_OY - 14} L ${C_OX + 24} ${C_OY} Z`, class: 'b-carriage' }, cannon);
  el('circle', { cx: C_OX, cy: C_OY, r: 11, class: 'b-wheel' }, cannon);

  const ball = el('circle', { r: 8, class: 'b-ball' }, svg);
  ball.style.display = 'none';
  const missMark = el('g', { class: 'b-miss' }, svg);
  el('path', { d: 'M -8 -8 L 8 8 M 8 -8 L -8 8' }, missMark);
  missMark.style.display = 'none';

  let current = { angle: 45, power: 10, target: null, reveal: true, by: null, legs: true };

  function set(next = {}) {
    current = { ...current, ...next };
    const { angle, power, target, reveal, by, legs } = current;
    const r = toRadians(angle);
    const tipX = cx(power * Math.cos(r));
    const tipY = cy(power * Math.sin(r));
    const across = power * Math.cos(r);
    const up = power * Math.sin(r);

    barrel.setAttribute('transform', `translate(${C_OX} ${C_OY}) rotate(${-angle})`);
    setAttrs(bolt, { x1: C_OX, y1: C_OY, x2: f(tipX), y2: f(tipY) });
    setAttrs(tipDot, { cx: f(tipX), cy: f(tipY) });

    svg.classList.toggle('show-legs', Boolean(legs));
    setAttrs(legAcross, { x1: C_OX, y1: C_OY, x2: f(tipX), y2: C_OY });
    setAttrs(legUp, { x1: f(tipX), y1: C_OY, x2: f(tipX), y2: f(tipY) });
    setAttrs(labelAcross, { x: f((C_OX + tipX) / 2), y: C_OY - 8 });
    labelAcross.textContent = `across ${across.toFixed(1)}`;
    setAttrs(labelUp, { x: f(tipX + 8), y: f((C_OY + tipY) / 2 + 4) });
    labelUp.textContent = `up ${up.toFixed(1)}`;

    // Angle arc (hidden at 0° where it would collapse)
    const arcRadius = 40;
    if (angle > 1) {
      const ex = C_OX + arcRadius * Math.cos(r);
      const ey = C_OY - arcRadius * Math.sin(r);
      arc.setAttribute('d', `M ${C_OX + arcRadius} ${C_OY} A ${arcRadius} ${arcRadius} 0 0 0 ${f(ex)} ${f(ey)}`);
      const mid = r / 2;
      setAttrs(arcLabel, { x: f(C_OX + 66 * Math.cos(mid)), y: f(C_OY - 66 * Math.sin(mid) + 4) });
      arcLabel.textContent = `θ ${angle}°`;
      arc.style.display = '';
      arcLabel.style.display = '';
    } else {
      arc.style.display = 'none';
      arcLabel.textContent = 'θ 0°';
      setAttrs(arcLabel, { x: C_OX + 62, y: C_OY - 12 });
      arcLabel.style.display = '';
    }

    // Target
    crystal.style.display = target && reveal ? '' : 'none';
    guide.style.display = target && !reveal && by ? '' : 'none';
    if (target) {
      crystal.setAttribute('transform', `translate(${f(cx(target.x))} ${f(cy(target.y))})`);
      if (by === 'y') {
        setAttrs(guideLine, { x1: cx(0), y1: f(cy(target.y)), x2: cx(16), y2: f(cy(target.y)) });
        setAttrs(guideText, { x: cx(16), y: f(cy(target.y) - 6) });
        guideText.textContent = `crystal height ${target.y.toFixed(1)}`;
      } else if (by === 'x') {
        setAttrs(guideLine, { x1: f(cx(target.x)), y1: cy(0), x2: f(cx(target.x)), y2: cy(16) });
        setAttrs(guideText, { x: f(cx(target.x) - 6), y: cy(15.2) });
        guideText.textContent = `crystal distance ${target.x.toFixed(1)}`;
      }
    }
    svg.setAttribute(
      'aria-label',
      `Crystal cannon at ${angle} degrees with power ${power}. The shot goes ${across.toFixed(1)} across and ${up.toFixed(1)} up.`,
    );
  }

  /** Fire a bolt along the current aim. Resolves when the animation is over. */
  async function fire(hit) {
    const { angle, power } = current;
    const r = toRadians(angle);
    const dx = power * Math.cos(r) * C_SCALE;
    const dy = power * Math.sin(r) * C_SCALE;
    ball.style.display = '';
    missMark.style.display = 'none';
    crystal.classList.remove('is-shattered');
    await tween(0.45, (t) => setAttrs(ball, { cx: f(C_OX + dx * t), cy: f(C_OY - dy * t) }), (t) => 1 - (1 - t) ** 2);
    ball.style.display = 'none';
    if (hit) {
      crystal.style.display = current.target ? '' : 'none';
      crystal.classList.add('is-shattered');
    } else {
      missMark.setAttribute('transform', `translate(${f(C_OX + dx)} ${f(C_OY - dy)})`);
      missMark.style.display = '';
    }
  }

  function resetShot() {
    ball.style.display = 'none';
    missMark.style.display = 'none';
    crystal.classList.remove('is-shattered');
  }

  set();
  return {
    el: svg,
    set,
    fire,
    resetShot,
    tipPoint: () => {
      const r = toRadians(current.angle);
      return screenPoint(svg, C_W, C_H + 16, C_OX + current.power * Math.cos(r) * C_SCALE, C_OY - current.power * Math.sin(r) * C_SCALE + 16);
    },
    targetPoint: () => (current.target ? screenPoint(svg, C_W, C_H + 16, cx(current.target.x), cy(current.target.y) + 16) : null),
    destroy: () => svg.remove(),
  };
}

/* ========================================================== LIGHTHOUSE BAY */

const B_SCALE = 6;
const B_X = 130;
const B_SEA = 250;
const B_W = 480;
const B_H = 300;

export function createBayBoard(container) {
  const svg = makeSvg(container, `0 0 ${B_W} ${B_H}`, 'Lighthouse, sea and ship forming a right triangle.');
  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: `tower-clip-${Math.random().toString(36).slice(2, 8)}` }, defs);
  const clipPoly = el('polygon', {}, clip);

  el('rect', { x: 0, y: B_SEA, width: B_W, height: B_H - B_SEA, class: 'b-sea' }, svg);
  el('path', { d: `M0 ${B_SEA + 8} q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`, class: 'b-wave' }, svg);
  el('path', { d: `M0 ${B_SEA + 26} q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`, class: 'b-wave b-wave-2' }, svg);

  // Tower
  const tower = el('g', { class: 'b-tower' }, svg);
  const towerBody = el('polygon', { class: 'b-tower-body' }, tower);
  const stripes = el('g', { 'clip-path': `url(#${clip.id})` }, tower);
  for (let i = 0; i < 12; i += 1) el('rect', { x: B_X - 20, width: 40, height: 14, class: 'b-stripe' }, stripes);
  const lampRoom = el('rect', { width: 24, height: 14, rx: 3, class: 'b-lamp-room' }, tower);
  const roof = el('polygon', { class: 'b-roof' }, tower);
  const lampGlow = el('circle', { r: 16, class: 'b-lamp-glow' }, tower);
  const lamp = el('circle', { r: 5, class: 'b-lamp' }, tower);
  el('path', { d: `M ${B_X - 44} ${B_SEA + 4} L ${B_X - 26} ${B_SEA - 10} L ${B_X + 26} ${B_SEA - 10} L ${B_X + 46} ${B_SEA + 4} Z`, class: 'b-rock' }, svg);

  // Triangle sides
  const lineOpp = el('line', { class: 'b-side b-side-opp' }, svg);
  const lineAdj = el('line', { class: 'b-side b-side-adj' }, svg);
  const lineHyp = el('line', { class: 'b-side b-side-hyp' }, svg);
  const rope = el('line', { class: 'b-rope' }, svg);
  const hitDot = el('circle', { r: 6, class: 'b-hit-dot' }, svg);
  el('path', { d: `M ${B_X} ${B_SEA - 12} L ${B_X + 12} ${B_SEA - 12} L ${B_X + 12} ${B_SEA}`, class: 'b-right-angle' }, svg);
  const arc = el('path', { class: 'b-arc' }, svg);
  const labelTheta = el('text', { class: 'b-label b-label-angle', 'text-anchor': 'middle' }, svg);
  const labelOpp = el('text', { class: 'b-label b-label-opp', 'text-anchor': 'end' }, svg);
  const labelAdj = el('text', { class: 'b-label b-label-adj', 'text-anchor': 'middle' }, svg);
  const labelHyp = el('text', { class: 'b-label b-label-hyp', 'text-anchor': 'middle' }, svg);

  // Ship
  const ship = el('g', {}, svg); // positioned with a transform attribute
  const shipBob = el('g', { class: 'b-ship' }, ship); // animated separately so the CSS animation cannot override the position
  el('path', { d: 'M -28 -14 L 28 -14 L 20 2 L -20 2 Z', class: 'b-hull' }, shipBob);
  el('rect', { x: -2, y: -44, width: 3, height: 30, class: 'b-mast' }, shipBob);
  el('path', { d: 'M 3 -42 L 3 -18 L 24 -18 Z', class: 'b-sail' }, shipBob);
  el('path', { d: 'M -2 -44 L -14 -39 L -2 -35 Z', class: 'b-flag' }, shipBob);
  const vertex = el('circle', { r: 4, class: 'b-vertex' }, svg);

  let current = { H: 20, d: 30, angle: 33.7, rope: null, labels: {}, highlight: null, glow: false };

  function set(next = {}) {
    current = { ...current, ...next, labels: { ...current.labels, ...(next.labels ?? {}) } };
    if (next.labels === null) current.labels = {};
    const { H, d, angle, labels, highlight, glow } = current;
    const shipX = B_X + B_SCALE * d;
    const topY = B_SEA - B_SCALE * H;
    const r = toRadians(angle);

    // Tower
    const halfBottom = 14;
    const halfTop = 9;
    const pts = `${B_X - halfBottom},${B_SEA} ${B_X + halfBottom},${B_SEA} ${B_X + halfTop},${f(topY)} ${B_X - halfTop},${f(topY)}`;
    towerBody.setAttribute('points', pts);
    clipPoly.setAttribute('points', pts);
    // White bands every 28 px, anchored at the foot so they stay put while the tower grows.
    [...stripes.children].forEach((rect, i) => rect.setAttribute('y', f(B_SEA - 28 * (i + 1) + 14)));
    setAttrs(lampRoom, { x: B_X - 12, y: f(topY - 14) });
    roof.setAttribute('points', `${B_X - 16},${f(topY - 14)} ${B_X + 16},${f(topY - 14)} ${B_X},${f(topY - 28)}`);
    setAttrs(lamp, { cx: B_X, cy: f(topY) });
    setAttrs(lampGlow, { cx: B_X, cy: f(topY) });
    tower.classList.toggle('is-lit', Boolean(glow));

    // Ship
    ship.setAttribute('transform', `translate(${f(shipX)} ${B_SEA})`);
    setAttrs(vertex, { cx: f(shipX), cy: B_SEA });

    // Sides
    setAttrs(lineOpp, { x1: B_X, y1: B_SEA, x2: B_X, y2: f(topY) });
    setAttrs(lineAdj, { x1: B_X, y1: B_SEA, x2: f(shipX), y2: B_SEA });
    const reach = rayHeight(d, angle);
    const rayEndY = Math.max(8, B_SEA - B_SCALE * reach);
    const rayEndX = reach * B_SCALE > B_SEA - 8 ? shipX - ((B_SEA - 8) / Math.tan(r)) : B_X;
    setAttrs(lineHyp, { x1: f(shipX), y1: B_SEA, x2: f(rayEndX), y2: f(rayEndY) });
    const useRope = current.rope !== null && current.rope !== undefined;
    rope.style.display = useRope ? '' : 'none';
    lineHyp.classList.toggle('is-faint', useRope);
    if (useRope) {
      const endX = shipX - B_SCALE * current.rope * Math.cos(r);
      const endY = B_SEA - B_SCALE * current.rope * Math.sin(r);
      setAttrs(rope, { x1: f(shipX), y1: B_SEA, x2: f(endX), y2: f(endY) });
      setAttrs(hitDot, { cx: f(endX), cy: f(endY) });
    } else {
      setAttrs(hitDot, { cx: f(rayEndX), cy: f(rayEndY) });
    }

    // Angle arc
    const ar = 38;
    const ax = shipX - ar * Math.cos(r);
    const ay = B_SEA - ar * Math.sin(r);
    arc.setAttribute('d', `M ${f(shipX - ar)} ${B_SEA} A ${ar} ${ar} 0 0 1 ${f(ax)} ${f(ay)}`);
    setAttrs(labelTheta, { x: f(shipX - (ar + 20) * Math.cos(r / 2)), y: f(B_SEA - (ar + 20) * Math.sin(r / 2) + 4) });
    labelTheta.textContent = labels.theta ?? 'θ';

    // Side labels
    setAttrs(labelOpp, { x: B_X - 20, y: f((B_SEA + topY) / 2 + 4) });
    labelOpp.textContent = labels.opp ?? '';
    setAttrs(labelAdj, { x: f((B_X + shipX) / 2), y: B_SEA + 24 });
    labelAdj.textContent = labels.adj ?? '';
    const midX = (shipX + rayEndX) / 2;
    const midY = (B_SEA + rayEndY) / 2;
    setAttrs(labelHyp, { x: f(midX + 10), y: f(midY - 12) });
    labelHyp.textContent = labels.hyp ?? '';

    // Dim the sides a ratio does not use
    const used = { sin: ['opp', 'hyp'], cos: ['adj', 'hyp'], tan: ['opp', 'adj'], opp: ['opp'], adj: ['adj'], hyp: ['hyp'] }[highlight] ?? ['opp', 'adj', 'hyp'];
    [['opp', lineOpp, labelOpp], ['adj', lineAdj, labelAdj], ['hyp', lineHyp, labelHyp]].forEach(([name, line, label]) => {
      line.classList.toggle('is-dim', !used.includes(name));
      label.classList.toggle('is-dim', !used.includes(name));
    });
    svg.classList.toggle('is-solved', Boolean(glow));
    hitDot.style.display = glow ? 'none' : '';
  }

  set();
  return {
    el: svg,
    set,
    lampPoint: () => screenPoint(svg, B_W, B_H, B_X, B_SEA - B_SCALE * current.H),
    destroy: () => svg.remove(),
  };
}

/* ============================================================== UNIT CIRCLE */

const U_C = 190;
const U_R = 128;

/**
 * options.onAngle(angle): when given, the player can also drag the point around the circle.
 */
export function createCircleBoard(container, options = {}) {
  const svg = makeSvg(container, '0 0 380 380', 'Unit circle. A radius of length 1 turns by an angle. Its tip is at the point cosine, sine.');
  const quadrantRect = el('rect', { class: 'b-quadrant' }, svg);
  el('line', { x1: 14, y1: U_C, x2: 366, y2: U_C, class: 'b-axis' }, svg);
  el('line', { x1: U_C, y1: 14, x2: U_C, y2: 366, class: 'b-axis' }, svg);
  el('circle', { cx: U_C, cy: U_C, r: U_R, class: 'b-unit-circle' }, svg);

  const ticks = el('g', { class: 'b-ticks' }, svg);
  for (let a = 0; a < 360; a += 15) {
    if (a % 30 !== 0 && a % 45 !== 0) continue;
    const r = toRadians(a);
    el('circle', { cx: f(U_C + U_R * Math.cos(r)), cy: f(U_C - U_R * Math.sin(r)), r: a % 90 === 0 ? 3.5 : 2.5 }, ticks);
  }
  [[0, '0°', 1, 0], [90, '90°', 0, -1], [180, '180°', -1, 0], [270, '270°', 0, 1]].forEach(([, text, ux, uy]) => {
    const label = el('text', { x: U_C + (U_R + 20) * ux, y: U_C + (U_R + 20) * uy + 4, 'text-anchor': 'middle', class: 'b-tick' }, svg);
    label.textContent = text;
  });
  [['I', 1, -1], ['II', -1, -1], ['III', -1, 1], ['IV', 1, 1]].forEach(([text, sx, sy]) => {
    const label = el('text', { x: U_C + sx * 52, y: U_C + sy * 40 + 4, 'text-anchor': 'middle', class: 'b-quadrant-label' }, svg);
    label.textContent = text;
  });

  const tanLine = el('line', { class: 'b-tan-line' }, svg);
  const tanExtension = el('line', { class: 'b-tan-ext' }, svg);
  const tanLabel = el('text', { class: 'b-label b-label-tan', 'text-anchor': 'start' }, svg);
  const radius = el('line', { class: 'b-radius' }, svg);
  const cosLine = el('line', { class: 'b-leg b-leg-across' }, svg);
  const sinLine = el('line', { class: 'b-leg b-leg-up' }, svg);
  const arc = el('path', { class: 'b-arc' }, svg);
  const cosLabel = el('text', { class: 'b-label b-label-across', 'text-anchor': 'middle' }, svg);
  const sinLabel = el('text', { class: 'b-label b-label-up' }, svg);
  const angleLabel = el('text', { class: 'b-label b-label-angle' }, svg);
  const dot = el('circle', { r: 9, class: 'b-point' }, svg);
  const sparkle = el('circle', { r: 16, class: 'b-point-glow' }, svg);

  let current = { angle: 30, labels: {}, focus: null };

  function set(next = {}) {
    current = { ...current, ...next, labels: { ...current.labels, ...(next.labels ?? {}) } };
    if (next.labels === null) current.labels = {};
    const { angle, labels, focus } = current;
    const r = toRadians(angle);
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const px = U_C + U_R * cos;
    const py = U_C - U_R * sin;

    setAttrs(radius, { x1: U_C, y1: U_C, x2: f(px), y2: f(py) });
    setAttrs(cosLine, { x1: U_C, y1: U_C, x2: f(px), y2: U_C });
    setAttrs(sinLine, { x1: f(px), y1: U_C, x2: f(px), y2: f(py) });
    setAttrs(dot, { cx: f(px), cy: f(py) });
    setAttrs(sparkle, { cx: f(px), cy: f(py) });

    // Angle arc
    const ar = 30;
    if (angle > 0.5 && angle < 359.5) {
      const ex = U_C + ar * cos;
      const ey = U_C - ar * sin;
      arc.setAttribute('d', `M ${U_C + ar} ${U_C} A ${ar} ${ar} 0 ${angle > 180 ? 1 : 0} 0 ${f(ex)} ${f(ey)}`);
      arc.style.display = '';
    } else {
      arc.style.display = 'none';
    }
    setAttrs(angleLabel, { x: U_C + 36, y: U_C + (sin >= 0 ? -8 : 20) });
    angleLabel.textContent = `θ ${Math.round(angle)}°`;

    // Value labels beside the legs
    const showCos = labels.cos !== undefined && labels.cos !== null;
    const showSin = labels.sin !== undefined && labels.sin !== null;
    cosLabel.style.display = showCos ? '' : 'none';
    sinLabel.style.display = showSin ? '' : 'none';
    if (showCos) {
      cosLabel.textContent = `cos ${labels.cos}`;
      setAttrs(cosLabel, { x: f(U_C + (px - U_C) / 2), y: sin >= 0 ? U_C + 20 : U_C - 10 });
    }
    if (showSin) {
      sinLabel.textContent = `sin ${labels.sin}`;
      const anchorRight = cos >= 0;
      sinLabel.setAttribute('text-anchor', anchorRight ? 'start' : 'end');
      setAttrs(sinLabel, { x: f(px + (anchorRight ? 10 : -10)), y: f(U_C + (py - U_C) / 2 + 4) });
    }

    // Tangent: the line x = 1 touched by the extended radius
    const tanDefined = Math.abs(cos) > 1e-6;
    const showTan = focus === 'tan' || focus === 'tan-always';
    tanLine.style.display = showTan && tanDefined ? '' : 'none';
    tanExtension.style.display = showTan && tanDefined ? '' : 'none';
    tanLabel.style.display = showTan ? '' : 'none';
    if (showTan) {
      if (tanDefined) {
        const t = sin / cos;
        const clamped = Math.max(-1.35, Math.min(1.35, t));
        const ty = U_C - U_R * clamped;
        setAttrs(tanLine, { x1: U_C + U_R, y1: U_C, x2: U_C + U_R, y2: f(ty) });
        setAttrs(tanExtension, { x1: U_C, y1: U_C, x2: U_C + U_R, y2: f(ty) });
        setAttrs(tanLabel, { x: U_C + U_R + 8, y: f(U_C - U_R * clamped / 2 + 4) });
        tanLabel.textContent = labels.tan ? `tan ${labels.tan}` : 'tan';
      } else {
        setAttrs(tanLabel, { x: U_C + U_R + 8, y: 40 });
        tanLabel.textContent = 'tan undefined';
      }
    }

    // Spell focus dims the legs that the spell does not use
    cosLine.classList.toggle('is-dim', focus === 'sin');
    sinLine.classList.toggle('is-dim', focus === 'cos');
    cosLabel.classList.toggle('is-dim', focus === 'sin');
    sinLabel.classList.toggle('is-dim', focus === 'cos');

    // Quadrant tint
    const q = Math.floor((((angle % 360) + 360) % 360) / 90);
    const showQuadrant = current.quadrant && (angle % 90 !== 0);
    quadrantRect.style.display = showQuadrant ? '' : 'none';
    setAttrs(quadrantRect, { x: q === 0 || q === 3 ? U_C : 14, y: q <= 1 ? 14 : U_C, width: U_C - 14, height: U_C - 14 });
    svg.setAttribute('aria-label', `Unit circle at ${Math.round(angle)} degrees. Cosine ${cos.toFixed(2)}, sine ${sin.toFixed(2)}.`);
  }

  // Dragging the point (pointer events cover mouse, touch and pen)
  if (options.onAngle) {
    svg.classList.add('is-draggable');
    const angleFromEvent = (event) => {
      const rect = svg.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 380 - U_C;
      const y = U_C - ((event.clientY - rect.top) / rect.height) * 380;
      return Math.round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360);
    };
    let dragging = false;
    svg.addEventListener('pointerdown', (event) => {
      dragging = true;
      svg.setPointerCapture(event.pointerId);
      options.onAngle(angleFromEvent(event));
    });
    svg.addEventListener('pointermove', (event) => {
      if (dragging) options.onAngle(angleFromEvent(event));
    });
    const stop = () => { dragging = false; };
    svg.addEventListener('pointerup', stop);
    svg.addEventListener('pointercancel', stop);
  }

  set();
  return {
    el: svg,
    set,
    pointOnScreen: () => {
      const r = toRadians(current.angle);
      return screenPoint(svg, 380, 380, U_C + U_R * Math.cos(r), U_C - U_R * Math.sin(r));
    },
    destroy: () => svg.remove(),
  };
}

/* ================================================================ BOSS SCENE */

const BOSS_ART = {
  1() {
    return `
      <g class="boss-body">
        <polygon points="190,70 160,40 206,52" class="boss-ear" /><polygon points="290,70 320,40 274,52" class="boss-ear" />
        <ellipse cx="240" cy="92" rx="52" ry="48" class="boss-skin boss-green" />
        <circle cx="222" cy="82" r="11" class="boss-eye" /><circle cx="258" cy="82" r="11" class="boss-eye" />
        <circle class="boss-pupil" cx="224" cy="84" r="5" /><circle class="boss-pupil" cx="256" cy="84" r="5" />
        <path d="M218 108 Q240 128 262 108" class="boss-mouth" /><path d="M226 111 l4 8 l4 -7 M246 111 l4 8 l4 -8" class="boss-fang" />
      </g>`;
  },
  2() {
    return `
      <g class="boss-body">
        <path d="M188 138 L188 82 Q188 36 240 36 Q292 36 292 82 L292 138 L274 124 L256 140 L240 124 L224 140 L206 124 Z" class="boss-skin boss-blue" />
        <ellipse cx="220" cy="82" rx="9" ry="13" class="boss-eye boss-glow-eye" /><ellipse cx="260" cy="82" rx="9" ry="13" class="boss-eye boss-glow-eye" />
        <ellipse cx="240" cy="108" rx="10" ry="14" class="boss-mouth-hole" />
      </g>`;
  },
  3() {
    return `
      <g class="boss-body">
        <path d="M188 96 L120 52 L152 108 Z" class="boss-wing" /><path d="M292 96 L360 52 L328 108 Z" class="boss-wing" />
        <polygon points="204,56 190,22 222,48" class="boss-horn" /><polygon points="276,56 290,22 258,48" class="boss-horn" />
        <ellipse cx="240" cy="92" rx="54" ry="48" class="boss-skin boss-violet" />
        <path d="M214 76 l16 6 l-16 8 z M266 76 l-16 6 l16 8 z" class="boss-eye boss-glow-eye" />
        <circle cx="228" cy="108" r="3.5" class="boss-nostril" /><circle cx="252" cy="108" r="3.5" class="boss-nostril" />
        <path d="M216 120 Q240 134 264 120" class="boss-mouth" />
      </g>`;
  },
};

export function createBossScene(container, tier) {
  const wrapper = document.createElement('div');
  wrapper.className = 'boss-scene';
  const svg = el('svg', { viewBox: '0 0 480 160', class: 'board-svg boss-svg', role: 'img', 'aria-label': 'The boss, protected by a glowing shield.' });
  svg.innerHTML = `
    <ellipse cx="240" cy="150" rx="120" ry="8" class="boss-shadow" />
    ${BOSS_ART[tier]()}
    <circle cx="240" cy="90" r="74" class="boss-shield" />
    <circle cx="240" cy="90" r="74" class="boss-shield-ring" />`;
  wrapper.appendChild(svg);
  container.appendChild(wrapper);

  const flash = (cls, ms) => {
    wrapper.classList.remove(cls);
    void wrapper.offsetWidth;
    wrapper.classList.add(cls);
    setTimeout(() => wrapper.classList.remove(cls), ms);
  };

  return {
    el: wrapper,
    hit: () => flash('is-hit', 700),
    attack: () => flash('is-attack', 700),
    defeat: () => wrapper.classList.add('is-defeated'),
    shieldUp: () => { wrapper.classList.remove('is-broken'); },
    shieldBreak: () => { wrapper.classList.add('is-broken'); },
    point: () => screenPoint(svg, 480, 160, 240, 90),
    destroy: () => wrapper.remove(),
  };
}
