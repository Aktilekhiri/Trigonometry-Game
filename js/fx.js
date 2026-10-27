/**
 * fx.js
 * Particle bursts and confetti on one full-screen canvas (no libraries).
 * Skipped completely when visual effects are off or the user prefers reduced motion.
 */

import { effectsEnabled } from './motion.js';

const MAX_PARTICLES = 420;
const CONFETTI_COLORS = ['#22e4ff', '#9b6bff', '#ff4fd8', '#4d7cff', '#34f0a1', '#ffc857', '#ffffff'];

let canvas = null;
let context = null;
let particles = [];
let frameId = 0;
let lastTime = 0;

function resize() {
  if (!canvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

export function initFx() {
  canvas = document.getElementById('fx-canvas');
  if (!canvas) return;
  context = canvas.getContext('2d');
  if (!context) return;
  resize();
  window.addEventListener('resize', resize);
}

const random = (min, max) => min + Math.random() * (max - min);

function addParticle(particle) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(particle);
  if (!frameId) {
    lastTime = performance.now();
    frameId = requestAnimationFrame(loop);
  }
}

function loop(now) {
  // Normalise to 60 fps so the speed is identical on 60, 120 and 144 Hz screens.
  const step = Math.min((now - lastTime) / 16.667, 3);
  lastTime = now;

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles = particles.filter((particle) => {
    particle.life -= step;
    if (particle.life <= 0 || particle.y > window.innerHeight + 40) return false;

    particle.vx *= particle.drag ** step;
    particle.vy = particle.vy * particle.drag ** step + particle.gravity * step;
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    particle.rotation += particle.spin * step;

    const alpha = Math.min(1, particle.life / (particle.maxLife * 0.35));
    context.globalAlpha = Math.max(0, alpha);
    context.fillStyle = particle.color;

    if (particle.shape === 'dot') {
      const radius = Math.max(0.1, particle.size * (0.4 + 0.6 * (particle.life / particle.maxLife)));
      context.beginPath();
      context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      context.fill();
    } else {
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      // Flip the width over time for a "tumbling paper" look.
      const flip = Math.cos(particle.rotation * 2.2);
      context.scale(1, 0.25 + Math.abs(flip) * 0.75);
      context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
      context.restore();
    }
    return true;
  });

  context.globalAlpha = 1;

  if (particles.length > 0) {
    frameId = requestAnimationFrame(loop);
  } else {
    frameId = 0;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

/** Small sparkle burst, used for correct answers. */
export function burst(x, y, { color = '#34f0a1', count = 26 } = {}) {
  if (!context || !effectsEnabled()) return;
  for (let i = 0; i < count; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(2, 7);
    addParticle({
      shape: 'dot',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      gravity: 0.14,
      drag: 0.96,
      size: random(2, 5),
      color: Math.random() < 0.3 ? '#ffffff' : color,
      life: random(34, 62),
      maxLife: 62,
      rotation: 0,
      spin: 0,
    });
  }
}

/** Full-screen celebration. `intensity` 1 = level complete, 2 = grand finale. */
export function confetti(intensity = 1) {
  if (!context || !effectsEnabled()) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pieces = 90 * intensity;

  // Two cannons from the bottom corners.
  for (let i = 0; i < pieces; i += 1) {
    const fromLeft = i % 2 === 0;
    const angle = fromLeft ? random(-1.35, -0.9) : random(-2.25, -1.8);
    const speed = random(11, 20);
    addParticle({
      shape: 'paper',
      x: fromLeft ? width * 0.05 : width * 0.95,
      y: height * 0.95,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.32,
      drag: 0.985,
      size: random(8, 14),
      color: CONFETTI_COLORS[Math.floor(random(0, CONFETTI_COLORS.length))],
      life: random(110, 190),
      maxLife: 190,
      rotation: random(0, Math.PI * 2),
      spin: random(-0.25, 0.25),
    });
  }

  // A shower from the top.
  for (let i = 0; i < pieces * 0.6; i += 1) {
    addParticle({
      shape: 'paper',
      x: random(0, width),
      y: random(-80, -10),
      vx: random(-1.2, 1.2),
      vy: random(1, 4),
      gravity: 0.09,
      drag: 0.99,
      size: random(7, 12),
      color: CONFETTI_COLORS[Math.floor(random(0, CONFETTI_COLORS.length))],
      life: random(150, 260),
      maxLife: 260,
      rotation: random(0, Math.PI * 2),
      spin: random(-0.2, 0.2),
    });
  }
}

export function clearFx() {
  particles = [];
}
