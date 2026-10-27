/**
 * Run with:  node test/validate.mjs   (or: npm test)
 * Validates every question with real math and exercises the quiz rules.
 */

import assert from 'node:assert/strict';
import { validateAllQuestions, buildQuestionSet, QUESTION_BANK, QUESTIONS_PER_LEVEL } from '../js/questions.js';
import { QuizEngine, CONFIG, starsForAccuracy } from '../js/engine.js';
import { exactValue, exactToNumber, trueValue, sameValue, degreesToPiText } from '../js/trig.js';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

console.log('Question bank');

check('every template passes its math verification', () => {
  const report = validateAllQuestions();
  if (!report.ok) console.error(report.errors.join('\n'));
  assert.equal(report.ok, true);
  Object.entries(report.counts).forEach(([level, count]) => {
    assert.ok(count >= 20, `level ${level} has ${count} questions`);
    console.log(`        level ${level}: ${count} validated questions`);
  });
});

check('exact value table matches Math.* for every multiple of 30° and 45°', () => {
  const angles = new Set();
  for (let a = 0; a < 360; a += 30) angles.add(a);
  for (let a = 0; a < 360; a += 45) angles.add(a);
  angles.forEach((angle) => {
    ['sin', 'cos', 'tan'].forEach((fn) => {
      assert.ok(
        sameValue(exactToNumber(exactValue(fn, angle)), trueValue(fn, angle)),
        `${fn} ${angle}° => ${exactValue(fn, angle)}`,
      );
    });
  });
  assert.equal(exactValue('tan', 90), 'Undefined');
  assert.equal(exactValue('sin', 210), '−1/2');
});

check('radian text helper', () => {
  assert.equal(degreesToPiText(150), '5π/6');
  assert.equal(degreesToPiText(90), 'π/2');
  assert.equal(degreesToPiText(360), '2π');
  assert.equal(degreesToPiText(0), '0');
});

check('300 generated quizzes per level are well formed', () => {
  for (const level of [1, 2, 3]) {
    for (let run = 0; run < 300; run += 1) {
      const set = buildQuestionSet(level);
      assert.equal(set.length, QUESTIONS_PER_LEVEL);
      assert.equal(new Set(set.map((q) => q.id)).size, QUESTIONS_PER_LEVEL, 'duplicate question in one quiz');
      set.forEach((q) => {
        assert.equal(q.options.length, 4);
        assert.equal(new Set(q.options.map((o) => o.text)).size, 4, `duplicate options in ${q.id}`);
        assert.equal(q.options.filter((o) => o.isCorrect).length, 1, `not exactly one correct in ${q.id}`);
        assert.equal(q.options[q.correctIndex].text, q.correctText);
        assert.ok(q.explanation.length > 20);
      });
    }
  }
});

check('answer positions are shuffled (all four slots get used)', () => {
  const slots = new Set();
  for (let run = 0; run < 200; run += 1) buildQuestionSet(1).forEach((q) => slots.add(q.correctIndex));
  assert.equal(slots.size, 4);
});

check('level 1 only uses exact values (no decimals) and includes tan 90° = Undefined', () => {
  QUESTION_BANK[1].forEach((q) => {
    [q.correct, ...q.wrong].forEach((text) => assert.ok(!/\d\.\d/.test(text), `decimal in ${q.id}: ${text}`));
  });
  assert.ok(QUESTION_BANK[1].some((q) => q.id === 'L1-tan-90' && q.correct === 'Undefined'));
});

console.log('Quiz engine');

const makeEngine = () => {
  const engine = new QuizEngine(buildQuestionSet(1));
  engine.start(0);
  return engine;
};
const wrongIndexOf = (engine) => (engine.current.correctIndex + 1) % 4;

check('correct answer scores +10 exactly once (double click is ignored)', () => {
  const engine = makeEngine();
  const first = engine.answer(engine.current.correctIndex, 1000);
  assert.equal(first.kind, 'correct');
  assert.equal(engine.score, 10);
  assert.equal(engine.answer(engine.current.correctIndex, 1001), null);
  assert.equal(engine.timeout(25000), null, 'timeout after answering must be ignored');
  assert.equal(engine.score, 10);
  assert.equal(engine.hearts, 3);
});

check('wrong answer removes one heart and reveals the correct index', () => {
  const engine = makeEngine();
  const result = engine.answer(wrongIndexOf(engine), 2000);
  assert.equal(result.kind, 'wrong');
  assert.equal(result.hearts, 2);
  assert.equal(result.correctIndex, engine.current.correctIndex);
  assert.equal(engine.score, 0);
});

check('timeout removes one heart; early timeout is ignored; late click counts as timeout', () => {
  const engine = makeEngine();
  assert.equal(engine.timeout(19999), null);
  const result = engine.timeout(20000);
  assert.equal(result.kind, 'timeout');
  assert.equal(engine.hearts, 2);
  assert.equal(engine.timeout(20001), null);

  engine.next(21000);
  const late = engine.answer(engine.current.correctIndex, 21000 + 20001);
  assert.equal(late.kind, 'timeout', 'a click after the deadline must not score');
  assert.equal(engine.score, 0);
});

check('pause freezes the clock and resume restores the remaining time', () => {
  const engine = makeEngine();
  engine.pause(5000);
  assert.equal(engine.remainingMs(99999), 15000);
  assert.equal(engine.answer(0, 6000), null, 'cannot answer while paused');
  engine.resume(60000);
  assert.equal(engine.remainingMs(60000), 15000);
  assert.equal(engine.timeout(70000), null);
  assert.equal(engine.timeout(75000).kind, 'timeout');
});

check('three mistakes before the last question = game over, 0 stars, no unlock', () => {
  const engine = makeEngine();
  let now = 0;
  for (let i = 0; i < 3; i += 1) {
    const result = engine.answer(wrongIndexOf(engine), (now += 1000));
    assert.equal(result.gameOver, i === 2);
    engine.next((now += 1000));
  }
  assert.equal(engine.status, 'finished');
  const summary = engine.summary();
  assert.equal(summary.outcome, 'gameover');
  assert.equal(summary.stars, 0);
  assert.equal(summary.passed, false);
  assert.equal(summary.wrongCount, 3);
});

check('perfect run: 100 points, 3 stars, passed', () => {
  const engine = makeEngine();
  let now = 0;
  for (let i = 0; i < 10; i += 1) {
    engine.answer(engine.current.correctIndex, (now += 1000));
    engine.next((now += 1000));
  }
  const summary = engine.summary();
  assert.equal(summary.score, 100);
  assert.equal(summary.accuracy, 100);
  assert.equal(summary.stars, 3);
  assert.equal(summary.passed, true);
  assert.equal(summary.outcome, 'completed');
});

check('exactly 70% (third mistake on the LAST question) still completes and passes with 1 star', () => {
  const engine = makeEngine();
  let now = 0;
  const mistakeAt = new Set([2, 5, 9]);
  for (let i = 0; i < 10; i += 1) {
    const choice = mistakeAt.has(i) ? wrongIndexOf(engine) : engine.current.correctIndex;
    const result = engine.answer(choice, (now += 1000));
    if (i === 9) assert.equal(result.gameOver, false);
    engine.next((now += 1000));
  }
  const summary = engine.summary();
  assert.equal(summary.outcome, 'completed');
  assert.equal(summary.accuracy, 70);
  assert.equal(summary.stars, 1);
  assert.equal(summary.passed, true);
});

check('star thresholds', () => {
  assert.deepEqual([100, 90, 89, 80, 79, 70, 69, 0].map(starsForAccuracy), [3, 3, 2, 2, 1, 1, 0, 0]);
  assert.equal(CONFIG.secondsPerQuestion, 20);
  assert.equal(CONFIG.startingHearts, 3);
});

check('invalid option indexes are ignored', () => {
  const engine = makeEngine();
  assert.equal(engine.answer(-1, 100), null);
  assert.equal(engine.answer(4, 100), null);
  assert.equal(engine.answer(1.5, 100), null);
  assert.equal(engine.answer(undefined, 100), null);
  assert.equal(engine.status, 'asking');
});

console.log(`\nAll ${passed} checks passed.`);
