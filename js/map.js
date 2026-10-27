/**
 * map.js
 * The adventure path: worlds with winding mission buttons (lesson -> game -> game -> finale).
 * Missions unlock one after another. Tapping a mission opens a small card with a Start button.
 */

import { KIND_LABEL, NODES, NODE_BY_ID, WORLDS, nodeStatus, nodesOfWorld } from './content.js';
import { getNodeStars, getStreakCount, getTotalStars, getXp, isNodeDone, resetProgress } from './storage.js';
import { closeDialog, openDialog, registerScreen, toast } from './ui.js';
import { sounds } from './audio.js';
import { canAnimate } from './motion.js';

const $ = (id) => document.getElementById(id);
const ICONS = { lesson: 'icon-book', cannon: 'icon-target', bay: 'icon-lighthouse', boss: 'icon-skull' };
const MAX_STARS = NODES.length * 3;

let startHandler = () => {};
let changeHandler = () => {};
let selectedId = null;

function starsMarkup(count) {
  return [0, 1, 2]
    .map((i) => `<svg class="mini-star${i < count ? ' is-on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-star" /></svg>`)
    .join('');
}

function renderStats() {
  $('map-streak').textContent = String(getStreakCount());
  $('map-xp').textContent = String(getXp());
  $('map-stars').textContent = `${getTotalStars()}/${MAX_STARS}`;
}

function renderPath() {
  const path = $('path');
  path.textContent = '';

  WORLDS.forEach((world, worldIndex) => {
    const nodes = nodesOfWorld(world.id);
    const doneCount = nodes.filter((node) => isNodeDone(node.id)).length;

    const section = document.createElement('section');
    section.className = `world world-${world.color}`;
    section.setAttribute('aria-labelledby', `world-${world.id}`);

    const banner = document.createElement('div');
    banner.className = 'world-banner glass';
    banner.innerHTML = `
      <div>
        <p class="eyebrow">World ${worldIndex + 1}</p>
        <h3 id="world-${world.id}"></h3>
        <p class="world-blurb"></p>
      </div>
      <p class="world-progress" aria-label="${doneCount} of ${nodes.length} missions complete"><strong>${doneCount}</strong>/${nodes.length}</p>`;
    banner.querySelector('h3').textContent = world.name;
    banner.querySelector('.world-blurb').textContent = world.blurb;
    section.appendChild(banner);

    const list = document.createElement('ol');
    list.className = 'world-nodes';
    nodes.forEach((node, i) => {
      const status = nodeStatus(node.id, isNodeDone);
      const stars = getNodeStars(node.id);
      const item = document.createElement('li');
      item.style.setProperty('--shift', `${Math.round(Math.sin((i + worldIndex) * 1.25) * 64)}px`);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `node node-${status} node-${node.kind}`;
      button.dataset.id = node.id;
      button.setAttribute(
        'aria-label',
        `${KIND_LABEL[node.kind]}: ${node.title}. ${status === 'locked' ? 'Locked.' : status === 'done' ? `Completed, ${stars} of 3 stars.` : 'Ready to play.'}`,
      );
      button.setAttribute('aria-disabled', String(status === 'locked'));
      button.innerHTML = `
        <span class="node-disc" aria-hidden="true">
          <svg viewBox="0 0 24 24"><use href="#${status === 'locked' ? 'icon-lock' : ICONS[node.kind]}" /></svg>
        </span>
        <span class="node-title"></span>
        <span class="node-stars" aria-hidden="true">${status === 'done' ? starsMarkup(stars) : ''}</span>
        ${status === 'current' ? '<span class="node-start" aria-hidden="true">START</span>' : ''}`;
      button.querySelector('.node-title').textContent = node.title;
      button.addEventListener('click', () => openNode(node.id));
      item.appendChild(button);
      list.appendChild(item);
    });
    section.appendChild(list);
    path.appendChild(section);
  });
}

function openNode(id) {
  const node = NODE_BY_ID[id];
  const status = nodeStatus(id, isNodeDone);
  sounds.click();
  if (status === 'locked') {
    toast('Finish the mission before this one to unlock it.', { type: 'warning' });
    return;
  }
  selectedId = id;
  $('node-kind').textContent = `${KIND_LABEL[node.kind]} · +${node.xp} XP`;
  $('node-title').textContent = node.title;
  $('node-blurb').textContent = node.blurb;
  const teaches = $('node-teaches');
  teaches.textContent = '';
  node.teaches.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    teaches.appendChild(li);
  });
  $('node-stars').innerHTML = status === 'done' ? starsMarkup(getNodeStars(id)) : '';
  $('node-start').textContent = status === 'done' ? 'Play again' : node.kind === 'lesson' ? 'Start lesson' : 'Start mission';
  openDialog('dialog-node');
}

export function renderMap() {
  renderStats();
  renderPath();
}

export function initMap({ onStart, onProgressChange }) {
  startHandler = onStart;
  changeHandler = onProgressChange;

  registerScreen('map', {
    beforeShow: renderMap,
    afterShow: () => {
      const current = document.querySelector('.node-current');
      if (current) current.scrollIntoView({ block: 'center', behavior: canAnimate() ? 'smooth' : 'auto' });
    },
  });

  $('node-start').addEventListener('click', () => {
    closeDialog('dialog-node');
    if (selectedId) startHandler(selectedId);
  });

  $('btn-reset').addEventListener('click', () => {
    sounds.click();
    openDialog('dialog-reset');
  });
  $('reset-cancel').addEventListener('click', () => closeDialog('dialog-reset'));
  $('reset-confirm').addEventListener('click', () => {
    resetProgress();
    closeDialog('dialog-reset');
    renderMap();
    changeHandler();
    toast('Progress reset. Your adventure starts again!');
  });
}
