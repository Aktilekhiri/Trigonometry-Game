/**
 * results.js
 * After a mission: stars, XP, streak, what unlocked, and what was practised.
 * Also the "out of hearts" screen, which is friendly: mistakes are part of learning.
 */

import { NODES, WORLDS, nextNode, nodesOfWorld } from './content.js';
import { completeNode, getStreakCount, getXp } from './storage.js';
import { showScreen } from './ui.js';
import { sounds } from './audio.js';
import { confetti } from './fx.js';
import { countTo, popIn, starsReveal } from './motion.js';

const $ = (id) => document.getElementById(id);

let lastNodeId = null;

function banner(text, className) {
  const item = document.createElement('p');
  item.className = `result-banner ${className}`;
  item.textContent = text;
  return item;
}

function titleFor(node, outcome) {
  if (!outcome.completed) return 'Out of hearts';
  if (node.id === NODES[NODES.length - 1].id) return 'Trigonometry master!';
  if (node.kind === 'lesson') return 'Lesson complete!';
  if (node.kind === 'boss') return 'Boss defeated!';
  return outcome.stars === 3 ? 'Flawless!' : 'Mission complete!';
}

function subtitleFor(node, outcome) {
  if (!outcome.completed) {
    return 'No problem: every mistake teaches something. Use the Hint button and the cheat sheet, then try again.';
  }
  if (node.kind === 'lesson') return 'You are ready to put it into practice.';
  if (outcome.mistakes === 0) return 'Not a single mistake. Brilliant!';
  return `You finished with ${outcome.hearts} ${outcome.hearts === 1 ? 'heart' : 'hearts'} left. Finish with more hearts for more stars.`;
}

export async function showResults(outcome) {
  const { node, completed } = outcome;
  lastNodeId = node.id;

  let record = { firstCompletion: false, streakExtended: false, streakCount: getStreakCount() };
  if (completed) record = completeNode(node.id, { stars: outcome.stars, xp: outcome.xp });

  $('results-eyebrow').textContent = node.title;
  $('results-title').textContent = titleFor(node, outcome);
  $('results-subtitle').textContent = subtitleFor(node, outcome);
  $('screen-results').classList.toggle('is-failed', !completed);

  // Stars (lessons always give 3)
  const starsBox = $('results-stars');
  starsBox.hidden = !completed;
  starsBox.setAttribute('aria-label', `${outcome.stars} of 3 stars`);
  starsBox.querySelectorAll('.star').forEach((star) => star.classList.remove('is-on'));

  // Banners
  const banners = $('results-banners');
  banners.textContent = '';
  const upcoming = nextNode(node.id);
  if (completed) {
    if (record.streakExtended) banners.appendChild(banner(`Day streak: ${record.streakCount} ${record.streakCount === 1 ? 'day' : 'days'}. Come back tomorrow to keep it going!`, 'is-streak'));
    const worldNodes = nodesOfWorld(node.world);
    if (record.firstCompletion && worldNodes[worldNodes.length - 1].id === node.id) {
      const world = WORLDS.find((w) => w.id === node.world);
      banners.appendChild(banner(`World cleared: ${world.name}!`, 'is-world'));
    }
    if (record.firstCompletion && upcoming) banners.appendChild(banner(`Unlocked: ${upcoming.title}`, 'is-unlock'));
  }
  banners.hidden = !banners.children.length;

  // What was practised
  const learned = $('results-learned');
  learned.textContent = '';
  node.teaches.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    learned.appendChild(li);
  });
  $('results-learned-box').hidden = !completed;

  // Stats
  $('stat-xp-label').textContent = completed ? 'XP earned' : 'XP';
  ['stat-xp', 'stat-hearts', 'stat-streak', 'stat-total'].forEach((id) => { $(id).textContent = '0'; });
  $('stat-hearts-box').hidden = node.kind === 'lesson';

  // Buttons
  const continueButton = $('btn-continue');
  continueButton.textContent = completed ? (upcoming ? 'Continue' : 'Back to the map') : 'Back to the map';
  $('btn-replay').textContent = completed ? 'Play again' : 'Try again';

  await showScreen('results', { force: true });

  countTo($('stat-xp'), completed ? outcome.xp : 0, { duration: 0.9 });
  countTo($('stat-hearts'), outcome.hearts, { duration: 0.6 });
  countTo($('stat-streak'), record.streakCount, { duration: 0.6 });
  countTo($('stat-total'), getXp(), { duration: 1 });
  if (completed) {
    starsReveal([...starsBox.querySelectorAll('.star')], outcome.stars);
    [...banners.children].forEach((item, i) => popIn(item, 0.5 + i * 0.25));
    sounds.win();
    confetti(node.kind === 'boss' ? 2 : 1);
    if (record.firstCompletion && upcoming) setTimeout(() => sounds.unlock(), 900);
  } else {
    sounds.gameOver();
  }
}

export function initResults({ onReplay }) {
  $('btn-continue').addEventListener('click', () => {
    sounds.click();
    showScreen('map');
  });
  $('btn-replay').addEventListener('click', () => {
    sounds.click();
    if (lastNodeId) onReplay(lastNodeId);
  });
}
