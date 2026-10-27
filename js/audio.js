/**
 * audio.js
 * Tiny sound engine built on the Web Audio API (no audio files needed).
 * The AudioContext is created lazily after the first user gesture.
 */

let context = null;
let masterGain = null;
let muted = false;

function ensureContext() {
  if (!context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = 0.32;
      masterGain.connect(context.destination);
    } catch {
      context = null;
      return null;
    }
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

/** Plays one soft tone with a quick attack and smooth decay. */
function playTone({ frequency, delay = 0, duration = 0.2, type = 'sine', volume = 0.5, slideTo = null }) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;

  const startTime = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5, A3: 220, E3: 164.81 };

export const sounds = {
  click: () => playTone({ frequency: 520, duration: 0.07, type: 'triangle', volume: 0.25 }),
  correct() {
    playTone({ frequency: NOTE.C5, duration: 0.16, volume: 0.45 });
    playTone({ frequency: NOTE.E5, delay: 0.09, duration: 0.16, volume: 0.45 });
    playTone({ frequency: NOTE.G5, delay: 0.18, duration: 0.3, volume: 0.45 });
  },
  wrong() {
    playTone({ frequency: 220, duration: 0.28, type: 'sawtooth', volume: 0.22, slideTo: 140 });
    playTone({ frequency: 165, delay: 0.12, duration: 0.3, type: 'sawtooth', volume: 0.2, slideTo: 100 });
  },
  timeout() {
    playTone({ frequency: 330, duration: 0.2, type: 'square', volume: 0.15, slideTo: 200 });
    playTone({ frequency: 250, delay: 0.18, duration: 0.3, type: 'square', volume: 0.15, slideTo: 130 });
  },
  tick: () => playTone({ frequency: 880, duration: 0.05, type: 'triangle', volume: 0.18 }),
  unlock() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((frequency, i) =>
      playTone({ frequency, delay: i * 0.1, duration: 0.25, volume: 0.4 }),
    );
  },
  win() {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6].forEach((frequency, i) =>
      playTone({ frequency, delay: i * 0.12, duration: 0.3, volume: 0.4 }),
    );
  },
  gameOver() {
    [NOTE.G5, NOTE.E5, NOTE.C5, NOTE.A3].forEach((frequency, i) =>
      playTone({ frequency, delay: i * 0.18, duration: 0.35, type: 'triangle', volume: 0.35 }),
    );
  },
};

export function setMuted(value) {
  muted = Boolean(value);
}

export const isMuted = () => muted;

/** Call from a click handler so browsers allow audio. */
export function unlockAudio() {
  ensureContext();
}
