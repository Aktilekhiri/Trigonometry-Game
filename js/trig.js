/**
 * trig.js
 * Exact trigonometric values and small math helpers.
 * The quiz never rounds: every answer is an exact string such as "√3/2".
 */

export const MINUS = '−'; // typographic minus sign used in answers
export const UNDEFINED = 'Undefined';
export const SPECIAL_ANGLES = [0, 30, 45, 60, 90];
export const ROMAN = ['', 'I', 'II', 'III', 'IV'];

/** Exact values for the first quadrant (0°–90°). */
const FIRST_QUADRANT = {
  sin: { 0: '0', 30: '1/2', 45: '√2/2', 60: '√3/2', 90: '1' },
  cos: { 0: '1', 30: '√3/2', 45: '√2/2', 60: '1/2', 90: '0' },
  tan: { 0: '0', 30: '√3/3', 45: '1', 60: '√3', 90: UNDEFINED },
};

/** Exact values on the axes of the unit circle. */
const AXIS_VALUES = {
  sin: { 0: '0', 90: '1', 180: '0', 270: MINUS + '1' },
  cos: { 0: '1', 90: '0', 180: MINUS + '1', 270: '0' },
  tan: { 0: '0', 90: UNDEFINED, 180: '0', 270: UNDEFINED },
};

/** Decimal values used ONLY for validating the exact strings. */
const NUMERIC_VALUES = {
  '0': 0,
  '1': 1,
  '1/2': 0.5,
  '√2/2': Math.SQRT2 / 2,
  '√3/2': Math.sqrt(3) / 2,
  '√3/3': Math.sqrt(3) / 3,
  '√3': Math.sqrt(3),
};

export const toRadians = (degrees) => (degrees * Math.PI) / 180;
export const approx = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;

export function normalizeAngle(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/** Returns 1–4 for a quadrant, or 0 when the angle lies on an axis. */
export function quadrantOf(degrees) {
  const d = normalizeAngle(degrees);
  if (d % 90 === 0) return 0;
  return Math.floor(d / 90) + 1;
}

/** Acute angle between the terminal side and the x-axis (null on axes). */
export function referenceAngle(degrees) {
  const d = normalizeAngle(degrees);
  const quadrant = quadrantOf(d);
  if (quadrant === 0) return null;
  if (quadrant === 1) return d;
  if (quadrant === 2) return 180 - d;
  if (quadrant === 3) return d - 180;
  return 360 - d;
}

/** Whether a trig function is positive in a given quadrant (1–4). */
export function isPositiveIn(fn, quadrant) {
  if (fn === 'sin') return quadrant === 1 || quadrant === 2;
  if (fn === 'cos') return quadrant === 1 || quadrant === 4;
  return quadrant === 1 || quadrant === 3; // tan
}

/**
 * Exact value of sin/cos/tan for angles that are multiples of 30° or 45°.
 * Throws for unsupported angles so a typo can never produce a wrong answer.
 */
export function exactValue(fn, degrees) {
  const d = normalizeAngle(degrees);
  if (d % 90 === 0) return AXIS_VALUES[fn][d];
  const quadrant = quadrantOf(d);
  const reference = referenceAngle(d);
  const base = FIRST_QUADRANT[fn][reference];
  if (base === undefined || reference === 0 || reference === 90) {
    throw new Error(`Unsupported angle for exact value: ${degrees}°`);
  }
  return isPositiveIn(fn, quadrant) ? base : MINUS + base;
}

/** Converts an exact string like "−√3/2" to a decimal (NaN for "Undefined"). */
export function exactToNumber(text) {
  if (text === UNDEFINED) return NaN;
  const negative = text.startsWith(MINUS);
  const body = negative ? text.slice(1) : text;
  const value = NUMERIC_VALUES[body];
  if (value === undefined) throw new Error(`Unknown exact value: ${text}`);
  return negative ? -value : value;
}

/** Real trig value computed with Math.* (NaN where the function is undefined). */
export function trueValue(fn, degrees) {
  const radians = toRadians(degrees);
  if (fn === 'sin') return Math.sin(radians);
  if (fn === 'cos') return Math.cos(radians);
  if (Math.abs(Math.cos(radians)) < 1e-12) return NaN;
  return Math.tan(radians);
}

export function sameValue(a, b) {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return approx(a, b);
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/** 150 -> "5π/6", 90 -> "π/2", 360 -> "2π", 0 -> "0". */
export function degreesToPiText(degrees) {
  const d = Math.round(degrees);
  if (d === 0) return '0';
  const divisor = gcd(d, 180);
  const numerator = d / divisor;
  const denominator = 180 / divisor;
  const numeratorText = numerator === 1 ? 'π' : `${numerator}π`;
  return denominator === 1 ? numeratorText : `${numeratorText}/${denominator}`;
}

/** Exact value string for the UI when the angle is special, otherwise null. */
export function exactOrNull(fn, degrees) {
  try {
    return exactValue(fn, degrees);
  } catch {
    return null;
  }
}
