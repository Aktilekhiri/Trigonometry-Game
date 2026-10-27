/**
 * ui.js
 * Screen manager, dialogs, toasts and screen-reader announcements.
 */

import { enterScreen, leaveScreen, modalIn, canAnimate } from './motion.js';

const TITLES = {
  welcome: 'Trigonometry Adventure',
  learn: 'Playground · Trigonometry Adventure',
  map: 'Adventure Map · Trigonometry Adventure',
  play: 'Mission · Trigonometry Adventure',
  results: 'Results · Trigonometry Adventure',
};

const screenHooks = {};
let currentScreen = 'welcome';
let transitioning = false;
let pendingNavigation = null;

export const getCurrentScreen = () => currentScreen;
export const isTransitioning = () => transitioning;
const screenElement = (name) => document.getElementById(`screen-${name}`);

/** Lets a module prepare content (beforeShow) or react (afterShow / afterHide). */
export function registerScreen(name, hooks) {
  screenHooks[name] = hooks;
}

export async function showScreen(name, options = {}) {
  if (transitioning) {
    pendingNavigation = { name, options }; // only the latest request matters
    return;
  }
  if (name === currentScreen && !options.force) return;

  transitioning = true;
  try {
    const from = screenElement(currentScreen);
    const to = screenElement(name);

    screenHooks[currentScreen]?.afterHide?.();
    await leaveScreen(from);
    from.hidden = true;

    await screenHooks[name]?.beforeShow?.(options);
    to.hidden = false;
    window.scrollTo(0, 0);
    currentScreen = name;
    document.title = TITLES[name] || TITLES.welcome;
    document.dispatchEvent(new CustomEvent('screenchange', { detail: { name } }));

    const entering = enterScreen(to);
    const heading = to.querySelector('[tabindex="-1"]');
    if (heading && options.focus !== false) heading.focus({ preventScroll: true });
    await entering;
    screenHooks[name]?.afterShow?.();
  } finally {
    transitioning = false;
    if (pendingNavigation) {
      const next = pendingNavigation;
      pendingNavigation = null;
      showScreen(next.name, next.options);
    }
  }
}

/* ------------------------------------------------------------------ dialogs */

export function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  modalIn(dialog.querySelector('.dialog-card'));
}

export function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog || !dialog.open) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

export const isAnyDialogOpen = () => [...document.querySelectorAll('dialog')].some((dialog) => dialog.open);

export function initDialogs() {
  document.addEventListener('click', (event) => {
    const closer = event.target.closest('[data-close-dialog]');
    if (closer) closer.closest('dialog')?.close();
  });
  // Click on the dimmed backdrop closes the dialog.
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

/* ----------------------------------------------------------- toast & aria-live */

export function toast(message, { type = 'info', duration = 3200 } = {}) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const item = document.createElement('div');
  item.className = `toast${type === 'warning' ? ' is-warning' : ''}`;
  item.textContent = message;
  region.appendChild(item);

  if (canAnimate()) {
    window.gsap.fromTo(item, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  }
  setTimeout(() => {
    const remove = () => item.remove();
    if (canAnimate()) window.gsap.to(item, { opacity: 0, y: 10, duration: 0.25, onComplete: remove });
    else remove();
  }, duration);
}

export function announce(message) {
  const region = document.getElementById('sr-announcer');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, 40);
}
