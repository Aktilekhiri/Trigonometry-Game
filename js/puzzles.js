/**
 * puzzles.js
 * All the game maths and rules in one DOM-free module, so Node can test it:
 *   - Crystal Cannon   : angle + power, the bolt's legs are  power·cos θ  (across) and  power·sin θ  (up)
 *   - Lighthouse Bay   : right-triangle problems with sin / cos / tan (sides and angles)
 *   - Boss battles     : cast a spell (sin, cos or tan of an angle) that equals the boss's shield value
 * Every round is generated from exact special-angle values and then double-checked by the tests.
 */

import { exactValue, exactToNumber, toRadians, UNDEFINED } from './trig.js';

/* ------------------------------------------------------------------ helpers */

const pick = (list, rng) => list[Math.floor(rng() * list.length)];
const r1 = (n) => Math.round(n * 10) / 10;
export const fmt1 = (n) => r1(n).toFixed(1);
export const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

export function shuffle(list, rng = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Hearts left -> stars (finishing with at least one heart always gives at least one star). */
export const starsFromHearts = (hearts) => Math.min(3, Math.max(1, hearts));

export const STARTING_HEARTS = 3;

/* ------------------------------------------------------------ side ratios */

export const SIDE_NAMES = { opp: 'opposite', adj: 'adjacent', hyp: 'hypotenuse' };
export const SIDE_STORY = {
  opp: 'height of the lighthouse',
  adj: 'distance from the ship to the lighthouse',
  hyp: 'length of the line of sight',
};
/** sin = opp/hyp, cos = adj/hyp, tan = opp/adj */
export const RATIOS = {
  sin: { top: 'opp', bottom: 'hyp', word: 'SOH' },
  cos: { top: 'adj', bottom: 'hyp', word: 'CAH' },
  tan: { top: 'opp', bottom: 'adj', word: 'TOA' },
};

/** Which ratio links two different sides of a right triangle. */
export function ratioFor(sideA, sideB) {
  const key = [sideA, sideB].sort().join('+');
  if (key === 'hyp+opp') return 'sin';
  if (key === 'adj+hyp') return 'cos';
  if (key === 'adj+opp') return 'tan';
  throw new Error(`No ratio for ${sideA} and ${sideB}`);
}

/* =================================================================== CANNON */

export const CANNON_LIMITS = { minAngle: 0, maxAngle: 90, minPower: 2, maxPower: 16, aimTolerance: 2, bothTolerance: 0.8 };

export function tipOf(power, angle) {
  const radians = toRadians(angle);
  return { x: power * Math.cos(radians), y: power * Math.sin(radians) };
}

/**
 * spec: { kind: 'aim' | 'power' | 'both', by: 'x' | 'y' (optional), reveal: boolean, angles: [..] }
 *   aim   - power is fixed, the player turns the cannon
 *   power - angle is fixed, the player sets the power
 *   both  - the player sets angle and power
 * reveal=false hides the crystal: only numbers describe where it is.
 */
export function makeCannonRound(spec = {}, rng = Math.random) {
  const kind = spec.kind ?? 'aim';
  const angle = pick(spec.angles ?? [30, 45, 60], rng);
  const power = kind === 'aim' ? pick([10, 12, 14, 16], rng) : pick([6, 8, 10, 12, 14, 16], rng);
  const by = kind === 'both' ? null : spec.by === 'x' || spec.by === 'y' ? spec.by : pick(['x', 'y'], rng);
  const fixed = kind === 'aim' ? { power } : kind === 'power' ? { angle } : {};

  return {
    type: 'cannon',
    kind,
    by,
    reveal: spec.reveal ?? true,
    fixed,
    answer: { angle, power },
    target: tipOf(power, angle),
  };
}

export function describeCannonRound(round) {
  const { kind, by, answer, target, fixed } = round;
  const clue = by === 'y' ? `Crystal height: ${fmt1(target.y)}` : by === 'x' ? `Crystal distance: ${fmt1(target.x)}` : `Crystal at across ${fmt1(target.x)}, up ${fmt1(target.y)}`;

  if (kind === 'aim') {
    const ratio = by === 'y' ? target.y / fixed.power : target.x / fixed.power;
    const fn = by === 'y' ? 'sin' : 'cos';
    const part = by === 'y' ? 'up' : 'across';
    return {
      title: 'Find the angle',
      prompt: `The power is locked at ${fixed.power}. Turn the cannon so the bolt reaches the crystal.`,
      clue,
      hint: `${part} = power × ${fn} θ, so ${fn} θ = ${by === 'y' ? fmt1(target.y) : fmt1(target.x)} ÷ ${fixed.power} ≈ ${fmt2(ratio)}. Which angle has that ${fn === 'sin' ? 'sine' : 'cosine'}? Open the cheat sheet!`,
    };
  }
  if (kind === 'power') {
    const fn = by === 'y' ? 'sin' : 'cos';
    const part = by === 'y' ? 'up' : 'across';
    return {
      title: 'Find the power',
      prompt: `The angle is locked at ${fixed.angle}°. Choose the power that reaches the crystal.`,
      clue,
      hint: `${part} = power × ${fn} ${fixed.angle}°. Here ${fn} ${fixed.angle}° ≈ ${fmt2(Math[fn](toRadians(fixed.angle)))}, so power = ${part} ÷ ${fmt2(Math[fn](toRadians(fixed.angle)))}.`,
    };
  }
  return {
    title: 'Angle and power',
    prompt: 'You control both. Reach the crystal with one perfect shot.',
    clue,
    hint: `Try a special angle (30°, 45° or 60°). Then power = across ÷ cos θ, and the bolt's height should be power × sin θ = ${fmt1(target.y)}.`,
  };
}

/** Result of firing a shot { angle, power } at a round. */
export function checkCannonShot(round, shot) {
  const power = round.kind === 'aim' ? round.fixed.power : shot.power;
  const angle = round.kind === 'power' ? round.fixed.angle : shot.angle;
  const tip = tipOf(power, angle);
  const { target } = round;
  let hit;
  if (round.kind === 'aim') hit = Math.abs(angle - round.answer.angle) <= CANNON_LIMITS.aimTolerance;
  else if (round.kind === 'power') hit = power === round.answer.power;
  else hit = Math.hypot(tip.x - target.x, tip.y - target.y) <= CANNON_LIMITS.bothTolerance;

  return { hit, tip, angle, power, message: hit ? cannonSolution(round) : cannonMissMessage(round, tip) };
}

function cannonMissMessage(round, tip) {
  const { target, by, kind } = round;
  const high = tip.y > target.y + 0.05;
  const low = tip.y < target.y - 0.05;
  const far = tip.x > target.x + 0.05;
  const near = tip.x < target.x - 0.05;

  if (kind === 'aim') {
    if (by === 'y') return high ? `Too high: the bolt reached height ${fmt1(tip.y)} but the crystal is at ${fmt1(target.y)}. A smaller angle gives a smaller sine.` : `Too low: the bolt reached height ${fmt1(tip.y)} but the crystal is at ${fmt1(target.y)}. A bigger angle lifts the shot.`;
    return far ? `Too far: the bolt went ${fmt1(tip.x)} across but the crystal is at ${fmt1(target.x)}. Turn the cannon higher: the cosine gets smaller.` : `Too short: the bolt went ${fmt1(tip.x)} across but the crystal is at ${fmt1(target.x)}. Lower the angle to make the cosine bigger.`;
  }
  if (kind === 'power') {
    const weak = by === 'y' ? low : near;
    return weak ? `Too weak: the bolt fell short of the crystal. Add some power.` : `Too strong: the bolt flew past the crystal. Use less power.`;
  }
  const parts = [];
  if (high) parts.push('too high');
  if (low) parts.push('too low');
  if (far) parts.push('too far');
  if (near) parts.push('too short');
  return `Missed: the bolt was ${parts.join(' and ') || 'slightly off'}. Check the across and up numbers against the crystal.`;
}

export function cannonSolution(round) {
  const { kind, by, answer, target, fixed } = round;
  const a = answer.angle;
  if (kind === 'aim') {
    const fn = by === 'y' ? 'sin' : 'cos';
    const value = by === 'y' ? target.y : target.x;
    return `Bullseye! ${fn} θ = ${fmt1(value)} ÷ ${fixed.power} ≈ ${fmt2(value / fixed.power)}, and ${fn} ${a}° = ${exactValue(fn, a)}. So θ = ${a}°.`;
  }
  if (kind === 'power') {
    const fn = by === 'y' ? 'sin' : 'cos';
    const value = by === 'y' ? target.y : target.x;
    return `Bullseye! power = ${by === 'y' ? 'up' : 'across'} ÷ ${fn} ${a}° = ${fmt1(value)} ÷ ${exactValue(fn, a)} = ${answer.power}.`;
  }
  return `Bullseye! With θ = ${a}° and power ${answer.power}: across = ${answer.power} × cos ${a}° = ${fmt1(target.x)}, up = ${answer.power} × sin ${a}° = ${fmt1(target.y)}.`;
}

/* ===================================================================== BAY */

/** Side lengths of the special triangles, in the same unit. */
export const SPECIAL_TRIANGLES = {
  30: { opp: 1, adj: Math.sqrt(3), hyp: 2 },
  45: { opp: 1, adj: 1, hyp: Math.SQRT2 },
  60: { opp: Math.sqrt(3), adj: 1, hyp: 2 },
};

export const BAY_LIMITS = { maxAdj: 52, maxOpp: 36, minSide: 4, tolerance: 0.5 };

const UNKNOWN_BY_KIND = { d: 'adj', h: 'opp', l: 'hyp', a: 'angle' };
const KNOWN_OPTIONS = { adj: ['opp', 'hyp'], opp: ['adj', 'hyp'], hyp: ['opp', 'adj'] };
const ANGLE_CASES = [
  { known: ['opp', 'hyp'], theta: 30 },
  { known: ['adj', 'hyp'], theta: 60 },
  { known: ['opp', 'adj'], theta: 45 },
];
const SLIDERS = {
  adj: { min: 2, max: 55, step: 1 },
  opp: { min: 2, max: 40, step: 1 },
  hyp: { min: 2, max: 60, step: 1 },
  angle: { min: 5, max: 85, step: 1 },
};

function scaledSides(theta, side, value) {
  const base = SPECIAL_TRIANGLES[theta];
  const scale = value / base[side];
  return { opp: base.opp * scale, adj: base.adj * scale, hyp: base.hyp * scale };
}

function fitsBoard(sides) {
  return (
    sides.adj <= BAY_LIMITS.maxAdj &&
    sides.opp <= BAY_LIMITS.maxOpp &&
    Math.min(sides.opp, sides.adj) >= BAY_LIMITS.minSide
  );
}

/** Whole-number known side that makes the unknown side (almost) a whole number, so a slider can hit it. */
function sideCandidates(unknown, known, angles) {
  const found = [];
  angles.forEach((theta) => {
    for (let value = 6; value <= 40; value += 1) {
      const sides = scaledSides(theta, known, value);
      const missing = sides[unknown];
      if (!fitsBoard(sides)) continue;
      if (missing < 4 || missing > SLIDERS[unknown].max - 3) continue;
      if (Math.abs(missing - Math.round(missing)) > 0.3) continue;
      found.push({ theta, value });
    }
  });
  return found;
}

/**
 * spec: { kind: 'd' | 'h' | 'l' | 'a' | 'any', known?: 'opp' | 'adj' | 'hyp', angles?: [30,45,60] }
 *   d: find the distance (adjacent)   h: find the height (opposite)
 *   l: find the line of sight (hypotenuse)   a: find the angle
 */
export function makeBayRound(spec = {}, rng = Math.random) {
  const kind = spec.kind && spec.kind !== 'any' ? spec.kind : pick(['d', 'h', 'l'], rng);
  const unknown = UNKNOWN_BY_KIND[kind];

  if (kind === 'a') {
    const chosen = pick(ANGLE_CASES, rng);
    const first = chosen.known[0];
    const second = chosen.known[1];
    const ratio = ratioFor(first, second);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = 6 + Math.floor(rng() * 15);
      const sides = scaledSides(chosen.theta, first, value);
      if (!fitsBoard(sides)) continue;
      return {
        type: 'bay',
        kind,
        unknown,
        knowns: [first, second].map((side) => ({ side, value: Math.round(sides[side]) })),
        theta: null,
        truth: { ...sides, theta: chosen.theta },
        ratio,
        answer: chosen.theta,
        tolerance: 0,
        slider: SLIDERS.angle,
      };
    }
    throw new Error('Could not build an angle round');
  }

  const knownChoices = spec.known ? [spec.known] : KNOWN_OPTIONS[unknown];
  const known = pick(knownChoices, rng);
  const candidates = sideCandidates(unknown, known, spec.angles ?? [30, 45, 60]);
  if (!candidates.length) throw new Error(`No candidates for ${kind}/${known}`);
  const { theta, value } = pick(candidates, rng);
  const sides = scaledSides(theta, known, value);

  return {
    type: 'bay',
    kind,
    unknown,
    knowns: [{ side: known, value }],
    theta,
    truth: { ...sides, theta },
    ratio: ratioFor(known, unknown),
    answer: sides[unknown],
    tolerance: BAY_LIMITS.tolerance,
    slider: SLIDERS[unknown],
  };
}

/** Where the slider starts: never already on the answer. */
export function bayStartValue(round) {
  const { min, max } = round.slider;
  const middle = Math.round((min + max) / 2);
  return Math.abs(middle - round.answer) <= round.tolerance + 0.5 ? min + 4 : middle;
}

/** What the board draws for a given slider value. */
export function bayLayout(round, value) {
  const t = round.truth;
  if (round.kind === 'd') return { H: t.opp, d: value, angle: t.theta, rope: null };
  if (round.kind === 'h') return { H: value, d: t.adj, angle: t.theta, rope: null };
  if (round.kind === 'l') return { H: t.opp, d: t.adj, angle: t.theta, rope: value };
  return { H: t.opp, d: t.adj, angle: value, rope: null };
}

/** Height at which a ray leaving the ship at `angle` meets the lighthouse. */
export const rayHeight = (d, angle) => d * Math.tan(toRadians(angle));

export function checkBayAnswer(round, value) {
  return Math.abs(value - round.answer) <= round.tolerance;
}

export function checkBayRatio(round, choice) {
  return choice === round.ratio;
}

export function describeBayRound(round) {
  const unknownName = round.unknown === 'angle' ? 'angle θ' : SIDE_STORY[round.unknown];
  let story;
  if (round.kind === 'a') {
    const [a, b] = round.knowns;
    story = `The ${SIDE_STORY[a.side]} is ${a.value} m and the ${SIDE_STORY[b.side]} is ${b.value} m. Find the angle θ at the ship.`;
  } else {
    const known = round.knowns[0];
    story = `From the ship the lamp is seen at an angle of ${round.theta}° above the sea. The ${SIDE_STORY[known.side]} is ${known.value} m. Find the ${unknownName}.`;
  }

  const sideList = round.kind === 'a' ? round.knowns.map((k) => SIDE_NAMES[k.side]) : [SIDE_NAMES[round.knowns[0].side], SIDE_NAMES[round.unknown]];
  const ratioQuestion =
    round.kind === 'a'
      ? `You know the ${sideList[0]} and the ${sideList[1]}. Which ratio uses exactly those two sides?`
      : `You know the ${sideList[0]} and want the ${sideList[1]}. Which ratio uses exactly those two sides (and the angle)?`;

  return { story, ratioQuestion, unknownName, hint: bayHint(round), solution: baySolution(round) };
}

export function ratioDefinition(ratio) {
  const { top, bottom } = RATIOS[ratio];
  return `${ratio} θ = ${SIDE_NAMES[top]} ÷ ${SIDE_NAMES[bottom]}`;
}

export function ratioMistake(round, choice) {
  const chosen = RATIOS[choice];
  const needed = RATIOS[round.ratio];
  return `${ratioDefinition(choice)}. That uses the ${SIDE_NAMES[chosen.top]} and the ${SIDE_NAMES[chosen.bottom]}, but you need the ${SIDE_NAMES[needed.top]} and the ${SIDE_NAMES[needed.bottom]}.`;
}

function bayHint(round) {
  const { top, bottom } = RATIOS[round.ratio];
  if (round.kind === 'a') {
    return `${ratioDefinition(round.ratio)}. Divide the two sides, then find the angle whose ${round.ratio} gives that number (cheat sheet!).`;
  }
  const exact = exactValue(round.ratio, round.theta);
  const knownSide = round.knowns[0].side;
  const how = round.unknown === top ? `${SIDE_NAMES[round.unknown]} = ${SIDE_NAMES[knownSide]} × ${round.ratio} ${round.theta}°` : `${SIDE_NAMES[round.unknown]} = ${SIDE_NAMES[knownSide]} ÷ ${round.ratio} ${round.theta}°`;
  return `${ratioDefinition(round.ratio)}. Rearranged: ${how}, and ${round.ratio} ${round.theta}° = ${exact} ≈ ${fmt2(exactToNumber(exact))}.`;
}

function baySolution(round) {
  const { top } = RATIOS[round.ratio];
  if (round.kind === 'a') {
    const [a, b] = round.knowns;
    const topKnown = a.side === top ? a : b;
    const bottomKnown = a.side === top ? b : a;
    const quotient = topKnown.value / bottomKnown.value;
    return `${round.ratio} θ = ${topKnown.value} ÷ ${bottomKnown.value} = ${fmt2(quotient)}, and ${round.ratio} ${round.answer}° = ${exactValue(round.ratio, round.answer)}. So θ = ${round.answer}°.`;
  }
  const known = round.knowns[0];
  const exact = exactValue(round.ratio, round.theta);
  const times = round.unknown === top;
  return `${SIDE_NAMES[round.unknown]} = ${known.value} ${times ? '×' : '÷'} ${round.ratio} ${round.theta}° = ${known.value} ${times ? '×' : '÷'} ${exact} ≈ ${fmt1(round.answer)} m.`;
}

/** Text shown on the board for the sliding side. */
export function bayUnitLabel(round, value) {
  return round.unknown === 'angle' ? `${Math.round(value)}°` : `${Math.round(value)} m`;
}

/* ==================================================================== BOSS */

const sortedUnique = (list) => [...new Set(list)].sort((a, b) => a - b);

export const ALL_SPECIAL_ANGLES = sortedUnique([
  ...Array.from({ length: 12 }, (_, i) => i * 30),
  ...Array.from({ length: 8 }, (_, i) => i * 45),
]);

export const BOSS_TIERS = {
  1: { name: 'Gobbo the Goblin', fns: ['sin', 'cos'], angles: [0, 30, 45, 60, 90], hp: 4, preview: 'exact' },
  2: { name: 'Wisp the Wraith', fns: ['sin', 'cos', 'tan'], angles: [0, 30, 45, 60, 90], hp: 5, preview: 'decimal' },
  3: { name: 'Zeroth the Dragon', fns: ['sin', 'cos', 'tan'], angles: ALL_SPECIAL_ANGLES, hp: 6, preview: 'none' },
};

export const spellValue = (fn, angle) => exactValue(fn, angle);

export function buildBossRounds(tier, rng = Math.random) {
  const config = BOSS_TIERS[tier];
  const pool = [];
  config.fns.forEach((fn) => config.angles.forEach((angle) => pool.push({ fn, angle })));

  const rounds = [];
  let guard = 0;
  while (rounds.length < config.hp && guard < 500) {
    guard += 1;
    const candidate = pick(pool, rng);
    const shield = spellValue(candidate.fn, candidate.angle);
    if (rounds.some((round) => round.shield === shield)) continue;
    const needTan = tier >= 2 && rounds.length === config.hp - 1 && !rounds.some((round) => round.fn === 'tan');
    if (needTan && candidate.fn !== 'tan') continue;
    const needNegative = tier === 3 && rounds.length === config.hp - 1 && !rounds.some((round) => round.shield.startsWith('−'));
    if (needNegative && !shield.startsWith('−')) continue;
    rounds.push({ type: 'boss', tier, fn: candidate.fn, angle: candidate.angle, shield });
  }
  if (rounds.length < config.hp) throw new Error('Could not build boss rounds');
  return rounds;
}

export function castSpell(round, fn, angle) {
  const value = spellValue(fn, angle);
  return { hit: value === round.shield, value };
}

export function bossSolutions(round) {
  const { fns, angles } = BOSS_TIERS[round.tier];
  const found = [];
  fns.forEach((fn) => angles.forEach((angle) => {
    if (spellValue(fn, angle) === round.shield) found.push({ fn, angle });
  }));
  return found;
}

export function bossDecimal(shield) {
  return shield === UNDEFINED ? 'no number' : fmt2(exactToNumber(shield));
}

export function bossMissMessage(round, fn, angle, value) {
  const shown = value === UNDEFINED ? 'is undefined' : `= ${value}`;
  return `${fn} ${angle}° ${shown}, but the shield is ${round.shield}. Try another spell or angle.`;
}

export function bossHitMessage(round, fn, angle) {
  const others = bossSolutions(round).filter((s) => !(s.fn === fn && s.angle === angle));
  const extra = others.length ? ` Other spells that work: ${others.slice(0, 3).map((s) => `${s.fn} ${s.angle}°`).join(', ')}.` : '';
  return `Critical hit! ${fn} ${angle}° = ${round.shield}.${extra}`;
}
