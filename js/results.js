/**
 * results.js
 * Results screen: stars, accuracy, score, mistakes with explanations, replay / next level.
 */

import { LEVEL_INFO } from './questions.js';
import { recordResult, isLevelUnlocked, TOTAL_LEVELS } from './storage.js';
import { showScreen } from './ui.js';
import { sounds } from './audio.js';
import { confetti } from './fx.js';
import { countTo, starsReveal, popIn } from './motion.js';

const byId = (id) => document.getElementById(id);

let lastLevel = 1;

function titleFor(summary) {
  if (!summary.completed) return 'Game Over';
  if (!summary.passed) return 'Almost there!';
  if (summary.stars === 3) return 'Perfect!';
  if (summary.stars === 2) return 'Great job!';
  return 'Level complete!';
}

function subtitleFor(summary) {
  if (!summary.completed) {
    return `You ran out of hearts after ${summary.answeredCount} of ${summary.total} questions. Read the explanations below, then try again!`;
  }
  const base = `You answered ${summary.correctCount} of ${summary.total} questions correctly.`;
  if (!summary.passed) return `${base} You need at least 70% to unlock the next level.`;
  if (summary.stars < 3) return `${base} Get 9 or more right for 3 stars.`;
  return `${base} Outstanding work!`;
}

function renderMistakes(summary) {
  const list = byId('mistake-list');
  list.textContent = '';

  summary.mistakes.forEach((entry, index) => {
    const item = document.createElement('li');
    item.className = 'mistake-item';

    const question = document.createElement('p');
    question.className = 'm-question';
    question.textContent = `${index + 1}. ${entry.question.prompt}`;

    const yours = document.createElement('p');
    yours.className = 'm-yours';
    yours.textContent = entry.timedOut ? 'You ran out of time.' : `Your answer: ${entry.question.options[entry.chosenIndex].text}`;

    const right = document.createElement('p');
    right.className = 'm-right';
    right.textContent = `Correct answer: ${entry.question.correctText}`;

    const why = document.createElement('p');
    why.className = 'm-why';
    why.textContent = entry.question.explanation;

    item.append(question, yours, right, why);
    list.appendChild(item);
  });

  byId('results-mistakes').hidden = summary.mistakes.length === 0;
  byId('results-perfect').hidden = summary.mistakes.length !== 0;
}

export async function showResults({ level, summary }) {
  lastLevel = level;
  const info = LEVEL_INFO[level - 1];

  const { isNewBest, unlockedNext } = recordResult(level, {
    score: summary.score,
    stars: summary.stars,
    accuracy: summary.accuracy,
    passed: summary.passed,
  });
  document.dispatchEvent(new CustomEvent('progresschange'));

  byId('results-eyebrow').textContent = `Level ${level} · ${info.name}`;
  byId('results-title').textContent = titleFor(summary);
  byId('results-subtitle').textContent = subtitleFor(summary);
  byId('results-stars').setAttribute('aria-label', `${summary.stars} of 3 stars`);

  const bestBadge = byId('results-best');
  bestBadge.hidden = !(isNewBest && summary.score > 0);

  const unlockBanner = byId('results-unlock');
  if (unlockedNext) {
    unlockBanner.textContent = `Level ${level + 1} unlocked!`;
    unlockBanner.hidden = false;
  } else if (summary.passed && level === TOTAL_LEVELS) {
    unlockBanner.textContent = 'You finished every level. You are a Trigonometry Master!';
    unlockBanner.hidden = false;
  } else {
    unlockBanner.hidden = true;
  }

  // Stats start at zero and count up once the screen is visible.
  ['stat-score', 'stat-accuracy', 'stat-correct', 'stat-mistakes'].forEach((id) => {
    byId(id).textContent = '0';
  });
  renderMistakes(summary);

  const nextButton = byId('btn-next-level');
  nextButton.hidden = !(level < TOTAL_LEVELS && isLevelUnlocked(level + 1));

  await showScreen('results', { force: true });

  countTo(byId('stat-score'), summary.score, { duration: 1 });
  countTo(byId('stat-accuracy'), summary.accuracy, { duration: 1, suffix: '%' });
  countTo(byId('stat-correct'), summary.correctCount, { duration: 0.8 });
  countTo(byId('stat-mistakes'), summary.wrongCount, { duration: 0.8 });
  starsReveal([...byId('results-stars').querySelectorAll('.star')], summary.stars);
  if (!bestBadge.hidden) popIn(bestBadge, 0.5);
  if (!unlockBanner.hidden) popIn(unlockBanner, 0.8);

  if (!summary.completed) {
    sounds.gameOver();
  } else if (summary.passed) {
    sounds.win();
    confetti(level === TOTAL_LEVELS ? 2 : 1);
    if (unlockedNext) setTimeout(() => sounds.unlock(), 900);
  } else {
    sounds.timeout();
  }
}

export function initResults({ onReplay, onNextLevel }) {
  byId('btn-play-again').addEventListener('click', () => {
    sounds.click();
    onReplay(lastLevel);
  });
  byId('btn-next-level').addEventListener('click', () => {
    sounds.click();
    onNextLevel(lastLevel + 1);
  });
  byId('btn-all-levels').addEventListener('click', () => {
    sounds.click();
    showScreen('levels');
  });
}
