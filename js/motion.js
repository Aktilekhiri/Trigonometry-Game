/**
 * motion.js
 * All GSAP animation helpers in one place.
 * - Only transforms and opacity are animated (smooth, GPU friendly).
 * - Every helper degrades gracefully: without GSAP (offline) or with
 *   "prefers-reduced-motion", content simply appears in its final state.
 */

import { getSetting } from './storage.js';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const hasGsap = () => typeof window.gsap !== 'undefined';

export const prefersReducedMotion = () => reducedMotionQuery.matches;
export const canAnimate = () => hasGsap() && !prefersReducedMotion();
/** Decorative effects (3D background, particles, confetti). */
export const effectsEnabled = () => getSetting('effects') !== false && !prefersReducedMotion();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Never let a broken animation block the game: resolve after maxMs no matter what. */
const timeboxed = (promise, maxMs = 1600) => Promise.race([promise, wait(maxMs)]);

/* ----------------------------------------------------------- screen changes */

export function enterScreen(screen) {
  if (!canAnimate()) return Promise.resolve();
  const gsap = window.gsap;
  const items = [...screen.querySelectorAll('[data-animate]')];

  const animation = new Promise((resolve) => {
    gsap.killTweensOf([screen, ...items]);
    const timeline = gsap.timeline({
      onComplete() {
        gsap.set([screen, ...items], { clearProps: 'opacity,transform,visibility' });
        resolve();
      },
    });
    timeline.fromTo(screen, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 0);
    if (items.length) {
      timeline.from(items, { opacity: 0, y: 26, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.05);
    }
  });
  return timeboxed(animation);
}

export function leaveScreen(screen) {
  if (!canAnimate()) return Promise.resolve();
  const gsap = window.gsap;
  const animation = new Promise((resolve) => {
    gsap.to(screen, {
      opacity: 0,
      y: -14,
      duration: 0.22,
      ease: 'power2.in',
      onComplete() {
        gsap.set(screen, { clearProps: 'opacity,transform' });
        resolve();
      },
    });
  });
  return timeboxed(animation, 800);
}

export function modalIn(card) {
  if (!card || !canAnimate()) return;
  window.gsap.fromTo(
    card,
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)', clearProps: 'opacity,transform' },
  );
}

export function panelIn(panel) {
  if (!panel || !canAnimate()) return;
  const gsap = window.gsap;
  gsap.fromTo(panel, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'opacity,transform' });
  const items = panel.querySelectorAll('[data-reveal]');
  if (items.length) {
    gsap.from(items, { opacity: 0, y: 16, duration: 0.45, stagger: 0.06, ease: 'power2.out', delay: 0.1, clearProps: 'opacity,transform' });
  }
}

/* --------------------------------------------------------------- quiz moves */

export function questionIn(card) {
  if (!canAnimate()) return;
  window.gsap.fromTo(
    card,
    { opacity: 0, y: -22, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', clearProps: 'opacity,transform', overwrite: 'auto' },
  );
}

export function staggerAnswers(buttons) {
  if (!canAnimate()) return;
  window.gsap.from(buttons, {
    opacity: 0,
    y: 30,
    scale: 0.94,
    duration: 0.5,
    stagger: 0.09,
    delay: 0.12,
    ease: 'back.out(1.6)',
    clearProps: 'opacity,transform',
    overwrite: 'auto',
  });
}

export function feedbackIn(panel) {
  if (!canAnimate()) return;
  window.gsap.fromTo(
    panel,
    { opacity: 0, y: 26 },
    { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'opacity,transform', overwrite: 'auto' },
  );
}

export function progressTo(fill, ratio) {
  if (!canAnimate()) {
    fill.style.transform = `scaleX(${ratio})`;
    return;
  }
  window.gsap.to(fill, { scaleX: ratio, duration: 0.6, ease: 'power2.out', overwrite: true });
}

export function countTo(element, to, { from = 0, duration = 0.8, suffix = '' } = {}) {
  if (element._countTween) element._countTween.kill();
  if (!canAnimate() || from === to) {
    element.textContent = `${to}${suffix}`;
    return;
  }
  const counter = { value: from };
  element._countTween = window.gsap.to(counter, {
    value: to,
    duration,
    ease: 'power2.out',
    onUpdate() {
      element.textContent = `${Math.round(counter.value)}${suffix}`;
    },
    onComplete() {
      element.textContent = `${to}${suffix}`;
    },
  });
}

export function scorePopup(anchor, text) {
  if (!canAnimate() || !anchor) return;
  const gsap = window.gsap;
  const popup = document.createElement('span');
  popup.className = 'score-popup';
  popup.textContent = text;
  anchor.appendChild(popup);
  gsap.set(popup, { xPercent: -50 });
  gsap
    .timeline({ onComplete: () => popup.remove() })
    .fromTo(popup, { y: 0, opacity: 0, scale: 0.6 }, { y: -40, opacity: 1, scale: 1.15, duration: 0.35, ease: 'back.out(2)' })
    .to(popup, { y: -72, opacity: 0, duration: 0.5, delay: 0.25, ease: 'power1.in' });
}

export function heartLost(heart) {
  heart.classList.add('is-lost');
  if (!canAnimate()) return;
  window.gsap.fromTo(
    heart,
    { scale: 1.8, rotation: -20 },
    { scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', clearProps: 'transform' },
  );
}

export function heartsReset(hearts) {
  hearts.forEach((heart) => heart.classList.remove('is-lost'));
  if (!canAnimate()) return;
  window.gsap.from(hearts, { scale: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(2)', clearProps: 'transform' });
}

export function pulse(element, scale = 1.12) {
  if (!canAnimate()) return;
  window.gsap.fromTo(element, { scale: 1 }, { scale, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut', clearProps: 'transform' });
}

/** CSS-driven shake (works without GSAP, disabled by reduced motion automatically). */
export function shake(element) {
  element.classList.remove('shake');
  void element.offsetWidth; // restart the animation
  element.classList.add('shake');
  setTimeout(() => element.classList.remove('shake'), 520);
}

/* ----------------------------------------------------------------- results */

export function starsReveal(stars, earned) {
  stars.forEach((star) => star.classList.remove('is-on'));
  if (!canAnimate()) {
    stars.forEach((star, index) => star.classList.toggle('is-on', index < earned));
    return;
  }
  const gsap = window.gsap;
  const timeline = gsap.timeline({ delay: 0.3 });
  stars.forEach((star, index) => {
    timeline.fromTo(
      star,
      { scale: 0, rotation: -140, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2.2)', clearProps: 'transform,opacity' },
      index * 0.32,
    );
    timeline.add(() => star.classList.toggle('is-on', index < earned), index * 0.32 + 0.22);
  });
}

export function popIn(element, delay = 0) {
  if (!canAnimate()) return;
  window.gsap.from(element, { scale: 0.6, opacity: 0, duration: 0.6, delay, ease: 'back.out(2)', clearProps: 'transform,opacity' });
}

/* --------------------------------------------------------- floating shapes */

export function floatElements(elements, { distance = 14, rotate = 6 } = {}) {
  if (!canAnimate()) return [];
  const gsap = window.gsap;
  return elements.map((element) =>
    gsap.to(element, {
      y: `+=${gsap.utils.random(-distance, distance)}`,
      x: `+=${gsap.utils.random(-distance / 2, distance / 2)}`,
      rotation: gsap.utils.random(-rotate, rotate),
      duration: gsap.utils.random(3, 6),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: gsap.utils.random(0, 2),
    }),
  );
}

export function stopTweens(tweens) {
  tweens.forEach((tween) => tween.kill());
  tweens.length = 0;
}
