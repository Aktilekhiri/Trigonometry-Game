/**
 * script.js - entry point
 * Wires the screens together. All the real work lives in js/*.js modules:
 *
 *   trig.js        exact trig values          puzzles.js     game rules and maths (no DOM)
 *   content.js     worlds, missions, lessons  boards.js      SVG boards: cannon, bay, circle, boss
 *   map.js         adventure path             play.js        mission screen
 *   results.js     results screen             learn.js       free-play diagrams
 *   ui.js          screens, dialogs, toasts   motion.js      GSAP helpers
 *   fx.js          particles + confetti       background.js  Three.js + floating symbols
 *   storage.js     localStorage               audio.js       Web Audio sounds
 */

import { NODES } from './js/content.js';
import { getSetting, getStreakCount, getTotalStars, getXp, isNodeDone, setSetting } from './js/storage.js';
import { setMuted, sounds, unlockAudio } from './js/audio.js';
import { initFx } from './js/fx.js';
import { initBackground, setBackgroundEnabled, startSymbols } from './js/background.js';
import { canAnimate, enterScreen, floatElements, prefersReducedMotion, stopTweens } from './js/motion.js';
import { getCurrentScreen, initDialogs, openDialog, showScreen } from './js/ui.js';
import { initLearn } from './js/learn.js';
import { initMap } from './js/map.js';
import { initPlay, requestExit, startNode } from './js/play.js';
import { initResults, showResults } from './js/results.js';
import { toRadians } from './js/trig.js';

const byId = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- settings */

function applySoundSetting() {
  const on = getSetting('sound');
  setMuted(!on);
  const button = byId('toggle-sound');
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', `Sound effects: ${on ? 'on' : 'off'}`);
  byId('sound-icon').setAttribute('href', on ? '#icon-volume-on' : '#icon-volume-off');
}

let floatingCards = [];

function startFloatingCards() {
  stopTweens(floatingCards);
  floatingCards = [];
  if (getSetting('effects') && canAnimate()) {
    floatingCards = floatElements([...document.querySelectorAll('.float-card')], { distance: 12, rotate: 3 });
  }
}

function applyEffectsSetting() {
  const on = getSetting('effects');
  document.body.classList.toggle('no-effects', !on);
  const button = byId('toggle-effects');
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', `Visual effects: ${on ? 'on' : 'off'}`);
  setBackgroundEnabled(on);
  startSymbols();
  startFloatingCards();
}

function initSettings() {
  applySoundSetting();
  byId('toggle-sound').addEventListener('click', () => {
    setSetting('sound', !getSetting('sound'));
    applySoundSetting();
    sounds.click();
  });

  byId('toggle-effects').addEventListener('click', () => {
    setSetting('effects', !getSetting('effects'));
    applyEffectsSetting();
    sounds.click();
  });
}

/* -------------------------------------------------------------- welcome */

function updateWelcomeProgress() {
  const done = NODES.filter((node) => isNodeDone(node.id)).length;
  const start = byId('btn-start');
  if (done === 0) {
    byId('welcome-progress').textContent = 'Your progress is saved automatically on this device.';
    start.textContent = 'Start Adventure';
    return;
  }
  const streak = getStreakCount();
  byId('welcome-progress').textContent =
    `Welcome back! Missions complete: ${done} of ${NODES.length} · ${getXp()} XP · ${getTotalStars()} stars` +
    (streak > 1 ? ` · ${streak}-day streak` : '') + '.';
  start.textContent = done === NODES.length ? 'Open the map' : 'Continue Adventure';
}

/** The decorative unit circle on the welcome screen: a radius that keeps turning. */
function initHeroOrbit() {
  const radius = byId('hero-radius');
  const cosLine = byId('hero-cos');
  const sinLine = byId('hero-sin');
  const dot = byId('hero-dot');
  const center = 200;
  const size = 130;
  let angle = 35;
  let last = performance.now();
  let frame = 0;

  const draw = () => {
    const r = toRadians(angle);
    const x = center + size * Math.cos(r);
    const y = center - size * Math.sin(r);
    radius.setAttribute('x2', x.toFixed(1));
    radius.setAttribute('y2', y.toFixed(1));
    cosLine.setAttribute('x2', x.toFixed(1));
    cosLine.setAttribute('y2', String(center));
    sinLine.setAttribute('x2', String(center));
    sinLine.setAttribute('y2', y.toFixed(1));
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', y.toFixed(1));
  };

  const loop = (now) => {
    frame = 0;
    if (document.hidden || getCurrentScreen() !== 'welcome' || prefersReducedMotion()) return;
    angle = (angle + ((now - last) / 1000) * 32) % 360;
    last = now;
    draw();
    frame = requestAnimationFrame(loop);
  };

  const start = () => {
    if (frame || prefersReducedMotion()) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };

  draw();
  start();
  document.addEventListener('screenchange', (event) => {
    if (event.detail.name === 'welcome') start();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
}

/* ------------------------------------------------------------------ boot */

function init() {
  initSettings();
  initFx();
  initDialogs();
  initBackground();
  initLearn();
  initMap({ onStart: startNode, onProgressChange: updateWelcomeProgress });
  initPlay({ onFinish: showResults });
  initResults({ onReplay: startNode });

  document.body.classList.toggle('no-effects', !getSetting('effects'));
  startFloatingCards();
  initHeroOrbit();
  updateWelcomeProgress();
  document.addEventListener('progresschange', updateWelcomeProgress);

  // Browsers only allow sound after a user gesture.
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  byId('btn-start').addEventListener('click', () => {
    sounds.click();
    showScreen('map');
  });
  byId('btn-learn').addEventListener('click', () => {
    sounds.click();
    showScreen('learn');
  });
  byId('btn-howto').addEventListener('click', () => {
    sounds.click();
    openDialog('dialog-howto');
  });

  // Any element with data-nav="screenName" navigates there.
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-nav]');
    if (!target) return;
    sounds.click();
    showScreen(target.dataset.nav);
  });

  // The logo: during a mission it asks first (so progress is never lost by accident).
  byId('brand-home').addEventListener('click', () => {
    sounds.click();
    if (getCurrentScreen() === 'play') requestExit();
    else showScreen('welcome');
  });

  enterScreen(byId('screen-welcome'));
  byId('welcome-title').focus({ preventScroll: true });
}

init();
