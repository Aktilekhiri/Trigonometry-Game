/**
 * storage.js
 * Saves adventure progress in localStorage: completed missions, stars, XP, day streak, settings.
 * Works even when storage is blocked (private mode): progress then lives in memory only.
 */

const STORAGE_KEY = 'trigAdventure.v2';
const MAX_STARS = 3;

const createDefaults = () => ({
  xp: 0,
  streak: { count: 0, lastDay: null },
  nodes: {}, // { "bay-3": { stars: 2 } }  (presence = completed)
  settings: { sound: true, effects: true },
});

const clampInteger = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(earlierKey, laterKey) {
  const toUtc = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(laterKey) - toUtc(earlierKey)) / 86400000);
}

const isDayKey = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Defensive parsing: never trust stored data. */
function sanitize(raw) {
  const data = createDefaults();
  if (!raw || typeof raw !== 'object') return data;

  data.xp = clampInteger(raw.xp, 0, 1e7, 0);

  if (raw.streak && typeof raw.streak === 'object' && isDayKey(raw.streak.lastDay)) {
    data.streak = { count: clampInteger(raw.streak.count, 0, 100000, 0), lastDay: raw.streak.lastDay };
  }

  if (raw.nodes && typeof raw.nodes === 'object') {
    Object.entries(raw.nodes).forEach(([id, entry]) => {
      if (/^[a-z]+-\d+$/.test(id) && entry && typeof entry === 'object') {
        data.nodes[id] = { stars: clampInteger(entry.stars, 0, MAX_STARS, 0) };
      }
    });
  }

  if (raw.settings && typeof raw.settings === 'object') {
    data.settings.sound = raw.settings.sound !== false;
    data.settings.effects = raw.settings.effects !== false;
  }
  return data;
}

function readFromStorage() {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : createDefaults();
  } catch {
    return createDefaults();
  }
}

let progress = readFromStorage();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export const getProgress = () => progress;
export const getXp = () => progress.xp;
export const isNodeDone = (id) => Boolean(progress.nodes[id]);
export const getNodeStars = (id) => (progress.nodes[id] ? progress.nodes[id].stars : 0);
export const getTotalStars = () => Object.values(progress.nodes).reduce((sum, node) => sum + node.stars, 0);
export const getSetting = (name) => progress.settings[name];

export function setSetting(name, value) {
  progress.settings[name] = Boolean(value);
  persist();
}

/** Streak shown to the player: it breaks if no mission was completed yesterday or today. */
export function getStreakCount(now = new Date()) {
  const { count, lastDay } = progress.streak;
  if (!lastDay) return 0;
  return daysBetween(lastDay, dayKey(now)) <= 1 ? count : 0;
}

/**
 * Stores a completed mission.
 * Stars never go down (the best result is kept); XP is awarded every time.
 */
export function completeNode(id, { stars = 0, xp = 0 }, now = new Date()) {
  const firstCompletion = !progress.nodes[id];
  const previousStars = progress.nodes[id] ? progress.nodes[id].stars : 0;
  progress.nodes[id] = { stars: Math.max(previousStars, clampInteger(stars, 0, MAX_STARS, 0)) };

  progress.xp += clampInteger(xp, 0, 10000, 0);

  const today = dayKey(now);
  const { lastDay } = progress.streak;
  let streakExtended = false;
  if (lastDay !== today) {
    const gap = lastDay ? daysBetween(lastDay, today) : Infinity;
    progress.streak = { count: gap === 1 ? progress.streak.count + 1 : 1, lastDay: today };
    streakExtended = true;
  }

  persist();
  return { firstCompletion, streakExtended, streakCount: progress.streak.count };
}

export function resetProgress() {
  const settings = { ...progress.settings };
  progress = createDefaults();
  progress.settings = settings;
  persist();
}
