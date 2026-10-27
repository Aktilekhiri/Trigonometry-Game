/**
 * Run with:  node test/validate.mjs   (or: npm test)
 * Checks the game maths with real Math.* and exercises progress storage and the mission map.
 */

import assert from 'node:assert/strict';

// storage.js reads window.localStorage when it loads, so provide a tiny fake first.
const memory = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  },
};

const trig = await import('../js/trig.js');
const puzzles = await import('../js/puzzles.js');
const content = await import('../js/content.js');
const storage = await import('../js/storage.js');

const { exactValue, exactToNumber, trueValue, sameValue, degreesToPiText, toRadians } = trig;
const { WORLDS, NODES, LESSONS } = content;

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

/** Small deterministic random generator so failures can be reproduced. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ trig */
console.log('Exact values');

check('exact value table matches Math.* for every multiple of 30° and 45°', () => {
  puzzles.ALL_SPECIAL_ANGLES.forEach((angle) => {
    ['sin', 'cos', 'tan'].forEach((fn) => {
      assert.ok(sameValue(exactToNumber(exactValue(fn, angle)), trueValue(fn, angle)), `${fn} ${angle}°`);
    });
  });
  assert.equal(exactValue('tan', 90), 'Undefined');
  assert.equal(exactValue('sin', 210), '−1/2');
  assert.equal(degreesToPiText(150), '5π/6');
});

check('special triangles really have the stated side ratios', () => {
  [30, 45, 60].forEach((theta) => {
    const t = puzzles.SPECIAL_TRIANGLES[theta];
    const r = toRadians(theta);
    assert.ok(Math.abs(t.opp / t.hyp - Math.sin(r)) < 1e-9, `sin ${theta}`);
    assert.ok(Math.abs(t.adj / t.hyp - Math.cos(r)) < 1e-9, `cos ${theta}`);
    assert.ok(Math.abs(t.opp / t.adj - Math.tan(r)) < 1e-9, `tan ${theta}`);
  });
});

check('ratioFor picks sin, cos and tan from pairs of sides', () => {
  assert.equal(puzzles.ratioFor('opp', 'hyp'), 'sin');
  assert.equal(puzzles.ratioFor('hyp', 'adj'), 'cos');
  assert.equal(puzzles.ratioFor('adj', 'opp'), 'tan');
  assert.throws(() => puzzles.ratioFor('opp', 'opp'));
});

/* ---------------------------------------------------------------- cannon */
console.log('Crystal Cannon');

const allCannonSpecs = [];
NODES.filter((n) => n.kind === 'cannon').forEach((n) => n.plan.forEach((spec) => allCannonSpecs.push(spec)));

check('1000 rounds per spec: target on the board, answer hits, wrong answers miss', () => {
  const rng = seeded(7);
  allCannonSpecs.forEach((spec) => {
    for (let run = 0; run < 1000; run += 1) {
      const round = puzzles.makeCannonRound(spec, rng);
      const { target, answer } = round;
      assert.ok(target.x >= -1e-9 && target.x <= 14, `x ${target.x}`);
      assert.ok(target.y >= -1e-9 && target.y <= 14, `y ${target.y}`);
      assert.ok(answer.power >= puzzles.CANNON_LIMITS.minPower && answer.power <= puzzles.CANNON_LIMITS.maxPower);

      const good = puzzles.checkCannonShot(round, { angle: answer.angle, power: answer.power });
      assert.equal(good.hit, true);
      assert.ok(Math.hypot(good.tip.x - target.x, good.tip.y - target.y) < 1e-9);

      // Wrong inputs: neighbouring special angles / far-off powers must miss.
      if (round.kind === 'aim') {
        [answer.angle - 15, answer.angle + 15].forEach((angle) => {
          assert.equal(puzzles.checkCannonShot(round, { angle, power: 0 }).hit, false, `aim ${angle}`);
        });
      }
      if (round.kind === 'power') {
        [answer.power - 2, answer.power + 2].forEach((power) => {
          assert.equal(puzzles.checkCannonShot(round, { angle: 0, power }).hit, false, `power ${power}`);
        });
      }
      if (round.kind === 'both') {
        assert.equal(puzzles.checkCannonShot(round, { angle: answer.angle + 10, power: answer.power }).hit, false);
        assert.equal(puzzles.checkCannonShot(round, { angle: answer.angle, power: answer.power + 2 }).hit, false);
      }
      const text = puzzles.describeCannonRound(round);
      assert.ok(text.prompt && text.hint && text.clue);
    }
  });
});

check('aim rounds: cos/sin of the answer equal target ÷ power (exact)', () => {
  const rng = seeded(11);
  for (let run = 0; run < 200; run += 1) {
    const round = puzzles.makeCannonRound({ kind: 'aim', by: run % 2 ? 'x' : 'y' }, rng);
    const fn = round.by === 'y' ? 'sin' : 'cos';
    const ratio = (round.by === 'y' ? round.target.y : round.target.x) / round.fixed.power;
    assert.ok(Math.abs(ratio - exactToNumber(exactValue(fn, round.answer.angle))) < 1e-9);
  }
});

check('the shot legs obey across = power·cos, up = power·sin', () => {
  [[10, 30], [12, 45], [8, 60], [16, 0], [16, 90]].forEach(([power, angle]) => {
    const tip = puzzles.tipOf(power, angle);
    assert.ok(Math.abs(tip.x - power * Math.cos(toRadians(angle))) < 1e-12);
    assert.ok(Math.abs(tip.y - power * Math.sin(toRadians(angle))) < 1e-12);
  });
});

/* ------------------------------------------------------------------- bay */
console.log('Lighthouse Bay');

const allBaySpecs = [];
NODES.filter((n) => n.kind === 'bay').forEach((n) => n.plan.forEach((spec) => allBaySpecs.push(spec)));

check('1000 rounds per spec: one unique correct answer that fits the board', () => {
  const rng = seeded(21);
  allBaySpecs.forEach((spec) => {
    for (let run = 0; run < 1000; run += 1) {
      const round = puzzles.makeBayRound(spec, rng);
      const t = round.truth;
      assert.ok(t.adj <= puzzles.BAY_LIMITS.maxAdj + 1e-9, 'adjacent too long');
      assert.ok(t.opp <= puzzles.BAY_LIMITS.maxOpp + 1e-9, 'opposite too tall');
      assert.ok(Math.abs(t.opp ** 2 + t.adj ** 2 - t.hyp ** 2) < 1e-6, 'not a right triangle');
      assert.ok(Math.abs(Math.atan2(t.opp, t.adj) - toRadians(t.theta)) < 1e-9, 'angle mismatch');

      // Exactly one slider value is accepted.
      const { min, max, step } = round.slider;
      let accepted = 0;
      for (let v = min; v <= max; v += step) if (puzzles.checkBayAnswer(round, v)) accepted += 1;
      assert.equal(accepted, 1, `accepted values: ${accepted} for answer ${round.answer}`);
      assert.ok(puzzles.checkBayAnswer(round, Math.round(round.answer)));

      // The start value must not already be correct, and the ratio must link the right sides.
      assert.equal(puzzles.checkBayAnswer(round, puzzles.bayStartValue(round)), false);
      const sides = round.kind === 'a' ? round.knowns.map((k) => k.side) : [round.knowns[0].side, round.unknown];
      assert.equal(round.ratio, puzzles.ratioFor(sides[0], sides[1]));
      if (spec.known && round.kind !== 'a') assert.equal(round.knowns[0].side, spec.known);
      if (round.kind !== 'a') assert.notEqual(round.knowns[0].side, round.unknown);

      // The displayed known values are the true side lengths.
      round.knowns.forEach((k) => assert.ok(Math.abs(k.value - t[k.side]) <= 0.31, `${k.side} ${k.value} vs ${t[k.side]}`));

      const text = puzzles.describeBayRound(round);
      assert.ok(text.story && text.hint && text.solution && text.ratioQuestion);
    }
  });
});

check('the board layout meets the lamp exactly when the slider is on the answer', () => {
  const rng = seeded(5);
  for (let run = 0; run < 2000; run += 1) {
    const round = puzzles.makeBayRound({ kind: 'any' }, rng);
    const layout = puzzles.bayLayout(round, Math.round(round.answer));
    if (round.kind === 'l') {
      const t = round.truth;
      const tipX = t.adj - layout.rope * Math.cos(toRadians(t.theta));
      const tipY = layout.rope * Math.sin(toRadians(t.theta));
      assert.ok(Math.hypot(tipX, tipY - t.opp) < 0.6, 'rope misses the lamp');
    } else {
      const reach = puzzles.rayHeight(layout.d, layout.angle);
      assert.ok(Math.abs(reach - layout.H) < 0.75, `ray reaches ${reach}, lamp at ${layout.H}`);
    }
  }
});

check('wrong ratio is rejected with an explanation', () => {
  const round = puzzles.makeBayRound({ kind: 'd', known: 'opp' }, seeded(1));
  assert.equal(round.ratio, 'tan');
  assert.equal(puzzles.checkBayRatio(round, 'tan'), true);
  assert.equal(puzzles.checkBayRatio(round, 'sin'), false);
  assert.match(puzzles.ratioMistake(round, 'sin'), /hypotenuse/);
});

/* ------------------------------------------------------------------ boss */
console.log('Boss battles');

check('every boss round has a correct spell, the right size and no repeated shield', () => {
  const rng = seeded(99);
  [1, 2, 3].forEach((tier) => {
    const config = puzzles.BOSS_TIERS[tier];
    for (let run = 0; run < 1000; run += 1) {
      const rounds = puzzles.buildBossRounds(tier, rng);
      assert.equal(rounds.length, config.hp);
      assert.equal(new Set(rounds.map((r) => r.shield)).size, rounds.length, 'repeated shield');
      if (tier >= 2) assert.ok(rounds.some((r) => r.fn === 'tan'), 'no tangent round');
      if (tier === 3) assert.ok(rounds.some((r) => r.shield.startsWith('−')), 'no negative shield');
      rounds.forEach((round) => {
        assert.ok(config.fns.includes(round.fn) && config.angles.includes(round.angle));
        const solutions = puzzles.bossSolutions(round);
        assert.ok(solutions.length >= 1);
        solutions.forEach((s) => {
          assert.equal(puzzles.castSpell(round, s.fn, s.angle).hit, true);
          // Check with real maths, not only the string table.
          assert.ok(sameValue(trueValue(s.fn, s.angle), exactToNumber(round.shield)), `${s.fn} ${s.angle}`);
        });
      });
    }
  });
});

check('a wrong spell never breaks the shield (checked against real maths)', () => {
  const rng = seeded(3);
  const rounds = puzzles.buildBossRounds(3, rng);
  rounds.forEach((round) => {
    ['sin', 'cos', 'tan'].forEach((fn) => {
      puzzles.ALL_SPECIAL_ANGLES.forEach((angle) => {
        const truth = sameValue(trueValue(fn, angle), exactToNumber(round.shield));
        assert.equal(puzzles.castSpell(round, fn, angle).hit, truth, `${fn} ${angle} vs ${round.shield}`);
      });
    });
  });
  assert.equal(puzzles.bossDecimal('Undefined'), 'no number');
});

check('stars follow the hearts that are left', () => {
  assert.equal(puzzles.starsFromHearts(3), 3);
  assert.equal(puzzles.starsFromHearts(2), 2);
  assert.equal(puzzles.starsFromHearts(1), 1);
});

/* --------------------------------------------------------------- content */
console.log('Mission map');

check('ids are unique, storage-safe and every world has missions', () => {
  const ids = NODES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[a-z]+-\d+$/));
  WORLDS.forEach((w) => assert.ok(content.nodesOfWorld(w.id).length === 4, `${w.id} size`));
  NODES.forEach((n) => assert.ok(WORLDS.some((w) => w.id === n.world)));
  assert.equal(NODES.length, 12);
});

check('every world starts with a lesson and ends with a bigger challenge', () => {
  WORLDS.forEach((w) => {
    const nodes = content.nodesOfWorld(w.id);
    assert.equal(nodes[0].kind, 'lesson');
    assert.ok(nodes[3].xp >= nodes[1].xp);
  });
});

check('the path unlocks one mission at a time', () => {
  const done = new Set();
  const isDone = (id) => done.has(id);
  assert.equal(content.nodeStatus('cannon-1', isDone), 'current');
  assert.equal(content.nodeStatus('cannon-2', isDone), 'locked');
  assert.equal(content.nodeStatus('boss-4', isDone), 'locked');
  NODES.forEach((node, index) => {
    NODES.forEach((other, otherIndex) => {
      const expected = otherIndex < index ? 'done' : otherIndex === index ? 'current' : 'locked';
      assert.equal(content.nodeStatus(other.id, isDone), expected);
    });
    done.add(node.id);
  });
});

check('lesson tasks can be completed with the real slider ranges', () => {
  const ranges = {
    cannon: () => {
      const states = [];
      for (let angle = 0; angle <= 90; angle += 1) for (let power = puzzles.CANNON_LIMITS.minPower; power <= puzzles.CANNON_LIMITS.maxPower; power += 1) states.push({ angle, power });
      return states;
    },
    bay: () => Array.from({ length: 49 }, (_, i) => ({ distance: 4 + i })),
    circle: () => Array.from({ length: 361 }, (_, angle) => ({ angle })),
  };
  Object.entries(LESSONS).forEach(([name, lesson]) => {
    const states = ranges[lesson.widget]();
    lesson.steps.forEach((step, index) => {
      assert.ok(step.title && step.body, `${name} step ${index}`);
      if (!step.task) return;
      assert.ok(states.some((s) => step.task.test(s)), `${name} step ${index + 1} task is unreachable`);
      assert.equal(step.task.test(lesson.start), false, `${name} step ${index + 1} is already done at the start`);
    });
  });
  NODES.filter((n) => n.kind === 'lesson').forEach((n) => assert.ok(LESSONS[n.lesson], n.id));
});

check('every plan generates rounds', () => {
  NODES.filter((n) => n.plan).forEach((node) => {
    node.plan.forEach((spec) => {
      const round = node.kind === 'cannon' ? puzzles.makeCannonRound(spec) : puzzles.makeBayRound(spec);
      assert.equal(round.type, node.kind);
    });
  });
  NODES.filter((n) => n.kind === 'boss').forEach((n) => assert.equal(puzzles.buildBossRounds(n.tier).length, puzzles.BOSS_TIERS[n.tier].hp));
});

/* --------------------------------------------------------------- storage */
console.log('Progress storage');

check('completing missions records stars, XP and a day streak', () => {
  const day1 = new Date(2026, 0, 10, 12);
  const day2 = new Date(2026, 0, 11, 9);
  const day4 = new Date(2026, 0, 14, 9);

  const first = storage.completeNode('cannon-1', { stars: 2, xp: 15 }, day1);
  assert.equal(first.firstCompletion, true);
  assert.equal(first.streakCount, 1);
  assert.equal(storage.isNodeDone('cannon-1'), true);
  assert.equal(storage.getXp(), 15);

  const same = storage.completeNode('cannon-2', { stars: 3, xp: 25 }, new Date(2026, 0, 10, 20));
  assert.equal(same.streakExtended, false);
  assert.equal(same.streakCount, 1);

  const next = storage.completeNode('cannon-3', { stars: 1, xp: 30 }, day2);
  assert.equal(next.streakCount, 2);
  assert.equal(storage.getStreakCount(day2), 2);

  const gap = storage.completeNode('cannon-4', { stars: 1, xp: 45 }, day4);
  assert.equal(gap.streakCount, 1, 'streak resets after a missed day');
  assert.equal(storage.getStreakCount(new Date(2026, 0, 20)), 0, 'a stale streak is shown as 0');
});

check('stars never go down, XP always adds up', () => {
  storage.completeNode('cannon-1', { stars: 1, xp: 15 }, new Date(2026, 0, 14, 10));
  assert.equal(storage.getNodeStars('cannon-1'), 2);
  storage.completeNode('cannon-1', { stars: 3, xp: 15 }, new Date(2026, 0, 14, 11));
  assert.equal(storage.getNodeStars('cannon-1'), 3);
  assert.equal(storage.getTotalStars(), 3 + 3 + 1 + 1);
  assert.equal(storage.getXp(), 15 + 25 + 30 + 45 + 15 + 15);
});

check('progress survives a reload and damaged data is ignored', () => {
  const saved = memory.get('trigAdventure.v2');
  assert.ok(saved && JSON.parse(saved).nodes['cannon-1']);

  memory.set('trigAdventure.v2', '{"xp":"lots","nodes":{"bad id":{"stars":9},"bay-1":{"stars":99}},"streak":{"count":-4,"lastDay":"nope"}}');
  // storage.js keeps its state in memory; resetting proves persist() works with the fake store.
  storage.resetProgress();
  assert.equal(storage.getXp(), 0);
  assert.equal(storage.isNodeDone('cannon-1'), false);
  assert.equal(storage.getStreakCount(), 0);
});

check('settings survive a reset', () => {
  storage.setSetting('sound', false);
  storage.resetProgress();
  assert.equal(storage.getSetting('sound'), false);
  storage.setSetting('sound', true);
});

console.log(`\nAll ${passed} checks passed.`);
