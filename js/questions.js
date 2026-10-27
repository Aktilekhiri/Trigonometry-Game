/**
 * questions.js
 * Question banks for the three levels.
 *
 * Every template carries a verify() function that re-checks the answer with real
 * math (Math.sin, Math.cos ...). Run `npm test` (node test/validate.mjs) to prove that
 *   - the correct option really is correct,
 *   - none of the wrong options is also correct,
 *   - every option set has 4 unique answers when a quiz is built.
 */

import {
  SPECIAL_ANGLES,
  UNDEFINED,
  MINUS,
  ROMAN,
  exactValue,
  exactToNumber,
  trueValue,
  sameValue,
  approx,
  normalizeAngle,
  quadrantOf,
  referenceAngle,
  isPositiveIn,
  toRadians,
} from './trig.js';

export const QUESTIONS_PER_LEVEL = 10;
export const OPTIONS_PER_QUESTION = 4;

export const LEVEL_INFO = [
  {
    id: 1,
    name: 'Special Angles',
    difficulty: 'Easy',
    accent: 'cyan',
    summary: 'Exact values of sin, cos and tan for 0°, 30°, 45°, 60° and 90°.',
    topics: ['Exact values', 'Special angles', 'tan 90° is undefined'],
  },
  {
    id: 2,
    name: 'Identities & Triangles',
    difficulty: 'Medium',
    accent: 'violet',
    summary: 'Identities, complementary angles and right-triangle calculations.',
    topics: ['Identities', 'Complementary angles', 'Right triangles'],
  },
  {
    id: 3,
    name: 'Unit Circle Master',
    difficulty: 'Hard',
    accent: 'pink',
    summary: 'Quadrants, the unit circle and simple trigonometric equations.',
    topics: ['Quadrants', 'Unit circle', 'Equations'],
  },
];

/** How many questions of each category go into one 10-question quiz. */
export const LEVEL_QUOTAS = {
  1: { value: 7, inverse: 3 },
  2: { identity: 3, complement: 3, triangle: 4 },
  3: { value: 3, circle: 2, quadrant: 2, reference: 1, equation: 2 },
};

/* ------------------------------------------------------------------ helpers */

const FUNCTIONS = ['sin', 'cos', 'tan'];
const unique = (items) => [...new Set(items)];
const degreeLabel = (degrees) => `${degrees}°`;
const flipSign = (value) => {
  if (value === '0' || value === UNDEFINED) return value;
  return value.startsWith(MINUS) ? value.slice(1) : MINUS + value;
};

/* ------------------------------------------------- level 1 & 3: value questions */

function explainSpecialAngle(fn, degrees, value) {
  if (fn === 'sin') {
    return `sin ${degrees}° = ${value}. Memory trick: sin of 0°, 30°, 45°, 60°, 90° is √0/2, √1/2, √2/2, √3/2, √4/2, which simplifies to 0, 1/2, √2/2, √3/2, 1.`;
  }
  if (fn === 'cos') {
    return `cos ${degrees}° = ${value}. Memory trick: cosine is the sine list in reverse. cos of 0°, 30°, 45°, 60°, 90° is 1, √3/2, √2/2, 1/2, 0.`;
  }
  if (degrees === 90) {
    return 'tan θ = sin θ ÷ cos θ. At 90° cosine is 0, and dividing by zero is not allowed, so tan 90° is undefined.';
  }
  return `tan θ = sin θ ÷ cos θ. So tan ${degrees}° = (${exactValue('sin', degrees)}) ÷ (${exactValue('cos', degrees)}) = ${value}.`;
}

function explainAnyAngle(fn, degrees, value) {
  const d = normalizeAngle(degrees);
  if (d % 90 === 0) {
    const x = exactValue('cos', d);
    const y = exactValue('sin', d);
    const point = `(${x}, ${y})`;
    if (fn === 'tan') {
      return x === '0'
        ? `At ${d}° the point on the unit circle is ${point}. tan θ = y ÷ x = ${y} ÷ 0, and dividing by zero is not allowed, so tan ${d}° is undefined.`
        : `At ${d}° the point on the unit circle is ${point}. tan θ = y ÷ x = ${y} ÷ (${x}) = ${value}.`;
    }
    const coordinate = fn === 'cos' ? 'x' : 'y';
    return `At ${d}° the point on the unit circle is ${point}. Cosine is the x-coordinate and sine is the y-coordinate, so ${fn} ${d}° = ${value} (the ${coordinate}-coordinate).`;
  }
  const quadrant = quadrantOf(d);
  const reference = referenceAngle(d);
  const referenceExpression = { 2: `180° − ${d}°`, 3: `${d}° − 180°`, 4: `360° − ${d}°` }[quadrant];
  const base = exactValue(fn, reference);
  const positive = isPositiveIn(fn, quadrant);
  return `${d}° is in Quadrant ${ROMAN[quadrant]}, so its reference angle is ${referenceExpression} = ${reference}°. ${fn} ${reference}° = ${base}. ${fn} is ${positive ? 'positive' : 'negative'} in Quadrant ${ROMAN[quadrant]}, so ${fn} ${d}° = ${value}.`;
}

function verifyExactValue(fn, degrees, correct, wrong) {
  const problems = [];
  const real = trueValue(fn, degrees);
  if (!sameValue(exactToNumber(correct), real)) {
    problems.push(`"${correct}" does not match the real value of ${fn} ${degrees}°`);
  }
  wrong.forEach((option) => {
    if (sameValue(exactToNumber(option), real)) {
      problems.push(`wrong option "${option}" equals the real value of ${fn} ${degrees}°`);
    }
  });
  return problems;
}

function valueQuestion(level, fn, degrees) {
  const correct = exactValue(fn, degrees);
  const priority = [];
  const general = [];

  if (level === 1) {
    SPECIAL_ANGLES.forEach((angle) => priority.push(exactValue(fn, angle)));
    FUNCTIONS.forEach((other) => priority.push(exactValue(other, degrees)));
  } else {
    priority.push(flipSign(correct)); // classic sign mistake
    FUNCTIONS.forEach((other) => priority.push(exactValue(other, degrees)));
    ['1/2', '√2/2', '√3/2', '√3/3', '√3', '1'].forEach((value) => general.push(value, MINUS + value));
    general.push('0', UNDEFINED);
  }

  const wrong = unique([...priority, ...general]).filter((value) => value !== correct);
  return {
    id: `L${level}-${fn}-${degrees}`,
    category: 'value',
    topic: level === 1 ? 'Special angles' : 'Unit circle values',
    prompt: `What is ${fn} ${degrees}°?`,
    correct,
    wrong,
    explanation: level === 1 ? explainSpecialAngle(fn, degrees, correct) : explainAnyAngle(fn, degrees, correct),
    verify: () => verifyExactValue(fn, degrees, correct, wrong),
  };
}

/** Level 1: "which angle has sin θ = 1/2?" */
function inverseQuestion(fn, targetExact, correctDegrees) {
  const target = exactToNumber(targetExact);
  const wrongAngles = SPECIAL_ANGLES.filter((angle) => angle !== correctDegrees);
  return {
    id: `L1-inverse-${fn}-${correctDegrees}`,
    category: 'inverse',
    topic: 'Special angles',
    prompt: `For 0° ≤ θ ≤ 90°, which angle has ${fn} θ = ${targetExact}?`,
    correct: degreeLabel(correctDegrees),
    wrong: wrongAngles.map(degreeLabel),
    explanation: `${fn} ${correctDegrees}° = ${targetExact}, so θ = ${correctDegrees}°. Check the special-angle table: no other angle from 0° to 90° gives this value.`,
    verify() {
      const problems = [];
      if (!sameValue(trueValue(fn, correctDegrees), target)) problems.push('correct angle does not give the target value');
      wrongAngles.forEach((angle) => {
        if (sameValue(trueValue(fn, angle), target)) problems.push(`wrong angle ${angle}° also gives the target value`);
      });
      return problems;
    },
  };
}

/* ------------------------------------------------------ level 2: generic helpers */

/** Question whose options are numbers; `satisfies(value)` must be true for the correct one only. */
function numericQuestion({ id, category, topic, prompt, correct, wrong, explanation, satisfies }) {
  return {
    id,
    category,
    topic,
    prompt,
    explanation,
    correct: correct.label,
    wrong: wrong.map((option) => option.label),
    verify() {
      const problems = [];
      if (!satisfies(correct.value)) problems.push('correct option does not satisfy the condition');
      wrong.forEach((option) => {
        if (satisfies(option.value)) problems.push(`wrong option "${option.label}" also satisfies the condition`);
      });
      return problems;
    },
  };
}

const IDENTITY_TEST_ANGLES = [20, 35, 50, 70];

/** Question whose options are formulas: compared numerically at several angles. */
function identityQuestion({ id, prompt, reference, correct, wrong, explanation }) {
  return {
    id,
    category: 'identity',
    topic: 'Identities',
    prompt,
    explanation,
    correct: correct.label,
    wrong: wrong.map((option) => option.label),
    verify() {
      const problems = [];
      const matches = (formula) =>
        IDENTITY_TEST_ANGLES.every((angle) => approx(formula(toRadians(angle)), reference(toRadians(angle))));
      if (!matches(correct.formula)) problems.push('correct formula does not equal the reference expression');
      wrong.forEach((option) => {
        if (matches(option.formula)) problems.push(`wrong formula "${option.label}" is also correct`);
      });
      return problems;
    },
  };
}

function complementQuestion(fn, degrees, wrongDegrees) {
  const other = fn === 'sin' ? 'cos' : 'sin';
  const answer = 90 - degrees;
  return numericQuestion({
    id: `L2-complement-${fn}-${degrees}`,
    category: 'complement',
    topic: 'Complementary angles',
    prompt: `Complete the complementary-angle rule: ${fn} ${degrees}° = ${other} ?`,
    correct: { label: degreeLabel(answer), value: answer },
    wrong: wrongDegrees.map((d) => ({ label: degreeLabel(d), value: d })),
    explanation: `Complementary angles add up to 90°, and ${fn} θ = ${other}(90° − θ). Here 90° − ${degrees}° = ${answer}°, so ${fn} ${degrees}° = ${other} ${answer}°.`,
    satisfies: (angle) => approx(trueValue(fn, degrees), trueValue(other, angle)),
  });
}

const fraction = (top, bottom) => ({ label: `${top}/${bottom}`, value: top / bottom });
const plain = (label, value) => ({ label, value });

/* ------------------------------------------------------ level 3: more helpers */

function pointQuestion(degrees) {
  const x = exactValue('cos', degrees);
  const y = exactValue('sin', degrees);
  const format = (a, b) => `(${a}, ${b})`;
  const correct = format(x, y);
  const wrong = unique([
    format(flipSign(x), y),
    format(x, flipSign(y)),
    format(y, x),
    format(flipSign(x), flipSign(y)),
  ]).filter((option) => option !== correct);

  const quadrant = quadrantOf(degrees);
  const reference = referenceAngle(degrees);
  const signWord = (value) => (value.startsWith(MINUS) ? 'negative' : 'positive');

  return {
    id: `L3-point-${degrees}`,
    category: 'circle',
    topic: 'Unit circle points',
    prompt: `What are the coordinates (cos θ, sin θ) of the point on the unit circle at θ = ${degrees}°?`,
    correct,
    wrong,
    explanation: `${degrees}° is in Quadrant ${ROMAN[quadrant]} with reference angle ${reference}°. cos ${reference}° = ${exactValue('cos', reference)} and sin ${reference}° = ${exactValue('sin', reference)}. In this quadrant x is ${signWord(x)} and y is ${signWord(y)}, so the point is ${correct}.`,
    verify() {
      const parse = (text) => text.slice(1, -1).split(', ').map(exactToNumber);
      const problems = [];
      const [cx, cy] = parse(correct);
      if (!approx(cx, Math.cos(toRadians(degrees))) || !approx(cy, Math.sin(toRadians(degrees)))) {
        problems.push('correct point does not match (cos, sin)');
      }
      wrong.forEach((option) => {
        const [wx, wy] = parse(option);
        if (approx(wx, cx) && approx(wy, cy)) problems.push(`wrong point ${option} equals the correct point`);
      });
      return problems;
    },
  };
}

/** "270°" -> radians label such as "3π/2" (value in radians for verification). */
function radianValue(label) {
  const match = /^(\d*)π(?:\/(\d+))?$/.exec(label);
  if (!match) throw new Error(`Bad radian label ${label}`);
  const numerator = match[1] === '' ? 1 : Number(match[1]);
  const denominator = match[2] ? Number(match[2]) : 1;
  return (numerator * Math.PI) / denominator;
}

function radianQuestion(degrees, correct, wrong) {
  return numericQuestion({
    id: `L3-radians-${degrees}`,
    category: 'circle',
    topic: 'Radians',
    prompt: `On the unit circle, ${degrees}° equals how many radians?`,
    correct: { label: correct, value: radianValue(correct) },
    wrong: wrong.map((label) => ({ label, value: radianValue(label) })),
    explanation: `Radians = degrees × π/180. So ${degrees}° × π/180 = ${correct}. (A full turn of 360° is 2π radians.)`,
    satisfies: (radians) => approx(radians, toRadians(degrees)),
  });
}

function quadrantQuestion({ id, prompt, predicate, answer, explanation }) {
  return {
    id,
    category: 'quadrant',
    topic: 'Quadrants',
    prompt,
    explanation,
    correct: `Quadrant ${ROMAN[answer]}`,
    wrong: [1, 2, 3, 4].filter((q) => q !== answer).map((q) => `Quadrant ${ROMAN[q]}`),
    verify() {
      const problems = [];
      [1, 2, 3, 4].forEach((quadrant) => {
        const angle = toRadians(quadrant * 90 - 45); // 45°, 135°, 225°, 315°
        const holds = predicate(Math.sin(angle), Math.cos(angle), Math.tan(angle));
        if (holds !== (quadrant === answer)) problems.push(`predicate gives ${holds} in Quadrant ${ROMAN[quadrant]}`);
      });
      return problems;
    },
  };
}

const QUADRANT_RULE =
  'Remember "All Students Take Calculus": Quadrant I – all positive, II – only sine, III – only tangent, IV – only cosine.';

function referenceQuestion(degrees, correct, wrong) {
  const quadrant = quadrantOf(degrees);
  const expression = { 2: `180° − ${degrees}°`, 3: `${degrees}° − 180°`, 4: `360° − ${degrees}°` }[quadrant];
  return numericQuestion({
    id: `L3-reference-${degrees}`,
    category: 'reference',
    topic: 'Reference angles',
    prompt: `What is the reference angle of ${degrees}°?`,
    correct: { label: degreeLabel(correct), value: correct },
    wrong: wrong.map((d) => ({ label: degreeLabel(d), value: d })),
    explanation: `The reference angle is the acute angle between the terminal side and the x-axis. ${degrees}° is in Quadrant ${ROMAN[quadrant]}, so reference angle = ${expression} = ${correct}°.`,
    satisfies: (value) => approx(value, referenceAngle(degrees)),
  });
}

function equationQuestion({ id, prompt, formula, target, range, correct, wrong, explanation }) {
  const isSolution = (degrees) =>
    degrees >= range[0] && degrees <= range[1] && approx(formula(toRadians(degrees)), target, 1e-9);
  return numericQuestion({
    id,
    category: 'equation',
    topic: 'Equations',
    prompt,
    correct: { label: degreeLabel(correct), value: correct },
    wrong: wrong.map((d) => ({ label: degreeLabel(d), value: d })),
    explanation,
    satisfies: isSolution,
  });
}

/* ------------------------------------------------------------------ the banks */

const level1 = [
  ...FUNCTIONS.flatMap((fn) => SPECIAL_ANGLES.map((angle) => valueQuestion(1, fn, angle))),
  inverseQuestion('sin', '1/2', 30),
  inverseQuestion('cos', '√2/2', 45),
  inverseQuestion('tan', '√3', 60),
  inverseQuestion('sin', '1', 90),
  inverseQuestion('cos', '1', 0),
  inverseQuestion('tan', '1', 45),
];

const level2 = [
  /* identities */
  identityQuestion({
    id: 'L2-identity-pythagorean',
    prompt: 'Which value does sin²θ + cos²θ always equal?',
    reference: () => 1,
    correct: { label: '1', formula: () => 1 },
    wrong: [
      { label: '0', formula: () => 0 },
      { label: '2', formula: () => 2 },
      { label: 'tan θ', formula: (t) => Math.tan(t) },
    ],
    explanation:
      'On the unit circle, cos θ is the x-coordinate and sin θ is the y-coordinate of a point 1 unit from the center. By the Pythagorean theorem x² + y² = 1, so sin²θ + cos²θ = 1.',
  }),
  identityQuestion({
    id: 'L2-identity-tan',
    prompt: 'Which expression is equal to tan θ?',
    reference: (t) => Math.tan(t),
    correct: { label: 'sin θ ÷ cos θ', formula: (t) => Math.sin(t) / Math.cos(t) },
    wrong: [
      { label: 'cos θ ÷ sin θ', formula: (t) => Math.cos(t) / Math.sin(t) },
      { label: 'sin θ × cos θ', formula: (t) => Math.sin(t) * Math.cos(t) },
      { label: 'sin θ + cos θ', formula: (t) => Math.sin(t) + Math.cos(t) },
    ],
    explanation:
      'tan θ = opposite ÷ adjacent. Divide both by the hypotenuse: (opposite ÷ hypotenuse) ÷ (adjacent ÷ hypotenuse) = sin θ ÷ cos θ.',
  }),
  identityQuestion({
    id: 'L2-identity-one-minus-sin',
    prompt: 'Which expression is equal to 1 − sin²θ?',
    reference: (t) => 1 - Math.sin(t) ** 2,
    correct: { label: 'cos²θ', formula: (t) => Math.cos(t) ** 2 },
    wrong: [
      { label: 'sin²θ', formula: (t) => Math.sin(t) ** 2 },
      { label: 'tan²θ', formula: (t) => Math.tan(t) ** 2 },
      { label: '1 + cos²θ', formula: (t) => 1 + Math.cos(t) ** 2 },
    ],
    explanation: 'Start with sin²θ + cos²θ = 1 and subtract sin²θ from both sides. You get cos²θ = 1 − sin²θ.',
  }),
  identityQuestion({
    id: 'L2-identity-sin-complement',
    prompt: 'Which expression is equal to sin(90° − θ)?',
    reference: (t) => Math.sin(Math.PI / 2 - t),
    correct: { label: 'cos θ', formula: (t) => Math.cos(t) },
    wrong: [
      { label: 'sin θ', formula: (t) => Math.sin(t) },
      { label: '−cos θ', formula: (t) => -Math.cos(t) },
      { label: 'tan θ', formula: (t) => Math.tan(t) },
    ],
    explanation:
      'In a right triangle the two acute angles are θ and 90° − θ. The side opposite 90° − θ is the side adjacent to θ, so sin(90° − θ) = cos θ.',
  }),
  identityQuestion({
    id: 'L2-identity-cos-complement',
    prompt: 'Which expression is equal to cos(90° − θ)?',
    reference: (t) => Math.cos(Math.PI / 2 - t),
    correct: { label: 'sin θ', formula: (t) => Math.sin(t) },
    wrong: [
      { label: 'cos θ', formula: (t) => Math.cos(t) },
      { label: '−sin θ', formula: (t) => -Math.sin(t) },
      { label: '1 − sin θ', formula: (t) => 1 - Math.sin(t) },
    ],
    explanation:
      'The side adjacent to 90° − θ is the side opposite θ. So cos(90° − θ) = sin θ. Sine and cosine are "co-functions" of complementary angles.',
  }),
  identityQuestion({
    id: 'L2-identity-one-plus-tan',
    prompt: 'Which expression is equal to 1 + tan²θ?',
    reference: (t) => 1 + Math.tan(t) ** 2,
    correct: { label: '1 ÷ cos²θ', formula: (t) => 1 / Math.cos(t) ** 2 },
    wrong: [
      { label: '1 ÷ sin²θ', formula: (t) => 1 / Math.sin(t) ** 2 },
      { label: 'sin²θ ÷ cos²θ', formula: (t) => Math.sin(t) ** 2 / Math.cos(t) ** 2 },
      { label: '1', formula: () => 1 },
    ],
    explanation:
      'Divide sin²θ + cos²θ = 1 by cos²θ. You get tan²θ + 1 = 1 ÷ cos²θ.',
  }),

  /* complementary angles and angle facts */
  complementQuestion('sin', 30, [30, 150, 120]),
  complementQuestion('cos', 20, [20, 160, 40]),
  complementQuestion('sin', 35, [35, 145, 125]),
  complementQuestion('cos', 50, [50, 130, 80]),
  numericQuestion({
    id: 'L2-complement-tan-product',
    category: 'complement',
    topic: 'Complementary angles',
    prompt: 'What is the value of tan 40° × tan 50°?',
    correct: plain('1', 1),
    wrong: [plain('0', 0), plain('2', 2), plain('1/2', 0.5)],
    explanation:
      '40° and 50° are complementary (40° + 50° = 90°), so tan 50° = 1 ÷ tan 40°. Multiplying the two numbers always gives 1.',
    satisfies: (value) => approx(value, Math.tan(toRadians(40)) * Math.tan(toRadians(50))),
  }),
  numericQuestion({
    id: 'L2-complement-triangle-angle',
    category: 'complement',
    topic: 'Complementary angles',
    prompt: 'In a right triangle, one acute angle is 25°. How big is the other acute angle?',
    correct: plain('65°', 65),
    wrong: [plain('75°', 75), plain('155°', 155), plain('25°', 25)],
    explanation:
      'The angles of a triangle add up to 180°. The right angle uses 90°, so the two acute angles add up to 90°: 90° − 25° = 65°.',
    satisfies: (value) => approx(value, 90 - 25),
  }),
  numericQuestion({
    id: 'L2-complement-equal',
    category: 'complement',
    topic: 'Complementary angles',
    prompt: 'For an acute angle θ, if sin θ = cos θ, what is θ?',
    correct: plain('45°', 45),
    wrong: [plain('30°', 30), plain('60°', 60), plain('90°', 90)],
    explanation:
      'sin θ = cos θ means the opposite and adjacent sides are equal, so tan θ = 1. That happens at 45°, where both sin and cos equal √2/2.',
    satisfies: (value) => approx(Math.sin(toRadians(value)), Math.cos(toRadians(value))),
  }),

  /* right-triangle calculations */
  numericQuestion({
    id: 'L2-triangle-hypotenuse',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'A right triangle has legs of length 3 and 4. How long is the hypotenuse?',
    correct: plain('5', 5),
    wrong: [plain('7', 7), plain('12', 12), plain('25', 25)],
    explanation: 'Pythagorean theorem: 3² + 4² = 9 + 16 = 25, and √25 = 5.',
    satisfies: (value) => approx(value, Math.hypot(3, 4)),
  }),
  numericQuestion({
    id: 'L2-triangle-sin-sides',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'In a right triangle, the side opposite angle θ is 5 and the hypotenuse is 13. What is sin θ?',
    correct: fraction(5, 13),
    wrong: [fraction(13, 5), fraction(5, 12), fraction(12, 13)],
    explanation: 'SOH: sin θ = opposite ÷ hypotenuse = 5/13.',
    satisfies: (value) => approx(value, 5 / 13),
  }),
  numericQuestion({
    id: 'L2-triangle-cos-sides',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'In a right triangle, the side adjacent to angle θ is 12 and the hypotenuse is 13. What is cos θ?',
    correct: fraction(12, 13),
    wrong: [fraction(13, 12), fraction(12, 5), fraction(5, 13)],
    explanation: 'CAH: cos θ = adjacent ÷ hypotenuse = 12/13.',
    satisfies: (value) => approx(value, 12 / 13),
  }),
  numericQuestion({
    id: 'L2-triangle-tan-sides',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'In a right triangle, the side opposite θ is 8 and the side adjacent to θ is 6. What is tan θ?',
    correct: fraction(4, 3),
    wrong: [fraction(3, 4), fraction(4, 5), fraction(5, 3)],
    explanation: 'TOA: tan θ = opposite ÷ adjacent = 8/6, which simplifies to 4/3.',
    satisfies: (value) => approx(value, 8 / 6),
  }),
  numericQuestion({
    id: 'L2-triangle-cos-from-sin',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'θ is an acute angle and sin θ = 3/5. What is cos θ?',
    correct: fraction(4, 5),
    wrong: [fraction(3, 4), fraction(5, 4), fraction(2, 5)],
    explanation:
      'Use sin²θ + cos²θ = 1. Then cos²θ = 1 − 9/25 = 16/25, so cos θ = 4/5 (positive because θ is acute).',
    satisfies: (value) => approx(value, 4 / 5),
  }),
  numericQuestion({
    id: 'L2-triangle-sin-from-cos',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'θ is an acute angle and cos θ = 5/13. What is sin θ?',
    correct: fraction(12, 13),
    wrong: [fraction(5, 12), fraction(13, 12), fraction(8, 13)],
    explanation:
      'Use sin²θ + cos²θ = 1. Then sin²θ = 1 − 25/169 = 144/169, so sin θ = 12/13 (positive because θ is acute).',
    satisfies: (value) => approx(value, 12 / 13),
  }),
  numericQuestion({
    id: 'L2-triangle-tan-from-sin',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'θ is an acute angle and sin θ = 1/2. What is tan θ?',
    correct: plain('√3/3', Math.sqrt(3) / 3),
    wrong: [plain('√3', Math.sqrt(3)), plain('1/2', 0.5), plain('1', 1)],
    explanation: 'sin θ = 1/2 means θ = 30°. From the special-angle table, tan 30° = √3/3.',
    satisfies: (value) => approx(value, Math.tan(toRadians(30))),
  }),
  numericQuestion({
    id: 'L2-triangle-opposite-30',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'A right triangle has a hypotenuse of 10 and an angle of 30°. How long is the side opposite the 30° angle?',
    correct: plain('5', 5),
    wrong: [plain('5√3', 5 * Math.sqrt(3)), plain('10', 10), plain('20', 20)],
    explanation: 'sin θ = opposite ÷ hypotenuse, so opposite = 10 × sin 30° = 10 × 1/2 = 5.',
    satisfies: (value) => approx(value, 10 * Math.sin(toRadians(30))),
  }),
  numericQuestion({
    id: 'L2-triangle-adjacent-60',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'A right triangle has a hypotenuse of 12 and an angle of 60°. How long is the side adjacent to the 60° angle?',
    correct: plain('6', 6),
    wrong: [plain('6√3', 6 * Math.sqrt(3)), plain('12', 12), plain('24', 24)],
    explanation: 'cos θ = adjacent ÷ hypotenuse, so adjacent = 12 × cos 60° = 12 × 1/2 = 6.',
    satisfies: (value) => approx(value, 12 * Math.cos(toRadians(60))),
  }),
  numericQuestion({
    id: 'L2-triangle-opposite-45',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'In a right triangle, an angle of 45° has an adjacent side of 5. How long is the opposite side?',
    correct: plain('5', 5),
    wrong: [plain('5√2', 5 * Math.SQRT2), plain('5/2', 2.5), plain('10', 10)],
    explanation: 'tan θ = opposite ÷ adjacent, so opposite = 5 × tan 45° = 5 × 1 = 5.',
    satisfies: (value) => approx(value, 5 * Math.tan(toRadians(45))),
  }),
  numericQuestion({
    id: 'L2-triangle-hypotenuse-30',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'In a right triangle, the side opposite a 30° angle is 4. How long is the hypotenuse?',
    correct: plain('8', 8),
    wrong: [plain('4√3', 4 * Math.sqrt(3)), plain('2', 2), plain('4', 4)],
    explanation: 'sin θ = opposite ÷ hypotenuse, so hypotenuse = 4 ÷ sin 30° = 4 ÷ 1/2 = 8.',
    satisfies: (value) => approx(value, 4 / Math.sin(toRadians(30))),
  }),
  numericQuestion({
    id: 'L2-triangle-ladder',
    category: 'triangle',
    topic: 'Right triangles',
    prompt: 'A 10 m ladder leans against a wall and makes a 60° angle with the ground. How high up the wall does it reach?',
    correct: plain('5√3 m', 5 * Math.sqrt(3)),
    wrong: [plain('5 m', 5), plain('10 m', 10), plain('5√2 m', 5 * Math.SQRT2)],
    explanation:
      'The height is the side opposite the 60° angle: height = 10 × sin 60° = 10 × √3/2 = 5√3 m (about 8.66 m).',
    satisfies: (value) => approx(value, 10 * Math.sin(toRadians(60))),
  }),
];

const level3 = [
  /* exact values anywhere on the unit circle */
  ...[
    ['sin', 150],
    ['cos', 120],
    ['cos', 135],
    ['sin', 210],
    ['tan', 135],
    ['cos', 300],
    ['sin', 225],
    ['tan', 225],
    ['sin', 270],
    ['cos', 180],
    ['tan', 180],
    ['sin', 330],
    ['cos', 210],
    ['tan', 120],
    ['tan', 270],
    ['cos', 270],
  ].map(([fn, angle]) => valueQuestion(3, fn, angle)),

  /* unit-circle points and radians */
  pointQuestion(120),
  pointQuestion(210),
  pointQuestion(315),
  radianQuestion(180, 'π', ['π/2', '2π', '3π/2']),
  radianQuestion(90, 'π/2', ['π', 'π/4', '2π/3']),
  radianQuestion(270, '3π/2', ['π/2', '2π', '3π/4']),

  /* quadrants */
  quadrantQuestion({
    id: 'L3-quadrant-sin-pos-cos-neg',
    prompt: 'In which quadrant is sine positive but cosine negative?',
    predicate: (s, c) => s > 0 && c < 0,
    answer: 2,
    explanation: `In Quadrant II the x-coordinate (cosine) is negative and the y-coordinate (sine) is positive. ${QUADRANT_RULE}`,
  }),
  quadrantQuestion({
    id: 'L3-quadrant-both-negative',
    prompt: 'In which quadrant are both sine and cosine negative?',
    predicate: (s, c) => s < 0 && c < 0,
    answer: 3,
    explanation: `In Quadrant III both x and y are negative, so sine and cosine are both negative (and tangent is positive). ${QUADRANT_RULE}`,
  }),
  quadrantQuestion({
    id: 'L3-quadrant-tan-neg-cos-pos',
    prompt: 'In which quadrant is tangent negative while cosine is positive?',
    predicate: (s, c, t) => t < 0 && c > 0,
    answer: 4,
    explanation: `In Quadrant IV x is positive (cos > 0) and y is negative (sin < 0), so tan = sin ÷ cos is negative. ${QUADRANT_RULE}`,
  }),
  quadrantQuestion({
    id: 'L3-quadrant-all-positive',
    prompt: 'In which quadrant are sine, cosine and tangent all positive?',
    predicate: (s, c, t) => s > 0 && c > 0 && t > 0,
    answer: 1,
    explanation: `In Quadrant I both x and y are positive, so every trig function is positive. ${QUADRANT_RULE}`,
  }),
  quadrantQuestion({
    id: 'L3-quadrant-tan-pos-sin-neg',
    prompt: 'Tangent is positive and sine is negative. Which quadrant is the angle in?',
    predicate: (s, c, t) => t > 0 && s < 0,
    answer: 3,
    explanation: `In Quadrant III sine and cosine are both negative, so tan = sin ÷ cos is positive. ${QUADRANT_RULE}`,
  }),

  /* reference angles */
  referenceQuestion(150, 30, [60, 150, 15]),
  referenceQuestion(240, 60, [30, 120, 45]),
  referenceQuestion(315, 45, [15, 135, 30]),

  /* simple trigonometric equations */
  equationQuestion({
    id: 'L3-equation-sin-sqrt3',
    prompt: 'Solve sin x = √3/2 for 0° ≤ x ≤ 90°.',
    formula: Math.sin,
    target: Math.sqrt(3) / 2,
    range: [0, 90],
    correct: 60,
    wrong: [30, 45, 120],
    explanation:
      'From the special-angle table, sin 60° = √3/2. (120° also has sine √3/2, but it is outside the allowed range 0° to 90°.)',
  }),
  equationQuestion({
    id: 'L3-equation-2cos',
    prompt: 'Solve 2 cos x = 1 for 0° ≤ x ≤ 90°.',
    formula: (t) => 2 * Math.cos(t),
    target: 1,
    range: [0, 90],
    correct: 60,
    wrong: [30, 45, 90],
    explanation: 'Divide both sides by 2: cos x = 1/2. From the special-angle table, cos 60° = 1/2, so x = 60°.',
  }),
  equationQuestion({
    id: 'L3-equation-tan-one',
    prompt: 'Solve tan x = 1 for 0° ≤ x ≤ 90°.',
    formula: Math.tan,
    target: 1,
    range: [0, 90],
    correct: 45,
    wrong: [30, 60, 90],
    explanation: 'tan x = 1 means opposite = adjacent, which happens at 45°. Indeed tan 45° = 1.',
  }),
  equationQuestion({
    id: 'L3-equation-2sin-minus-1',
    prompt: 'Solve 2 sin x − 1 = 0 for 0° ≤ x ≤ 90°.',
    formula: (t) => 2 * Math.sin(t) - 1,
    target: 0,
    range: [0, 90],
    correct: 30,
    wrong: [45, 60, 90],
    explanation: 'Add 1 to both sides and divide by 2: sin x = 1/2. From the special-angle table, x = 30°.',
  }),
  equationQuestion({
    id: 'L3-equation-2sin-sqrt2',
    prompt: 'Solve 2 sin x = √2 for 0° ≤ x ≤ 90°.',
    formula: (t) => 2 * Math.sin(t),
    target: Math.SQRT2,
    range: [0, 90],
    correct: 45,
    wrong: [30, 60, 90],
    explanation: 'Divide both sides by 2: sin x = √2/2. From the special-angle table, sin 45° = √2/2, so x = 45°.',
  }),
  equationQuestion({
    id: 'L3-equation-sin-half-q2',
    prompt: 'Solve sin x = 1/2 for 90° ≤ x ≤ 180°.',
    formula: Math.sin,
    target: 0.5,
    range: [90, 180],
    correct: 150,
    wrong: [30, 120, 135],
    explanation:
      'sin 30° = 1/2, but 30° is not in the range. In Quadrant II the angle with reference angle 30° is 180° − 30° = 150°.',
  }),
  equationQuestion({
    id: 'L3-equation-cos-neg-sqrt2',
    prompt: 'Solve cos x = −√2/2 for 0° ≤ x ≤ 180°.',
    formula: Math.cos,
    target: -Math.SQRT2 / 2,
    range: [0, 180],
    correct: 135,
    wrong: [45, 120, 150],
    explanation:
      'The reference angle is 45° (cos 45° = √2/2). Cosine is negative in Quadrant II, so x = 180° − 45° = 135°.',
  }),
  equationQuestion({
    id: 'L3-equation-cos-neg-half',
    prompt: 'Solve cos x = −1/2 for 90° ≤ x ≤ 180°.',
    formula: Math.cos,
    target: -0.5,
    range: [90, 180],
    correct: 120,
    wrong: [60, 135, 150],
    explanation:
      'The reference angle is 60° (cos 60° = 1/2). Cosine is negative in Quadrant II, so x = 180° − 60° = 120°.',
  }),
  equationQuestion({
    id: 'L3-equation-tan-neg-sqrt3',
    prompt: 'Solve tan x = −√3 for 90° < x < 180°.',
    formula: Math.tan,
    target: -Math.sqrt(3),
    range: [90, 180],
    correct: 120,
    wrong: [60, 135, 150],
    explanation:
      'The reference angle is 60° (tan 60° = √3). Tangent is negative in Quadrant II, so x = 180° − 60° = 120°.',
  }),
  equationQuestion({
    id: 'L3-equation-sin-neg-half',
    prompt: 'Solve sin x = −1/2 for 180° ≤ x ≤ 270°.',
    formula: Math.sin,
    target: -0.5,
    range: [180, 270],
    correct: 210,
    wrong: [30, 150, 240],
    explanation:
      'The reference angle is 30°. The range 180° to 270° is Quadrant III, where sine is negative, so x = 180° + 30° = 210°.',
  }),
];

export const QUESTION_BANK = {
  1: level1.map((template) => ({ ...template, level: 1 })),
  2: level2.map((template) => ({ ...template, level: 2 })),
  3: level3.map((template) => ({ ...template, level: 3 })),
};

/* ----------------------------------------------------------- building a quiz */

function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function instantiate(template, random) {
  const wrongPick = shuffle(template.wrong.slice(0, 5), random).slice(0, OPTIONS_PER_QUESTION - 1);
  const options = shuffle(
    [{ text: template.correct, isCorrect: true }, ...wrongPick.map((text) => ({ text, isCorrect: false }))],
    random,
  );
  return {
    id: template.id,
    level: template.level,
    topic: template.topic,
    prompt: template.prompt,
    options,
    correctIndex: options.findIndex((option) => option.isCorrect),
    correctText: template.correct,
    explanation: template.explanation,
  };
}

/** Builds a fresh, shuffled set of 10 questions for a level. */
export function buildQuestionSet(level, random = Math.random) {
  const bank = QUESTION_BANK[level];
  if (!bank) throw new Error(`Unknown level ${level}`);

  const chosen = [];
  Object.entries(LEVEL_QUOTAS[level]).forEach(([category, quota]) => {
    const pool = bank.filter((template) => template.category === category);
    chosen.push(...shuffle(pool, random).slice(0, quota));
  });

  if (chosen.length < QUESTIONS_PER_LEVEL) {
    const leftovers = shuffle(
      bank.filter((template) => !chosen.includes(template)),
      random,
    );
    chosen.push(...leftovers.slice(0, QUESTIONS_PER_LEVEL - chosen.length));
  }

  return shuffle(chosen, random)
    .slice(0, QUESTIONS_PER_LEVEL)
    .map((template) => instantiate(template, random));
}

/* ---------------------------------------------------------------- validation */

/** Checks every template with real math. Returns { ok, errors, counts }. */
export function validateAllQuestions() {
  const errors = [];
  const counts = {};
  const seenIds = new Set();

  Object.entries(QUESTION_BANK).forEach(([level, templates]) => {
    counts[level] = templates.length;
    if (templates.length < 20) errors.push(`Level ${level} has only ${templates.length} questions (need 20+)`);

    templates.forEach((template) => {
      const where = `L${level} ${template.id}`;
      if (seenIds.has(template.id)) errors.push(`${where}: duplicate id`);
      seenIds.add(template.id);

      if (!template.prompt) errors.push(`${where}: empty prompt`);
      if (!template.explanation) errors.push(`${where}: empty explanation`);
      if (template.wrong.length < OPTIONS_PER_QUESTION - 1) errors.push(`${where}: fewer than 3 wrong options`);
      if (unique(template.wrong).length !== template.wrong.length) errors.push(`${where}: duplicate wrong options`);
      if (template.wrong.includes(template.correct)) errors.push(`${where}: correct answer also listed as wrong`);
      if (!LEVEL_QUOTAS[level][template.category]) errors.push(`${where}: category "${template.category}" has no quota`);

      try {
        template.verify().forEach((problem) => errors.push(`${where}: ${problem}`));
      } catch (error) {
        errors.push(`${where}: verify() threw ${error.message}`);
      }
    });
  });

  return { ok: errors.length === 0, errors, counts };
}
