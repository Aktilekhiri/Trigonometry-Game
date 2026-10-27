/**
 * learn.js
 * The "Learn Trigonometry" screen: four tabs with interactive SVG diagrams.
 *   1. Right triangle (angle slider, live ratios)
 *   2. SOH CAH TOA (highlights the sides each ratio uses)
 *   3. Unit circle (rotating radius, sine/cosine projections, wave graph)
 *   4. Special angles table
 */

import { SPECIAL_ANGLES, exactOrNull, exactValue, degreesToPiText, quadrantOf, toRadians, ROMAN } from './trig.js';
import { renderMath } from './mathfmt.js';
import { panelIn } from './motion.js';
import { registerScreen } from './ui.js';
import { sounds } from './audio.js';

const byId = (id) => document.getElementById(id);
const setAttributes = (element, attributes) => {
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
};
const formatDecimal = (value) => {
  if (Math.abs(value) < 0.0005) return '0.000';
  return value < 0 ? `−${Math.abs(value).toFixed(3)}` : value.toFixed(3);
};

/* ------------------------------------------------------- shared triangle SVG */

const TRIANGLE = { ax: 100, ay: 285, hypotenuse: 270 };

function buildTriangle(svg) {
  svg.insertAdjacentHTML(
    'beforeend',
    `
    <polygon class="tri-fill" data-part="fill"></polygon>
    <path class="angle-arc" data-part="arc"></path>
    <path class="right-mark" data-part="right"></path>
    <line class="side side-adjacent" data-part="adj"></line>
    <line class="side side-opposite" data-part="opp"></line>
    <line class="side side-hypotenuse" data-part="hyp"></line>
    <text class="svg-label" data-part="theta" text-anchor="middle" dominant-baseline="middle">θ</text>
    <text class="svg-label label-adjacent" data-part="adjLabel" text-anchor="middle">Adjacent</text>
    <text class="svg-label label-opposite" data-part="oppLabel">Opposite</text>
    <text class="svg-label label-hypotenuse" data-part="hypLabel" text-anchor="end">Hypotenuse</text>
    <text class="svg-small" data-part="rightLabel">90°</text>
  `,
  );
  const parts = {};
  svg.querySelectorAll('[data-part]').forEach((element) => {
    parts[element.dataset.part] = element;
  });
  return parts;
}

function updateTriangle(parts, thetaDegrees) {
  const { ax, ay, hypotenuse } = TRIANGLE;
  const radians = toRadians(thetaDegrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const A = { x: ax, y: ay };
  const C = { x: ax + hypotenuse * cos, y: ay };
  const B = { x: C.x, y: ay - hypotenuse * sin };
  const f = (n) => n.toFixed(1);

  parts.fill.setAttribute('points', `${f(A.x)},${f(A.y)} ${f(C.x)},${f(C.y)} ${f(B.x)},${f(B.y)}`);
  setAttributes(parts.adj, { x1: f(A.x), y1: f(A.y), x2: f(C.x), y2: f(C.y) });
  setAttributes(parts.opp, { x1: f(C.x), y1: f(C.y), x2: f(B.x), y2: f(B.y) });
  setAttributes(parts.hyp, { x1: f(A.x), y1: f(A.y), x2: f(B.x), y2: f(B.y) });
  parts.right.setAttribute('d', `M${f(C.x - 18)},${f(C.y)} L${f(C.x - 18)},${f(C.y - 18)} L${f(C.x)},${f(C.y - 18)}`);
  setAttributes(parts.rightLabel, { x: f(C.x - 46), y: f(C.y - 8) });

  // Angle arc at A
  const arcRadius = 46;
  const arcEnd = { x: A.x + arcRadius * cos, y: A.y - arcRadius * sin };
  parts.arc.setAttribute('d', `M${f(A.x)},${f(A.y)} L${f(A.x + arcRadius)},${f(A.y)} A${arcRadius},${arcRadius} 0 0 0 ${f(arcEnd.x)},${f(arcEnd.y)} Z`);

  // θ label: further out when the wedge is thin so it never touches a side.
  const labelRadius = Math.min(125, Math.max(70, 26 / radians));
  const half = radians / 2;
  setAttributes(parts.theta, {
    x: f(A.x + labelRadius * Math.cos(half)),
    y: f(A.y - labelRadius * Math.sin(half)),
  });

  setAttributes(parts.adjLabel, { x: f((A.x + C.x) / 2), y: f(A.y + 28) });
  setAttributes(parts.oppLabel, { x: f(C.x + 14), y: f((C.y + B.y) / 2 + 5) });

  const middle = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  setAttributes(parts.hypLabel, { x: f(middle.x - 16 * sin), y: f(middle.y - 16 * cos) });
}

/* ------------------------------------------------------------ tab 1: triangle */

function initTriangleTab() {
  const svg = byId('triangle-svg');
  const parts = buildTriangle(svg);
  const slider = byId('triangle-angle');
  const output = byId('triangle-angle-output');
  const note = byId('triangle-note');
  const defaultNote = note.textContent;

  const update = () => {
    const theta = Number(slider.value);
    const radians = toRadians(theta);
    output.textContent = `${theta}°`;
    slider.setAttribute('aria-valuetext', `${theta} degrees`);
    updateTriangle(parts, theta);
    byId('triangle-sin').textContent = Math.sin(radians).toFixed(3);
    byId('triangle-cos').textContent = Math.cos(radians).toFixed(3);
    byId('triangle-tan').textContent = Math.tan(radians).toFixed(3);

    const exactSin = exactOrNull('sin', theta);
    note.textContent =
      exactSin !== null && theta % 15 === 0 && [30, 45, 60].includes(theta)
        ? `θ = ${theta}° is a special angle! Exactly: sin = ${exactSin}, cos = ${exactValue('cos', theta)}, tan = ${exactValue('tan', theta)}.`
        : defaultNote;
  };

  slider.addEventListener('input', update);
  update();
}

/* ----------------------------------------------------------- tab 2: SOH CAH TOA */

const RATIOS = {
  sin: {
    name: 'Sine',
    top: 'Opposite',
    bottom: 'Hypotenuse',
    topClass: 'part-opposite',
    bottomClass: 'part-hypotenuse',
    lit: ['opp', 'hyp'],
    dim: ['adj'],
    text: 'Sine compares the side across from θ with the longest side. It is always between 0 and 1.',
  },
  cos: {
    name: 'Cosine',
    top: 'Adjacent',
    bottom: 'Hypotenuse',
    topClass: 'part-adjacent',
    bottomClass: 'part-hypotenuse',
    lit: ['adj', 'hyp'],
    dim: ['opp'],
    text: 'Cosine compares the side next to θ with the longest side. It is also between 0 and 1.',
  },
  tan: {
    name: 'Tangent',
    top: 'Opposite',
    bottom: 'Adjacent',
    topClass: 'part-opposite',
    bottomClass: 'part-adjacent',
    lit: ['opp', 'adj'],
    dim: ['hyp'],
    text: 'Tangent compares the side across from θ with the side next to it. The steeper the angle, the larger the tangent.',
  },
};

function initSohTab() {
  const SOH_THETA = 35;
  const svg = byId('soh-svg');
  const parts = buildTriangle(svg);
  updateTriangle(parts, SOH_THETA);

  const formula = byId('soh-formula');
  const explanation = byId('soh-explanation');
  const buttons = [...document.querySelectorAll('.soh-btn')];
  const labelFor = { opp: 'oppLabel', adj: 'adjLabel', hyp: 'hypLabel' };

  // Sides measured with the hypotenuse = 10 units, so the numbers are easy to read.
  const units = {
    opp: 10 * Math.sin(toRadians(SOH_THETA)),
    adj: 10 * Math.cos(toRadians(SOH_THETA)),
    hyp: 10,
  };

  const select = (ratioKey) => {
    const ratio = RATIOS[ratioKey];
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ratio === ratioKey)));

    ['opp', 'adj', 'hyp'].forEach((side) => {
      const isLit = ratio.lit.includes(side);
      parts[side].classList.toggle('is-lit', isLit);
      parts[side].classList.toggle('is-dim', !isLit);
      parts[labelFor[side]].classList.toggle('is-dim', !isLit);
    });

    const topKey = ratio.top === 'Opposite' ? 'opp' : 'adj';
    const bottomKey = ratio.bottom === 'Hypotenuse' ? 'hyp' : 'adj';
    const value = units[topKey] / units[bottomKey];
    formula.innerHTML =
      `${ratio.name.toLowerCase().slice(0, 3)} θ = <span class="${ratio.topClass}">${ratio.top}</span> ÷ ` +
      `<span class="${ratio.bottomClass}">${ratio.bottom}</span><br>` +
      `<small>For θ = ${SOH_THETA}° (hypotenuse = 10): ${units[topKey].toFixed(2)} ÷ ${units[bottomKey].toFixed(2)} = ${value.toFixed(3)}</small>`;
    explanation.textContent = ratio.text;
  };

  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      sounds.click();
      select(button.dataset.ratio);
    }),
  );
  select('sin');
}

/* -------------------------------------------------------------- tab 3: circle */

const CIRCLE = { cx: 200, cy: 200, r: 150 };
const LABEL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const SNAP_ANGLES = [0, 30, 45, 60, 90, 135, 180, 225, 270, 315, 360];
const WAVE = { x0: 20, x1: 380, y0: 85, amplitude: 60 };

const circleState = { angle: 45, rotating: false, frame: 0, lastTime: 0, parts: {}, wave: {}, labels: [], snaps: [] };

function buildCircle(svg) {
  const { cx, cy, r } = CIRCLE;
  let ticks = '';
  let labels = '';
  LABEL_ANGLES.forEach((angle) => {
    const radians = toRadians(angle);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    ticks += `<line class="svg-axis" x1="${(cx + (r - 6) * cos).toFixed(1)}" y1="${(cy - (r - 6) * sin).toFixed(1)}" x2="${(cx + (r + 6) * cos).toFixed(1)}" y2="${(cy - (r + 6) * sin).toFixed(1)}"></line>`;
    labels += `<text class="uc-label" data-angle="${angle}" x="${(cx + 180 * cos).toFixed(1)}" y="${(cy - 180 * sin).toFixed(1)}">${angle}°</text>`;
  });

  svg.insertAdjacentHTML(
    'beforeend',
    `
    <defs>
      <linearGradient id="uc-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#22e4ff"></stop><stop offset="0.5" stop-color="#9b6bff"></stop><stop offset="1" stop-color="#ff4fd8"></stop>
      </linearGradient>
      <filter id="uc-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
        <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
      </filter>
    </defs>
    <circle class="svg-grid" cx="${cx}" cy="${cy}" r="${r / 2}" fill="none"></circle>
    <line class="svg-axis" x1="14" y1="${cy}" x2="386" y2="${cy}"></line>
    <line class="svg-axis" x1="${cx}" y1="14" x2="${cx}" y2="386"></line>
    <circle class="uc-ring" cx="${cx}" cy="${cy}" r="${r}" filter="url(#uc-glow)"></circle>
    ${ticks}
    ${labels}
    <text class="svg-small" x="${cx + r + 4}" y="${cy + 15}" text-anchor="start">1</text>
    <text class="svg-small" x="${cx - r - 4}" y="${cy + 15}" text-anchor="end">−1</text>
    <text class="svg-small" x="${cx + 8}" y="${cy - r + 14}">1</text>
    <text class="svg-small" x="${cx + 8}" y="${cy + r - 6}">−1</text>
    <path class="angle-arc" data-part="arc"></path>
    <line class="uc-guide" data-part="guideV" stroke="#22e4ff"></line>
    <line class="uc-guide" data-part="guideH" stroke="#ff4fd8"></line>
    <line class="uc-cos" data-part="cosLine"></line>
    <line class="uc-sin" data-part="sinLine"></line>
    <line class="uc-radius" data-part="radius"></line>
    <circle class="uc-point" data-part="point" r="9" filter="url(#uc-glow)"></circle>
    <text class="svg-label label-adjacent" data-part="cosLabel" text-anchor="middle">cos θ</text>
    <text class="svg-label label-opposite" data-part="sinLabel">sin θ</text>
    <text class="svg-label" data-part="thetaLabel" text-anchor="middle" dominant-baseline="middle">θ</text>
  `,
  );

  svg.querySelectorAll('[data-part]').forEach((element) => {
    circleState.parts[element.dataset.part] = element;
  });
  circleState.labels = [...svg.querySelectorAll('.uc-label')];
}

function buildWave(svg) {
  const { x0, x1, y0, amplitude } = WAVE;
  const xOf = (degrees) => x0 + (degrees / 360) * (x1 - x0);
  const yOf = (value) => y0 - value * amplitude;
  const path = (fn) => {
    let d = '';
    for (let degrees = 0; degrees <= 360; degrees += 4) {
      d += `${degrees === 0 ? 'M' : 'L'}${xOf(degrees).toFixed(1)},${yOf(fn(toRadians(degrees))).toFixed(1)} `;
    }
    return d;
  };
  const tickLabels = [0, 90, 180, 270, 360]
    .map((degrees) => `<text class="svg-small" x="${xOf(degrees)}" y="164" text-anchor="middle">${degrees}°</text>`)
    .join('');

  svg.insertAdjacentHTML(
    'beforeend',
    `
    <line class="svg-axis" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}"></line>
    <line class="svg-grid" x1="${x0}" y1="${yOf(1)}" x2="${x1}" y2="${yOf(1)}"></line>
    <line class="svg-grid" x1="${x0}" y1="${yOf(-1)}" x2="${x1}" y2="${yOf(-1)}"></line>
    ${tickLabels}
    <path class="wave-cos" d="${path(Math.cos)}"></path>
    <path class="wave-sin" d="${path(Math.sin)}"></path>
    <text class="svg-label label-opposite" x="${xOf(90)}" y="${yOf(1) - 7}" text-anchor="middle">sin</text>
    <text class="svg-label label-adjacent" x="${xOf(0) + 14}" y="${yOf(1) - 7}" text-anchor="middle">cos</text>
    <line class="wave-marker" data-wave="marker" y1="16" y2="148"></line>
    <circle data-wave="cosDot" r="6" fill="#22e4ff" stroke="#fff" stroke-width="2"></circle>
    <circle data-wave="sinDot" r="6" fill="#ff4fd8" stroke="#fff" stroke-width="2"></circle>
  `,
  );
  svg.querySelectorAll('[data-wave]').forEach((element) => {
    circleState.wave[element.dataset.wave] = element;
  });
  circleState.xOf = xOf;
  circleState.yOf = yOf;
}

function updateCircle(theta) {
  const { cx, cy, r } = CIRCLE;
  const { parts, wave } = circleState;
  const radians = toRadians(theta);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const px = cx + r * cos;
  const py = cy - r * sin;
  const f = (n) => n.toFixed(2);

  setAttributes(parts.radius, { x1: cx, y1: cy, x2: f(px), y2: f(py) });
  setAttributes(parts.point, { cx: f(px), cy: f(py) });
  setAttributes(parts.cosLine, { x1: cx, y1: cy, x2: f(px), y2: cy });
  setAttributes(parts.sinLine, { x1: cx, y1: cy, x2: cx, y2: f(py) });
  setAttributes(parts.guideV, { x1: f(px), y1: f(py), x2: f(px), y2: cy });
  setAttributes(parts.guideH, { x1: f(px), y1: f(py), x2: cx, y2: f(py) });

  // Pie-shaped arc showing the angle
  const arcRadius = 34;
  if (theta < 0.5) {
    parts.arc.setAttribute('d', '');
  } else if (theta > 359.5) {
    parts.arc.setAttribute(
      'd',
      `M${cx + arcRadius},${cy} A${arcRadius},${arcRadius} 0 1 0 ${cx - arcRadius},${cy} A${arcRadius},${arcRadius} 0 1 0 ${cx + arcRadius},${cy} Z`,
    );
  } else {
    parts.arc.setAttribute(
      'd',
      `M${cx},${cy} L${cx + arcRadius},${cy} A${arcRadius},${arcRadius} 0 ${theta > 180 ? 1 : 0} 0 ${f(cx + arcRadius * cos)},${f(cy - arcRadius * sin)} Z`,
    );
  }

  // Labels for the two projections (kept clear of the guide lines)
  setAttributes(parts.cosLabel, { x: f(cx + (r * cos) / 2), y: sin >= 0 ? cy + 24 : cy - 12 });
  parts.cosLabel.style.opacity = Math.abs(cos) > 0.2 ? '1' : '0';
  if (cos >= 0) setAttributes(parts.sinLabel, { x: cx - 10, y: f((cy + py) / 2 + 5), 'text-anchor': 'end' });
  else setAttributes(parts.sinLabel, { x: cx + 10, y: f((cy + py) / 2 + 5), 'text-anchor': 'start' });
  parts.sinLabel.style.opacity = Math.abs(sin) > 0.2 ? '1' : '0';

  const half = radians / 2;
  setAttributes(parts.thetaLabel, { x: f(cx + 52 * Math.cos(half)), y: f(cy - 52 * Math.sin(half)) });
  parts.thetaLabel.style.opacity = theta > 14 && theta < 346 ? '1' : '0';

  circleState.labels.forEach((label) => {
    const difference = Math.abs(((theta - Number(label.dataset.angle) + 540) % 360) - 180);
    label.classList.toggle('is-near', difference < 2.5);
  });

  // Wave marker
  const x = circleState.xOf(theta);
  setAttributes(wave.marker, { x1: f(x), x2: f(x) });
  setAttributes(wave.sinDot, { cx: f(x), cy: f(circleState.yOf(sin)) });
  setAttributes(wave.cosDot, { cx: f(x), cy: f(circleState.yOf(cos)) });
}

function updateReadouts(shownAngle) {
  const radians = toRadians(shownAngle);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const quadrant = quadrantOf(shownAngle);

  byId('readout-angle').textContent = `${shownAngle}° = ${degreesToPiText(shownAngle)}`;
  byId('readout-quadrant').textContent = quadrant === 0 ? 'On an axis' : `Quadrant ${ROMAN[quadrant]}`;
  byId('readout-cos').textContent = formatDecimal(cos);
  byId('readout-sin').textContent = formatDecimal(sin);
  byId('readout-tan').textContent = Math.abs(cos) < 1e-9 ? 'undefined' : formatDecimal(sin / cos);

  const exactCos = exactOrNull('cos', shownAngle);
  const exactSin = exactOrNull('sin', shownAngle);
  const exactElement = byId('readout-exact');
  if (exactCos !== null && exactSin !== null) renderMath(exactElement, `(${exactCos}, ${exactSin})`);
  else exactElement.textContent = 'not a special angle';
}

function setAngle(theta) {
  const clamped = Math.min(360, Math.max(0, theta));
  const shown = Math.round(clamped);
  circleState.angle = clamped;

  const slider = byId('circle-angle');
  slider.value = String(shown);
  slider.setAttribute('aria-valuetext', `${shown} degrees`);
  byId('circle-angle-output').textContent = `${shown}°`;

  updateCircle(clamped);
  updateReadouts(shown);
  circleState.snaps.forEach((button) => button.classList.toggle('is-active', Number(button.dataset.angle) === shown));
}

function stopRotation() {
  if (!circleState.rotating) return;
  circleState.rotating = false;
  cancelAnimationFrame(circleState.frame);
  const button = byId('circle-play');
  button.setAttribute('aria-pressed', 'false');
  byId('circle-play-label').textContent = 'Auto-rotate';
  byId('circle-play-icon').setAttribute('href', '#icon-play');
}

function rotationLoop(now) {
  if (!circleState.rotating) return;
  const seconds = Math.min((now - circleState.lastTime) / 1000, 0.1);
  circleState.lastTime = now;
  let next = circleState.angle + seconds * 40; // 40 degrees per second
  if (next > 360) next -= 360;
  setAngle(next);
  circleState.frame = requestAnimationFrame(rotationLoop);
}

function startRotation() {
  if (circleState.rotating) return;
  circleState.rotating = true;
  circleState.lastTime = performance.now();
  byId('circle-play').setAttribute('aria-pressed', 'true');
  byId('circle-play-label').textContent = 'Stop rotating';
  byId('circle-play-icon').setAttribute('href', '#icon-pause');
  circleState.frame = requestAnimationFrame(rotationLoop);
}

function initCircleTab() {
  buildCircle(byId('circle-svg'));
  buildWave(byId('wave-svg'));

  const snapContainer = byId('circle-snaps');
  SNAP_ANGLES.forEach((angle) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'snap-btn';
    button.dataset.angle = String(angle);
    button.textContent = `${angle}°`;
    button.setAttribute('aria-label', `Jump to ${angle} degrees`);
    button.addEventListener('click', () => {
      stopRotation();
      sounds.click();
      setAngle(angle);
    });
    snapContainer.appendChild(button);
    circleState.snaps.push(button);
  });

  byId('circle-angle').addEventListener('input', (event) => {
    stopRotation();
    setAngle(Number(event.target.value));
  });
  byId('circle-play').addEventListener('click', () => {
    sounds.click();
    if (circleState.rotating) stopRotation();
    else startRotation();
  });

  setAngle(45);
}

/* ------------------------------------------------------------ tab 4: the table */

function initTableTab() {
  const body = document.querySelector('#values-table tbody');
  SPECIAL_ANGLES.forEach((angle) => {
    const row = document.createElement('tr');

    const angleCell = document.createElement('td');
    angleCell.className = 'angle-cell';
    angleCell.textContent = `${angle}° (${degreesToPiText(angle)})`;
    row.appendChild(angleCell);

    ['sin', 'cos', 'tan'].forEach((fn) => {
      const cell = document.createElement('td');
      cell.className = `cell-${fn}`;
      const value = exactValue(fn, angle);
      if (value === 'Undefined') {
        cell.classList.add('cell-undefined');
        cell.textContent = 'undefined';
      } else {
        renderMath(cell, value);
      }
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'row-btn';
    button.textContent = 'See on circle';
    button.setAttribute('aria-label', `See ${angle} degrees on the unit circle`);
    button.addEventListener('click', () => {
      sounds.click();
      stopRotation();
      activateTab('circle');
      setAngle(angle);
    });
    actionCell.appendChild(button);
    row.appendChild(actionCell);
    body.appendChild(row);
  });

  byId('trick-sin').innerHTML = '√0/2 · √1/2 · √2/2 · √3/2 · √4/2<br>= 0 · 1/2 · √2/2 · √3/2 · 1';
  byId('trick-cos').innerHTML = '√4/2 · √3/2 · √2/2 · √1/2 · √0/2<br>= 1 · √3/2 · √2/2 · 1/2 · 0';
}

/* ----------------------------------------------------------------------- tabs */

const TAB_NAMES = ['triangle', 'soh', 'circle', 'table'];
let currentTab = 'triangle';

function activateTab(name, { focusTab = false, animate = true } = {}) {
  TAB_NAMES.forEach((tabName) => {
    const active = tabName === name;
    const tab = byId(`tab-${tabName}`);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    byId(`panel-${tabName}`).hidden = !active;
  });
  if (focusTab) byId(`tab-${name}`).focus();
  if (name !== 'circle') stopRotation();
  if (animate && name !== currentTab) panelIn(byId(`panel-${name}`));
  currentTab = name;
}

function initTabs() {
  const list = document.querySelector('#screen-learn .tabs');
  TAB_NAMES.forEach((name) => {
    byId(`tab-${name}`).addEventListener('click', () => {
      sounds.click();
      activateTab(name);
    });
  });
  list.addEventListener('keydown', (event) => {
    const index = TAB_NAMES.indexOf(currentTab);
    let target = null;
    if (event.key === 'ArrowRight') target = TAB_NAMES[(index + 1) % TAB_NAMES.length];
    if (event.key === 'ArrowLeft') target = TAB_NAMES[(index - 1 + TAB_NAMES.length) % TAB_NAMES.length];
    if (event.key === 'Home') target = TAB_NAMES[0];
    if (event.key === 'End') target = TAB_NAMES[TAB_NAMES.length - 1];
    if (target) {
      event.preventDefault();
      activateTab(target, { focusTab: true });
    }
  });
}

/* -------------------------------------------------------------------- entry */

export function initLearn() {
  initTriangleTab();
  initSohTab();
  initCircleTab();
  initTableTab();
  initTabs();

  document
    .querySelectorAll('#screen-learn .ratio-card, #screen-learn .legend li, #screen-learn .trick-card, #screen-learn .soh-btn, #screen-learn .readout')
    .forEach((element) => element.setAttribute('data-reveal', ''));

  registerScreen('learn', {
    beforeShow: () => activateTab(currentTab, { animate: false }),
    afterHide: stopRotation,
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopRotation();
  });
}
