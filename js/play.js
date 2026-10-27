/**
 * play.js
 * The mission screen. One screen, four kinds of missions:
 *   lesson (hands-on steps)  ·  Crystal Cannon  ·  Lighthouse Bay  ·  boss battle
 * Rules and maths live in puzzles.js / content.js; the pictures live in boards.js.
 * This file connects them to the DOM: sliders, buttons, hearts, feedback.
 */

import {
  NODE_BY_ID,
  LESSONS,
} from './content.js';
import {
  ALL_SPECIAL_ANGLES,
  BOSS_TIERS,
  RATIOS,
  SIDE_NAMES,
  STARTING_HEARTS,
  bayLayout,
  bayStartValue,
  bossDecimal,
  bossHitMessage,
  bossMissMessage,
  buildBossRounds,
  castSpell,
  checkBayAnswer,
  checkBayRatio,
  checkCannonShot,
  describeBayRound,
  describeCannonRound,
  makeBayRound,
  makeCannonRound,
  ratioDefinition,
  ratioMistake,
  starsFromHearts,
  bayUnitLabel,
  fmt1,
  fmt2,
} from './puzzles.js';
import { createBayBoard, createBossScene, createCannonBoard, createCircleBoard } from './boards.js';
import { degreesToPiText, exactOrNull, exactToNumber, toRadians, UNDEFINED } from './trig.js';
import { renderMath } from './mathfmt.js';
import { announce, closeDialog, openDialog, registerScreen, showScreen } from './ui.js';
import { sounds } from './audio.js';
import { burst, clearFx } from './fx.js';
import { feedbackIn, heartLost, heartsReset, popIn, progressTo, shake } from './motion.js';

const $ = (id) => document.getElementById(id);

let onFinish = () => {};
let session = null;
let sliderCounter = 0;

export const isPlaying = () => session !== null;
/** For automated browser tests only: the running mission and its current round. */
export const debugSession = () => session;

/* ================================================================= UI parts */

function createSlider({ label, min, max, step = 1, value, format = (v) => String(v), onInput }) {
  sliderCounter += 1;
  const id = `ctl-${sliderCounter}`;
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  wrap.innerHTML = `
    <label for="${id}">${label}: <output for="${id}"></output></label>
    <div class="ctl-row">
      <button type="button" class="nudge" aria-label="Decrease ${label}">−</button>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" />
      <button type="button" class="nudge" aria-label="Increase ${label}">+</button>
    </div>`;
  const input = wrap.querySelector('input');
  const output = wrap.querySelector('output');
  const [minus, plus] = wrap.querySelectorAll('.nudge');

  const read = () => Number(input.value);
  const show = () => {
    output.textContent = format(read());
    input.setAttribute('aria-valuetext', format(read()));
  };
  const change = () => {
    show();
    onInput?.(read());
  };
  input.addEventListener('input', change);
  minus.addEventListener('click', () => { input.stepDown(); change(); });
  plus.addEventListener('click', () => { input.stepUp(); change(); });
  show();

  return {
    el: wrap,
    get: read,
    set(v) {
      input.value = String(v);
      show();
    },
    setDisabled(disabled) {
      input.disabled = disabled;
      minus.disabled = disabled;
      plus.disabled = disabled;
      wrap.classList.toggle('is-locked', disabled);
    },
  };
}

function lockedChip(text) {
  const chip = document.createElement('p');
  chip.className = 'chip chip-locked';
  chip.textContent = text;
  return chip;
}

const parts = {
  eyebrow: (text) => { $('play-eyebrow').textContent = text; },
  heading: (text) => { $('play-heading').textContent = text; },
  body: (html) => { $('play-body').innerHTML = html; },
  bodyText: (text) => { $('play-body').textContent = text; },
  controls: () => $('play-controls'),
  readout: () => $('play-readout'),
};

function setClue(text) {
  const clue = $('play-clue');
  clue.hidden = !text;
  clue.textContent = text || '';
}

function setTask(task, done = false) {
  const box = $('play-task');
  box.hidden = !task;
  box.classList.toggle('is-done', done);
  if (task) $('play-task-text').textContent = task;
}

function setHint(text) {
  const button = $('play-hint');
  const box = $('play-hint-box');
  session.hintText = text;
  button.hidden = !text;
  box.hidden = true;
  box.textContent = '';
  button.setAttribute('aria-expanded', 'false');
}

function showHint(open = true) {
  const box = $('play-hint-box');
  if (!session.hintText) return;
  box.textContent = session.hintText;
  box.hidden = !open;
  $('play-hint').setAttribute('aria-expanded', String(open));
}

function showFeedback(kind, title, text) {
  const box = $('play-feedback');
  box.hidden = false;
  box.classList.toggle('is-correct', kind === 'correct');
  box.classList.toggle('is-wrong', kind === 'wrong');
  $('play-feedback-title').textContent = title;
  $('play-feedback-text').textContent = text;
  feedbackIn(box);
  announce(`${title} ${text}`);
}

function hideFeedback() {
  $('play-feedback').hidden = true;
}

function setPrimary(label, action, { disabled = false } = {}) {
  const button = $('play-primary');
  button.textContent = label;
  button.disabled = disabled;
  session.primaryAction = action;
}

function setProgress(done, total, text) {
  const track = $('play-progress');
  track.setAttribute('aria-valuemax', String(total));
  track.setAttribute('aria-valuenow', String(done));
  track.setAttribute('aria-valuetext', text);
  progressTo($('play-progress-fill'), total ? done / total : 0);
}

function updateHearts(lostIndex = -1) {
  const hearts = [...$('play-hearts').querySelectorAll('.heart')];
  hearts.forEach((heart, index) => heart.classList.toggle('is-lost', index >= session.hearts));
  if (lostIndex >= 0 && hearts[lostIndex]) heartLost(hearts[lostIndex]);
  $('play-hearts').setAttribute('aria-label', `${session.hearts} ${session.hearts === 1 ? 'heart' : 'hearts'} left`);
}

/** Takes a heart. Returns true when the player is out of hearts. */
function loseHeart() {
  session.hearts = Math.max(0, session.hearts - 1);
  session.mistakes += 1;
  updateHearts(session.hearts);
  return session.hearts === 0;
}

function clearStage() {
  session.cleanups.forEach((fn) => fn());
  session.cleanups = [];
  $('play-stage').textContent = '';
}

function clearPanel() {
  parts.controls().textContent = '';
  parts.readout().textContent = '';
  hideFeedback();
  setClue('');
  setTask(null);
  setHint('');
  $('play-sheet').hidden = false;
}

function readoutLines(lines) {
  const box = parts.readout();
  box.textContent = '';
  lines.forEach((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    box.appendChild(p);
  });
}

function gameOverSoon() {
  session.finished = true;
  setPrimary('…', null, { disabled: true });
  setTimeout(() => {
    if (session && session.finished) finish(false);
  }, 1300);
}

function complete() {
  session.finished = true;
  finish(true);
}

function finish(completed) {
  const { node, hearts, kind } = session;
  const stars = completed ? (kind === 'lesson' ? 3 : starsFromHearts(hearts)) : 0;
  const xp = completed ? node.xp + (kind === 'lesson' ? 0 : stars * 5) : 0;
  const outcome = { node, completed, hearts, stars, xp, mistakes: session.mistakes };
  endSession();
  onFinish(outcome);
}

function endSession() {
  if (!session) return;
  session.cleanups.forEach((fn) => fn());
  session = null;
  $('play-stage').textContent = '';
}

/* ================================================================== LESSONS */

function startLesson(node) {
  const lesson = LESSONS[node.lesson];
  const state = { ...lesson.start };
  const total = lesson.steps.length;
  let step = 0;
  let board = null;
  let sliders = {};

  const stage = $('play-stage');
  $('play-hearts').hidden = true;

  const readFor = {
    cannon() {
      const r = toRadians(state.angle);
      const cos = Math.cos(r);
      const sin = Math.sin(r);
      readoutLines([
        `across = power × cos θ = ${state.power} × ${fmt2(cos)} = ${fmt1(state.power * cos)}`,
        `up = power × sin θ = ${state.power} × ${fmt2(sin)} = ${fmt1(state.power * sin)}`,
      ]);
    },
    bay() {
      const H = 20;
      const d = state.distance;
      const hyp = Math.hypot(H, d);
      const theta = (Math.atan2(H, d) * 180) / Math.PI;
      const highlight = lesson.steps[step].highlight;
      const lines = [`θ ≈ ${theta.toFixed(1)}°   ·   opposite ${H} m, adjacent ${d} m, hypotenuse ${fmt1(hyp)} m`];
      const ratios = {
        sin: `sin θ = opposite ÷ hypotenuse = ${H} ÷ ${fmt1(hyp)} = ${fmt2(H / hyp)}`,
        cos: `cos θ = adjacent ÷ hypotenuse = ${d} ÷ ${fmt1(hyp)} = ${fmt2(d / hyp)}`,
        tan: `tan θ = opposite ÷ adjacent = ${H} ÷ ${d} = ${fmt2(H / d)}`,
      };
      if (highlight) lines.push(ratios[highlight]);
      else if (step >= total - 1) lines.push(ratios.sin, ratios.cos, ratios.tan);
      readoutLines(lines);
    },
    circle() {
      const a = state.angle;
      const r = toRadians(a);
      const exact = (fn) => exactOrNull(fn, a);
      const num = (fn) => {
        const value = fn === 'sin' ? Math.sin(r) : fn === 'cos' ? Math.cos(r) : Math.abs(Math.cos(r)) < 1e-9 ? NaN : Math.tan(r);
        return Number.isNaN(value) ? UNDEFINED : fmt2(value);
      };
      const line = (fn) => `${fn} θ = ${exact(fn) ? `${exact(fn)} ≈ ${num(fn)}` : num(fn)}`.replace('≈ Undefined', '').trim();
      readoutLines([`θ = ${a}° (${degreesToPiText(a)} radians)`, line('cos'), line('sin'), line('tan')]);
    },
  };

  const draw = {
    cannon() {
      board.set({ angle: state.angle, power: state.power, legs: true, target: null });
    },
    bay() {
      const H = 20;
      const d = state.distance;
      const angle = (Math.atan2(H, d) * 180) / Math.PI;
      const highlight = lesson.steps[step].highlight;
      board.set({
        H,
        d,
        angle,
        rope: null,
        highlight: highlight ?? null,
        labels: { opp: `opposite ${H} m`, adj: `adjacent ${d} m`, hyp: `hypotenuse ${fmt1(Math.hypot(H, d))} m`, theta: `θ ${angle.toFixed(0)}°` },
      });
    },
    circle() {
      const a = state.angle;
      const cos = exactOrNull('cos', a);
      const sin = exactOrNull('sin', a);
      const r = toRadians(a);
      board.set({
        angle: a,
        quadrant: step >= 4,
        focus: lesson.steps[step].title === 'Tangent' ? 'tan' : null,
        labels: {
          cos: cos ?? fmt2(Math.cos(r)),
          sin: sin ?? fmt2(Math.sin(r)),
          tan: Math.abs(Math.cos(r)) < 1e-9 ? null : exactOrNull('tan', a) ?? fmt2(Math.tan(r)),
        },
      });
    },
  };

  function refresh() {
    draw[lesson.widget]();
    readFor[lesson.widget]();
    checkTask();
  }

  function checkTask() {
    const task = lesson.steps[step].task;
    if (!task || session.taskDone) return;
    if (task.test(state)) {
      session.taskDone = true;
      setTask(task.text, true);
      $('play-task-result').innerHTML = lesson.steps[step].done;
      sounds.correct();
      const point = lesson.widget === 'cannon' ? board.tipPoint() : lesson.widget === 'circle' ? board.pointOnScreen() : board.lampPoint();
      if (point) burst(point.x, point.y, { color: '#34f0a1', count: 18 });
      $('play-primary').disabled = false;
      announce(`Done. ${lesson.steps[step].done.replace(/<[^>]+>/g, '')}`);
    }
  }

  function buildControls() {
    const holder = parts.controls();
    holder.textContent = '';
    sliders = {};
    if (lesson.controls.includes('angle')) {
      sliders.angle = createSlider({
        label: 'Angle θ',
        min: 0,
        max: lesson.widget === 'circle' ? 360 : 90,
        value: state.angle,
        format: (v) => `${v}°`,
        onInput: (v) => { state.angle = v; refresh(); },
      });
    }
    if (lesson.controls.includes('power')) {
      sliders.power = createSlider({
        label: 'Power',
        min: 2,
        max: 16,
        value: state.power,
        onInput: (v) => { state.power = v; refresh(); },
      });
    }
    if (lesson.controls.includes('distance')) {
      sliders.distance = createSlider({
        label: 'Ship distance',
        min: 6,
        max: 48,
        value: state.distance,
        format: (v) => `${v} m`,
        onInput: (v) => { state.distance = v; refresh(); },
      });
    }
    Object.values(sliders).forEach((slider) => holder.appendChild(slider.el));
  }

  function renderStep() {
    const current = lesson.steps[step];
    session.taskDone = false;
    parts.eyebrow(`Lesson · step ${step + 1} of ${total}`);
    parts.heading(current.title);
    parts.body(current.body);
    setProgress(step, total, `Step ${step + 1} of ${total}`);
    hideFeedback();
    $('play-task-result').textContent = '';
    setTask(current.task ? current.task.text : null, false);
    $('play-back').hidden = step === 0;
    const last = step === total - 1;
    setPrimary(last ? 'Finish lesson' : 'Next', () => {
      if (last) {
        setProgress(total, total, 'Lesson complete');
        complete();
      } else {
        step += 1;
        renderStep();
      }
    }, { disabled: Boolean(current.task) });
    refresh();
    $('play-heading').focus({ preventScroll: true });
  }

  board =
    lesson.widget === 'cannon'
      ? createCannonBoard(stage)
      : lesson.widget === 'bay'
        ? createBayBoard(stage)
        : createCircleBoard(stage, {
          onAngle: (angle) => {
            state.angle = angle;
            sliders.angle?.set(angle);
            refresh();
          },
        });
  session.cleanups.push(() => board.destroy());
  session.onBack = () => {
    if (step > 0) {
      step -= 1;
      renderStep();
    }
  };

  clearPanel();
  $('play-sheet').hidden = false;
  buildControls();
  renderStep();
}

/* ============================================================ CRYSTAL CANNON */

function startCannon(node) {
  const rounds = node.plan.map((spec) => makeCannonRound(spec));
  let index = 0;
  session.current = () => rounds[index];
  let board;
  let sliders = {};
  let busy = false;
  const state = { angle: 45, power: 8 };

  const stage = $('play-stage');
  board = createCannonBoard(stage);
  session.cleanups.push(() => board.destroy());
  $('play-hearts').hidden = false;

  function pickStart(round) {
    state.angle = round.fixed.angle ?? (round.answer.angle === 45 ? 20 : 45);
    state.power = round.fixed.power ?? (round.answer.power === 8 ? 6 : 8);
    if (round.kind === 'both' && Math.abs(state.angle - round.answer.angle) < 5) state.angle = 75;
  }

  function redraw() {
    const round = rounds[index];
    board.set({ angle: state.angle, power: state.power, target: round.target, reveal: round.reveal, by: round.by, legs: true });
    const r = toRadians(state.angle);
    readoutLines([
      `across = ${state.power} × cos ${state.angle}° = ${fmt1(state.power * Math.cos(r))}`,
      `up = ${state.power} × sin ${state.angle}° = ${fmt1(state.power * Math.sin(r))}`,
    ]);
  }

  function renderRound() {
    const round = rounds[index];
    const text = describeCannonRound(round);
    busy = false;
    session.roundDone = false;
    pickStart(round);
    board.resetShot();
    clearPanel();
    parts.eyebrow(`Round ${index + 1} of ${rounds.length}`);
    parts.heading(text.title);
    parts.bodyText(text.prompt);
    setClue(text.clue);
    setHint(text.hint);
    setProgress(index, rounds.length, `Round ${index + 1} of ${rounds.length}`);

    const holder = parts.controls();
    sliders = {};
    if (round.fixed.angle !== undefined) holder.appendChild(lockedChip(`Angle locked at ${round.fixed.angle}°`));
    else {
      sliders.angle = createSlider({ label: 'Angle θ', min: 0, max: 90, value: state.angle, format: (v) => `${v}°`, onInput: (v) => { state.angle = v; redraw(); } });
      holder.appendChild(sliders.angle.el);
    }
    if (round.fixed.power !== undefined) holder.appendChild(lockedChip(`Power locked at ${round.fixed.power}`));
    else {
      sliders.power = createSlider({ label: 'Power', min: 2, max: 16, value: state.power, onInput: (v) => { state.power = v; redraw(); } });
      holder.appendChild(sliders.power.el);
    }
    redraw();
    setPrimary('Fire!', fire);
  }

  async function fire() {
    if (busy || session.roundDone || session.finished) return;
    const round = rounds[index];
    busy = true;
    Object.values(sliders).forEach((s) => s.setDisabled(true));
    $('play-primary').disabled = true;
    hideFeedback();
    sounds.click();

    const result = checkCannonShot(round, state);
    await board.fire(result.hit);
    if (!session) return;

    if (result.hit) {
      session.roundDone = true;
      sounds.correct();
      const point = board.targetPoint() ?? board.tipPoint();
      burst(point.x, point.y, { color: '#ffc857', count: 34 });
      showFeedback('correct', 'Direct hit!', result.message);
      const last = index === rounds.length - 1;
      setProgress(index + 1, rounds.length, `${index + 1} of ${rounds.length} done`);
      setPrimary(last ? 'Finish mission' : 'Next round', () => {
        if (last) complete();
        else { index += 1; renderRound(); }
      });
      $('play-primary').focus();
    } else {
      sounds.wrong();
      shake($('play-stage'));
      const out = loseHeart();
      showFeedback('wrong', 'Missed!', result.message);
      showHint(true);
      if (out) { gameOverSoon(); return; }
      busy = false;
      Object.values(sliders).forEach((s) => s.setDisabled(false));
      $('play-primary').disabled = false;
    }
  }

  clearPanel();
  renderRound();
}

/* ============================================================ LIGHTHOUSE BAY */

function startBay(node) {
  const rounds = node.plan.map((spec) => makeBayRound(spec));
  let index = 0;
  session.current = () => rounds[index];
  let board;
  let slider = null;
  let value = 0;
  let phase = 'ratio';

  const stage = $('play-stage');
  board = createBayBoard(stage);
  session.cleanups.push(() => board.destroy());
  $('play-hearts').hidden = false;

  function draw(solved = false) {
    const round = rounds[index];
    const layout = bayLayout(round, value);
    const labels = {};
    round.knowns.forEach((k) => { labels[k.side] = `${SIDE_NAMES[k.side]} ${k.value} m`; });
    if (round.unknown !== 'angle') {
      const shown = solved ? `${fmt1(round.answer)} m` : phase === 'solve' ? bayUnitLabel(round, value) : '?';
      labels[round.unknown] = `${SIDE_NAMES[round.unknown]} ${shown}`;
    }
    labels.theta = round.kind === 'a' ? `θ ${phase === 'solve' || solved ? `${Math.round(value)}°` : '?'}` : `θ ${round.theta}°`;
    board.set({ ...layout, labels: null, highlight: null, glow: solved });
    board.set({ labels });
  }

  function renderRound() {
    const round = rounds[index];
    const text = describeBayRound(round);
    phase = 'ratio';
    session.roundDone = false;
    value = bayStartValue(round);
    clearPanel();
    parts.eyebrow(`Round ${index + 1} of ${rounds.length} · choose the tool`);
    parts.heading(round.kind === 'a' ? 'Find the angle' : `Find the ${round.unknown === 'adj' ? 'distance' : round.unknown === 'opp' ? 'height' : 'line of sight'}`);
    parts.bodyText(text.story);
    setProgress(index, rounds.length, `Round ${index + 1} of ${rounds.length}`);
    setHint('Look at the two sides that matter: the one you know and the one you want. SOH: sin uses opposite and hypotenuse. CAH: cos uses adjacent and hypotenuse. TOA: tan uses opposite and adjacent.');
    setPrimary('Choose a ratio first', null, { disabled: true });
    draw();

    const holder = parts.controls();
    const question = document.createElement('p');
    question.className = 'question';
    question.textContent = text.ratioQuestion;
    holder.appendChild(question);
    const group = document.createElement('div');
    group.className = 'ratio-choices';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Choose sine, cosine or tangent');
    Object.keys(RATIOS).forEach((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ratio-choice';
      button.innerHTML = `<strong>${name}</strong><span>${RATIOS[name].word} · ${SIDE_NAMES[RATIOS[name].top]} ÷ ${SIDE_NAMES[RATIOS[name].bottom]}</span>`;
      button.addEventListener('click', () => chooseRatio(name, button, group));
      group.appendChild(button);
    });
    holder.appendChild(group);
  }

  function chooseRatio(name, button, group) {
    if (phase !== 'ratio' || session.finished) return;
    const round = rounds[index];
    if (checkBayRatio(round, name)) {
      sounds.correct();
      [...group.children].forEach((b) => { b.disabled = true; });
      button.classList.add('is-right');
      showFeedback('correct', 'Right tool!', `${ratioDefinition(name)}. Now use it.`);
      startSolve();
    } else {
      sounds.wrong();
      button.disabled = true;
      button.classList.add('is-wrong');
      shake(group);
      const out = loseHeart();
      showFeedback('wrong', 'Not that one', ratioMistake(round, name));
      showHint(true);
      if (out) gameOverSoon();
    }
  }

  function startSolve() {
    const round = rounds[index];
    phase = 'solve';
    const holder = parts.controls();
    const prompt = {
      d: 'Slide the ship until the line of sight touches the lamp.',
      h: 'Raise the tower until its lamp touches the line of sight.',
      l: 'Let out the rope until its end touches the lamp.',
      a: 'Turn the line of sight until it touches the lamp.',
    }[round.kind];
    parts.eyebrow(`Round ${index + 1} of ${rounds.length} · solve it`);
    const question = document.createElement('p');
    question.className = 'question';
    question.textContent = prompt;
    holder.appendChild(question);
    const label = { d: 'Ship distance', h: 'Tower height', l: 'Line of sight', a: 'Angle θ' }[round.kind];
    slider = createSlider({
      label,
      min: round.slider.min,
      max: round.slider.max,
      step: round.slider.step,
      value,
      format: (v) => (round.kind === 'a' ? `${v}°` : `${v} m`),
      onInput: (v) => { value = v; draw(); },
    });
    holder.appendChild(slider.el);
    setHint(describeBayRound(round).hint);
    draw();
    setPrimary('Lock it in', lockIn);
  }

  function lockIn() {
    if (phase !== 'solve' || session.finished) return;
    const round = rounds[index];
    const text = describeBayRound(round);
    if (checkBayAnswer(round, value)) {
      phase = 'done';
      session.roundDone = true;
      slider.setDisabled(true);
      sounds.correct();
      draw(true);
      const point = board.lampPoint();
      burst(point.x, point.y, { color: '#ffc857', count: 34 });
      showFeedback('correct', 'The lamp shines!', text.solution);
      const last = index === rounds.length - 1;
      setProgress(index + 1, rounds.length, `${index + 1} of ${rounds.length} done`);
      setPrimary(last ? 'Finish mission' : 'Next round', () => {
        if (last) complete();
        else { index += 1; renderRound(); }
      });
      $('play-primary').focus();
    } else {
      sounds.wrong();
      shake($('play-stage'));
      const out = loseHeart();
      const words = { d: ['too close', 'too far'], h: ['too short', 'too tall'], l: ['too short', 'too long'], a: ['too small', 'too big'] }[round.kind];
      showFeedback('wrong', 'Not quite', `That is ${value < round.answer ? words[0] : words[1]}. Use the formula in the hint to work it out.`);
      showHint(true);
      if (out) gameOverSoon();
    }
  }

  clearPanel();
  renderRound();
}

/* ================================================================= BOSS FIGHT */

function startBoss(node) {
  const tier = node.tier;
  const config = BOSS_TIERS[tier];
  const rounds = buildBossRounds(tier);
  let index = 0;
  session.current = () => rounds[index];
  let fn = config.fns[0];
  let angleIndex = Math.floor(config.angles.length / 3);
  let busy = false;

  const stage = $('play-stage');
  const hpBar = document.createElement('div');
  hpBar.id = 'boss-hp';
  hpBar.className = 'hp-bar';
  hpBar.setAttribute('role', 'img');
  stage.appendChild(hpBar);
  const scene = createBossScene(stage, tier);
  const board = createCircleBoard(stage);
  session.cleanups.push(() => scene.destroy(), () => board.destroy());
  $('play-hearts').hidden = false;

  const angle = () => config.angles[angleIndex];

  function previewData() {
    const a = angle();
    const sin = exactOrNull('sin', a);
    const cos = exactOrNull('cos', a);
    const tan = exactOrNull('tan', a);
    const r = toRadians(a);
    const dec = (fnName) => {
      const exact = exactOrNull(fnName, a);
      return exact === UNDEFINED ? 'undefined' : fmt2(exactToNumber(exact));
    };
    if (config.preview === 'exact') return { cos, sin, tan, line: `${fn} ${a}° = ${exactOrNull(fn, a)}` };
    if (config.preview === 'decimal') return { cos: fmt2(Math.cos(r)), sin: fmt2(Math.sin(r)), tan: dec('tan'), line: `${fn} ${a}° ≈ ${dec(fn)}` };
    return { cos: null, sin: null, tan: null, line: `${fn} ${a}° = ?   (no preview here: remember the table!)` };
  }

  function redraw() {
    const data = previewData();
    board.set({
      angle: angle(),
      quadrant: tier === 3,
      focus: fn,
      labels: { cos: data.cos ?? null, sin: data.sin ?? null, tan: data.tan ?? null },
    });
    readoutLines([data.line]);
    document.querySelectorAll('.spell').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.fn === fn)));
  }

  function renderHp() {
    const hp = $('boss-hp');
    hp.textContent = '';
    for (let i = 0; i < rounds.length; i += 1) {
      const pip = document.createElement('span');
      pip.className = `hp-pip${i < index ? ' is-gone' : ''}`;
      hp.appendChild(pip);
    }
    hp.setAttribute('aria-label', `Boss health: ${rounds.length - index} of ${rounds.length}`);
  }

  function renderRound() {
    const round = rounds[index];
    busy = false;
    session.roundDone = false;
    clearPanel();
    scene.shieldUp();
    parts.eyebrow(`${config.name} · shield ${index + 1} of ${rounds.length}`);
    parts.heading('Break the shield');
    parts.bodyText('');
    setHint(`Find a spell whose value is ${round.shield}. ${tier === 1 ? 'Look at the unit circle: cos is the across line, sin is the up line.' : 'Open the cheat sheet to look up the values.'}`);
    setProgress(index, rounds.length, `Shield ${index + 1} of ${rounds.length}`);
    renderHp();

    const body = $('play-body');
    body.innerHTML = '<div class="shield-card"><span class="shield-label">Shield value</span><strong class="shield-value"></strong><span class="shield-decimal"></span></div>';
    renderMath(body.querySelector('.shield-value'), round.shield);
    body.querySelector('.shield-decimal').textContent = round.shield === UNDEFINED ? '' : `≈ ${bossDecimal(round.shield)}`;
    body.querySelector('.shield-card').setAttribute('aria-label', `Shield value ${round.shield}`);

    const holder = parts.controls();
    const spells = document.createElement('div');
    spells.className = 'spell-row';
    spells.setAttribute('role', 'group');
    spells.setAttribute('aria-label', 'Choose a spell');
    config.fns.forEach((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spell';
      button.dataset.fn = name;
      button.textContent = name;
      button.setAttribute('aria-pressed', String(name === fn));
      button.addEventListener('click', () => { if (busy) return; fn = name; sounds.click(); redraw(); });
      spells.appendChild(button);
    });
    holder.appendChild(spells);

    const slider = createSlider({
      label: 'Angle',
      min: 0,
      max: config.angles.length - 1,
      value: angleIndex,
      format: (i) => {
        const a = config.angles[i];
        return tier === 3 ? `${a}° (${degreesToPiText(a)})` : `${a}°`;
      },
      onInput: (i) => { angleIndex = i; redraw(); },
    });
    session.bossSlider = slider;
    holder.appendChild(slider.el);
    redraw();
    setPrimary('Cast spell!', cast);
  }

  async function cast() {
    if (busy || session.roundDone || session.finished) return;
    const round = rounds[index];
    const a = angle();
    const result = castSpell(round, fn, a);
    busy = true;
    sounds.click();

    if (result.hit) {
      session.roundDone = true;
      session.bossSlider.setDisabled(true);
      scene.hit();
      scene.shieldBreak();
      sounds.correct();
      const point = scene.point();
      burst(point.x, point.y, { color: '#ff4fd8', count: 40 });
      index += 1;
      renderHp();
      setProgress(index, rounds.length, `${index} of ${rounds.length} shields broken`);
      const last = index === rounds.length;
      showFeedback('correct', last ? 'Final blow!' : 'Shield broken!', bossHitMessage(round, fn, a));
      if (last) scene.defeat();
      setPrimary(last ? 'Claim victory' : 'Next shield', () => {
        if (last) complete();
        else renderRound();
      });
      $('play-primary').focus();
    } else {
      scene.attack();
      sounds.wrong();
      shake($('play-stage'));
      const out = loseHeart();
      showFeedback('wrong', 'The shield holds!', bossMissMessage(round, fn, a, result.value));
      showHint(true);
      if (out) { gameOverSoon(); return; }
      busy = false;
    }
  }

  clearPanel();
  renderRound();
}

/* ================================================================ ENTRY POINTS */

export async function startNode(nodeId) {
  const node = NODE_BY_ID[nodeId];
  if (!node) return;
  endSession();
  clearFx();
  session = {
    node,
    kind: node.kind,
    hearts: STARTING_HEARTS,
    mistakes: 0,
    cleanups: [],
    primaryAction: null,
    hintText: '',
    finished: false,
    roundDone: false,
    taskDone: false,
    onBack: null,
  };
  $('play-stage').textContent = '';
  $('play-back').hidden = true;
  $('play-hearts').hidden = node.kind === 'lesson';
  updateHearts();
  heartsReset([...$('play-hearts').querySelectorAll('.heart')]);
  setProgress(0, 1, 'Starting');
  $('play-title').textContent = node.title;

  if (node.kind === 'lesson') startLesson(node);
  else if (node.kind === 'cannon') startCannon(node);
  else if (node.kind === 'bay') startBay(node);
  else startBoss(node);

  await showScreen('play', { force: true });
  popIn($('play-stage'));
}

export function requestExit() {
  if (!session) {
    showScreen('map');
    return;
  }
  openDialog('dialog-exit');
}

export function initPlay({ onFinish: finishHandler }) {
  onFinish = finishHandler;
  registerScreen('play', { afterHide: () => endSession() });

  $('play-primary').addEventListener('click', () => session?.primaryAction?.());
  $('play-hint').addEventListener('click', () => showHint($('play-hint-box').hidden));
  $('play-back').addEventListener('click', () => session?.onBack?.());
  $('play-exit').addEventListener('click', () => { sounds.click(); requestExit(); });
  $('play-sheet').addEventListener('click', () => { sounds.click(); openDialog('dialog-sheet'); });

  $('exit-stay').addEventListener('click', () => closeDialog('dialog-exit'));
  $('exit-leave').addEventListener('click', () => {
    closeDialog('dialog-exit');
    endSession();
    showScreen('map');
  });

  // Enter = the main button, unless the player is on another button or a dialog is open.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !session || $('screen-play').hidden) return;
    if (document.querySelector('dialog[open]')) return;
    const tag = event.target.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return;
    const primary = $('play-primary');
    if (!primary.disabled) {
      event.preventDefault();
      primary.click();
    }
  });

  buildCheatSheet();
}

function buildCheatSheet() {
  const body = $('sheet-body');
  body.textContent = '';
  ALL_SPECIAL_ANGLES.forEach((a) => {
    const row = document.createElement('tr');
    if (a <= 90) row.className = 'is-first-quadrant';
    const cells = [`${a}°`, exactOrNull('sin', a), exactOrNull('cos', a), exactOrNull('tan', a)];
    cells.forEach((text, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      cell.textContent = text;
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
}
