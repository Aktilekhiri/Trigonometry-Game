/**
 * levels.js
 * Level selection screen: three cards, locked/unlocked state, best scores and stars.
 */

import { LEVEL_INFO } from './questions.js';
import { getBest, getProgress, isLevelUnlocked, resetProgress, TOTAL_LEVELS } from './storage.js';
import { registerScreen, openDialog, closeDialog, toast } from './ui.js';
import { shake } from './motion.js';
import { sounds } from './audio.js';

const byId = (id) => document.getElementById(id);
const starIcon = (isOn) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"${isOn ? ' class="is-on"' : ''}><use href="#icon-star"></use></svg>`;

function cardMarkup(info) {
  const unlocked = isLevelUnlocked(info.id);
  const best = getBest(info.id);
  const stars = best ? best.stars : 0;

  const lockBadge = unlocked
    ? ''
    : '<span class="lock-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-lock"></use></svg></span>';
  const needText = unlocked
    ? ''
    : `<p class="unlock-need" id="need-level-${info.id}">Finish Level ${info.id - 1} with at least 70% correct to unlock.</p>`;
  const buttonLabel = unlocked ? (best ? 'Play again' : 'Play level') : 'Locked';
  const buttonAttributes = unlocked ? '' : `aria-disabled="true" aria-describedby="need-level-${info.id}"`;

  return `
    ${lockBadge}
    <span class="level-number" aria-hidden="true">${info.id}</span>
    <span class="level-difficulty">${info.difficulty}</span>
    <h3 class="level-name">Level ${info.id}: ${info.name}</h3>
    <p class="level-summary">${info.summary}</p>
    <ul class="level-topics" aria-label="Topics">${info.topics.map((topic) => `<li>${topic}</li>`).join('')}</ul>
    ${needText}
    <div class="level-footer">
      <div class="mini-stars" role="img" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => starIcon(n <= stars)).join('')}</div>
      <span class="best-text">${best ? `Best score: ${best.score}/100` : 'No score yet'}</span>
    </div>
    <button class="btn ${unlocked ? 'btn-primary' : 'btn-ghost'}" type="button" ${buttonAttributes}>${buttonLabel}</button>
  `;
}

export function initLevels({ onStart, onProgressChange }) {
  const grid = byId('level-grid');

  function render() {
    grid.textContent = '';
    LEVEL_INFO.forEach((info) => {
      const card = document.createElement('article');
      card.className = `level-card glass${isLevelUnlocked(info.id) ? '' : ' is-locked'}`;
      card.dataset.level = String(info.id);
      card.dataset.accent = info.accent;
      card.setAttribute('data-animate', '');
      card.innerHTML = cardMarkup(info);
      grid.appendChild(card);
    });

    const progress = getProgress();
    const totalStars = Object.values(progress.best).reduce((sum, entry) => sum + entry.stars, 0);
    byId('levels-summary').textContent = `${progress.unlockedLevel} of ${TOTAL_LEVELS} levels unlocked · ${totalStars} of ${TOTAL_LEVELS * 3} stars collected`;
  }

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.level-card');
    if (!card) return;
    const level = Number(card.dataset.level);

    if (!isLevelUnlocked(level)) {
      shake(card);
      toast(`Finish Level ${level - 1} with at least 70% correct answers to unlock Level ${level}.`, { type: 'warning' });
      return;
    }
    sounds.click();
    onStart(level);
  });

  byId('btn-reset').addEventListener('click', () => {
    sounds.click();
    openDialog('dialog-reset');
  });
  byId('reset-cancel').addEventListener('click', () => closeDialog('dialog-reset'));
  byId('reset-confirm').addEventListener('click', () => {
    resetProgress();
    closeDialog('dialog-reset');
    render();
    onProgressChange?.();
    toast('Progress reset. Levels 2 and 3 are locked again.');
  });

  registerScreen('levels', { beforeShow: render });
  render();
}
