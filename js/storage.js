/**
 * storage.js
 * Saves unlocked levels, best scores and settings in localStorage.
 * Works even when storage is blocked (private mode): progress then lives in memory only.
 */

const STORAGE_KEY = 'trigAdventure.v1';
export const TOTAL_LEVELS = 3;

const createDefaults = () => ({
  unlockedLevel: 1,
  best: {}, // { "1": { score, stars, accuracy } }
  settings: { sound: true, effects: true },
});

const clampInteger = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

/** Defensive parsing: never trust stored data. */
function sanitize(raw) {
  const data = createDefaults();
  if (!raw || typeof raw !== 'object') return data;

  data.unlockedLevel = clampInteger(raw.unlockedLevel, 1, TOTAL_LEVELS, 1);

  if (raw.best && typeof raw.best === 'object') {
    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      const entry = raw.best[level];
      if (entry && typeof entry === 'object') {
        data.best[level] = {
          score: clampInteger(entry.score, 0, 100, 0),
          stars: clampInteger(entry.stars, 0, 3, 0),
          accuracy: clampInteger(entry.accuracy, 0, 100, 0),
        };
      }
    }
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
export const isLevelUnlocked = (level) => level <= progress.unlockedLevel;
export const getBest = (level) => progress.best[level] || null;
export const getSetting = (name) => progress.settings[name];

export function setSetting(name, value) {
  progress.settings[name] = Boolean(value);
  persist();
}

/**
 * Stores a finished level.
 * @returns {{isNewBest: boolean, unlockedNext: boolean}}
 */
export function recordResult(level, { score, stars, accuracy, passed }) {
  const previous = progress.best[level];
  const isNewBest = !previous || score > previous.score;

  if (isNewBest) {
    progress.best[level] = { score, stars, accuracy };
  } else if (stars > previous.stars) {
    previous.stars = stars; // keep the best star rating even when the score is lower
  }

  let unlockedNext = false;
  if (passed && level < TOTAL_LEVELS && progress.unlockedLevel < level + 1) {
    progress.unlockedLevel = level + 1;
    unlockedNext = true;
  }
  persist();
  return { isNewBest, unlockedNext };
}

export function resetProgress() {
  const settings = { ...progress.settings };
  progress = createDefaults();
  progress.settings = settings;
  persist();
}
