/**
 * game.js
 * Connects the QuizEngine (rules) to the screen: question rendering, timer ring,
 * hearts, score, feedback, pause dialog and keyboard shortcuts.
 *
 * Race-condition safety:
 *  - the timer is a single requestAnimationFrame loop that reads performance.now();
 *    the engine accepts exactly one resolution per question (answer OR timeout),
 *  - answer buttons are disabled after the first resolution,
 *  - the timer loop is cancelled before the feedback is shown.
 */

import { QuizEngine, CONFIG } from './engine.js';
import { buildQuestionSet, LEVEL_INFO } from './questions.js';
import { renderMath, toSpeech } from './mathfmt.js';
import { sounds } from './audio.js';
import { burst, clearFx } from './fx.js';
import {
  getCurrentScreen,
  isTransitioning,
  showScreen,
  openDialog,
  announce,
  isAnyDialogOpen,
  registerScreen,
} from './ui.js';
import {
  questionIn,
  staggerAnswers,
  feedbackIn,
  progressTo,
  countTo,
  scorePopup,
  heartLost,
  heartsReset,
  shake,
  pulse,
  prefersReducedMotion,
} from './motion.js';

const TIMER_CIRCUMFERENCE = 2 * Math.PI * 27;
const refs = {};

let engine = null;
let currentLevel = 0;
let frameId = 0;
let lastSecondShown = null;
let announcedSeconds = new Set();
let displayedScore = 0;
let pauseAction = 'resume'; // what happens when the pause dialog closes: resume | restart | quit
let pausedByDialog = false;
let onFinish = () => {};

const byId = (id) => document.getElementById(id);

/* ------------------------------------------------------------------- timer */

function resetTimerUi() {
  refs.timer.classList.remove('is-warning', 'is-danger');
  refs.timerFill.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
  refs.timerFill.style.strokeDashoffset = '0';
  refs.timerNumber.textContent = String(CONFIG.secondsPerQuestion);
  lastSecondShown = null;
  announcedSeconds = new Set();
}

function renderTimer(remainingMs) {
  const ratio = Math.max(0, Math.min(1, remainingMs / (CONFIG.secondsPerQuestion * 1000)));
  refs.timerFill.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - ratio));

  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds !== lastSecondShown) {
    lastSecondShown = seconds;
    refs.timerNumber.textContent = String(Math.max(0, seconds));
    refs.timer.classList.toggle('is-warning', seconds <= 10 && seconds > 5);
    refs.timer.classList.toggle('is-danger', seconds <= 5);
    if (seconds <= 5 && seconds > 0) sounds.tick();
    if ((seconds === 10 || seconds === 5) && !announcedSeconds.has(seconds)) {
      announcedSeconds.add(seconds);
      announce(`${seconds} seconds left`);
    }
  }
}

function stopTimerLoop() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
}

function timerTick() {
  frameId = 0;
  if (!engine || engine.status !== 'asking') return;

  const now = performance.now();
  const remaining = engine.remainingMs(now);
  renderTimer(remaining);

  if (remaining <= 0) {
    handleResult(engine.timeout(now));
    return;
  }
  frameId = requestAnimationFrame(timerTick);
}

function startTimerLoop() {
  stopTimerLoop();
  frameId = requestAnimationFrame(timerTick);
}

/* ------------------------------------------------------------------ HUD */

function setHearts(count) {
  refs.hearts.setAttribute('aria-label', `${Math.max(0, count)} ${count === 1 ? 'heart' : 'hearts'} left`);
}

function resetHud() {
  displayedScore = 0;
  refs.score.textContent = '0';
  heartsReset(refs.heartIcons);
  setHearts(CONFIG.startingHearts);
  refs.progressFill.style.transform = 'scaleX(0)';
  refs.progressTrack.setAttribute('aria-valuenow', '0');
  refs.feedback.hidden = true;
  resetTimerUi();
}

/* -------------------------------------------------------------- questions */

function renderAnswers(question) {
  refs.answers.textContent = '';
  const buttons = question.options.map((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `Answer ${index + 1}: ${toSpeech(option.text)}`);

    const key = document.createElement('span');
    key.className = 'answer-key';
    key.setAttribute('aria-hidden', 'true');
    key.textContent = String(index + 1);

    const text = document.createElement('span');
    text.className = 'answer-text';
    text.setAttribute('aria-hidden', 'true');
    renderMath(text, option.text);

    button.append(key, text);
    refs.answers.appendChild(button);
    return button;
  });
  return buttons;
}

function presentQuestion() {
  const question = engine.current;
  const info = LEVEL_INFO[currentLevel - 1];

  refs.levelLabel.textContent = `${currentLevel} · ${info.difficulty}`;
  refs.progressText.textContent = `Question ${engine.index + 1} of ${engine.total}`;
  refs.progressTrack.setAttribute('aria-valuenow', String(engine.index));
  refs.topic.textContent = question.topic;
  refs.questionText.textContent = question.prompt;
  refs.feedback.hidden = true;

  const buttons = renderAnswers(question);
  progressTo(refs.progressFill, engine.index / engine.total);
  questionIn(refs.questionCard);
  staggerAnswers(buttons);

  resetTimerUi();
  startTimerLoop();
  refs.questionText.focus({ preventScroll: true });
}

function submitAnswer(index) {
  if (!engine) return;
  handleResult(engine.answer(index, performance.now()));
}

/** The one place where an answer (or a timeout) changes the screen. */
function handleResult(result) {
  if (!result || !engine) return; // ignored by the engine (double click, late timeout ...)
  stopTimerLoop();

  const buttons = [...refs.answers.querySelectorAll('.answer')];
  buttons.forEach((button, index) => {
    button.setAttribute('aria-disabled', 'true');
    button.tabIndex = -1;
    if (index === result.correctIndex) button.classList.add('is-correct');
    else if (index === result.chosenIndex) button.classList.add('is-wrong');
    else button.classList.add('is-dim');
  });

  const correctButton = buttons[result.correctIndex];
  const chosenButton = buttons[result.chosenIndex];

  if (result.correct) {
    sounds.correct();
    const rect = correctButton.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { color: '#34f0a1', count: 30 });
    scorePopup(refs.popupAnchor, `+${result.scoreDelta}`);
    pulse(refs.score, 1.25);
  } else {
    if (result.timedOut) sounds.timeout();
    else sounds.wrong();
    if (chosenButton) {
      const rect = chosenButton.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { color: '#ff5a7a', count: 14 });
      shake(chosenButton);
    } else {
      shake(refs.questionCard);
    }
    heartLost(refs.heartIcons[Math.max(0, result.hearts)]);
    setHearts(result.hearts);
  }

  countTo(refs.score, result.score, { from: displayedScore, duration: 0.6 });
  displayedScore = result.score;
  progressTo(refs.progressFill, (engine.index + 1) / engine.total);
  refs.progressTrack.setAttribute('aria-valuenow', String(engine.index + 1));

  showFeedback(result);
}

const FEEDBACK_ICONS = { correct: '#icon-check', wrong: '#icon-close', timeout: '#icon-clock' };

function showFeedback(result) {
  const question = engine.current;
  refs.feedback.classList.remove('is-correct', 'is-wrong', 'is-timeout');
  refs.feedback.classList.add(`is-${result.kind}`);
  refs.feedbackIcon.innerHTML = `<svg viewBox="0 0 24 24"><use href="${FEEDBACK_ICONS[result.kind]}"></use></svg>`;

  if (result.correct) {
    refs.feedbackTitle.textContent = `Correct! +${result.scoreDelta} points`;
    refs.feedbackAnswer.hidden = true;
  } else {
    refs.feedbackTitle.textContent = result.timedOut ? "Time's up! You lose a heart." : 'Not quite. You lose a heart.';
    refs.feedbackAnswer.hidden = false;
    refs.feedbackAnswer.textContent = 'The correct answer is ';
    const value = document.createElement('span');
    renderMath(value, question.correctText);
    refs.feedbackAnswer.appendChild(value);
  }
  refs.feedbackExplanation.textContent = question.explanation;

  const endsRun = result.isLast || result.gameOver;
  refs.next.textContent = endsRun ? 'See results' : 'Next question';
  refs.feedback.hidden = false;
  feedbackIn(refs.feedback);

  announce(
    result.correct
      ? `Correct. ${question.explanation}`
      : `${result.timedOut ? "Time's up." : 'Incorrect.'} The correct answer is ${toSpeech(question.correctText)}. ${question.explanation}`,
  );

  refs.next.focus({ preventScroll: true });
  refs.feedback.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function advance() {
  if (!engine || engine.status !== 'feedback') return;
  const state = engine.next(performance.now());
  if (state === 'finished') {
    stopTimerLoop();
    onFinish({ level: currentLevel, summary: engine.summary() });
  } else {
    presentQuestion();
  }
}

/* ---------------------------------------------------------------- pause */

export function openPause() {
  if (!engine || getCurrentScreen() !== 'game' || isAnyDialogOpen()) return;
  pausedByDialog = engine.pause(performance.now());
  if (pausedByDialog) stopTimerLoop();
  pauseAction = 'resume';
  openDialog('dialog-pause');
}

function onPauseDialogClosed() {
  const action = pauseAction;
  pauseAction = 'resume';

  if (action === 'quit') {
    engine = null;
    stopTimerLoop();
    showScreen('levels');
    return;
  }
  if (action === 'restart') {
    startLevel(currentLevel);
    return;
  }
  if (pausedByDialog && engine) {
    engine.resume(performance.now());
    pausedByDialog = false;
    startTimerLoop();
  }
}

/* ---------------------------------------------------------------- entry */

export async function startLevel(level) {
  stopTimerLoop();
  clearFx(); // stop any confetti left over from the results screen
  currentLevel = level;
  engine = new QuizEngine(buildQuestionSet(level));
  pausedByDialog = false;
  resetHud();

  await showScreen('game', { force: true });
  // If the player navigated away while the screen was changing, do not start a hidden quiz.
  if (getCurrentScreen() !== 'game' || isTransitioning() || !engine) return;

  engine.start(performance.now());
  presentQuestion();
}

export function initGame({ onFinish: finishCallback }) {
  onFinish = finishCallback;

  Object.assign(refs, {
    levelLabel: byId('hud-level'),
    score: byId('hud-score'),
    popupAnchor: byId('score-popup-anchor'),
    hearts: byId('hud-hearts'),
    heartIcons: [...byId('hud-hearts').querySelectorAll('.heart')],
    timer: byId('hud-timer'),
    timerFill: byId('timer-fill'),
    timerNumber: byId('timer-number'),
    progressText: byId('progress-text'),
    progressTrack: document.querySelector('#screen-game .progress-track'),
    progressFill: byId('progress-fill'),
    topic: byId('question-topic'),
    questionCard: byId('question-card'),
    questionText: byId('question-text'),
    answers: byId('answers'),
    feedback: byId('feedback'),
    feedbackIcon: byId('feedback-icon'),
    feedbackTitle: byId('feedback-title'),
    feedbackAnswer: byId('feedback-answer'),
    feedbackExplanation: byId('feedback-explanation'),
    next: byId('btn-next'),
  });

  refs.answers.addEventListener('click', (event) => {
    const button = event.target.closest('.answer');
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    submitAnswer(Number(button.dataset.index));
  });

  refs.next.addEventListener('click', () => {
    sounds.click();
    advance();
  });

  byId('btn-pause').addEventListener('click', () => {
    sounds.click();
    openPause();
  });

  const pauseDialog = byId('dialog-pause');
  pauseDialog.addEventListener('close', onPauseDialogClosed);
  byId('pause-resume').addEventListener('click', () => {
    pauseAction = 'resume';
    pauseDialog.close();
  });
  byId('pause-restart').addEventListener('click', () => {
    pauseAction = 'restart';
    pauseDialog.close();
  });
  byId('pause-quit').addEventListener('click', () => {
    pauseAction = 'quit';
    pauseDialog.close();
  });

  document.addEventListener('keydown', (event) => {
    if (getCurrentScreen() !== 'game' || isAnyDialogOpen() || !engine) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (['1', '2', '3', '4'].includes(event.key) && engine.status === 'asking') {
      event.preventDefault();
      submitAnswer(Number(event.key) - 1);
    } else if (event.key === 'Enter' && engine.status === 'feedback' && !(document.activeElement instanceof HTMLButtonElement)) {
      event.preventDefault();
      advance();
    }
  });

  // Leaving the tab pauses the clock so nobody loses a heart unfairly.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && engine?.status === 'asking' && getCurrentScreen() === 'game') openPause();
  });

  registerScreen('game', { afterHide: stopTimerLoop });
}
