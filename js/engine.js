/**
 * engine.js
 * The quiz rules as a pure state machine (no DOM, no timers of its own).
 * The UI feeds it timestamps, so it is easy to test and free of timer race conditions:
 *
 *   ready -> asking -> feedback -> asking -> ... -> finished
 *                 \-> paused -/
 *
 * Only ONE transition out of "asking" is possible per question, so a question can never
 * be scored twice (double click, click + timeout, keyboard + click ...).
 */

export const CONFIG = Object.freeze({
  secondsPerQuestion: 20,
  startingHearts: 3,
  pointsPerCorrect: 10,
  passAccuracyPercent: 70,
});

/** 3 stars: 90%+, 2 stars: 80%+, 1 star: 70%+, otherwise 0. */
export function starsForAccuracy(accuracyPercent) {
  if (accuracyPercent >= 90) return 3;
  if (accuracyPercent >= 80) return 2;
  if (accuracyPercent >= CONFIG.passAccuracyPercent) return 1;
  return 0;
}

export class QuizEngine {
  constructor(questions, config = CONFIG) {
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('QuizEngine needs questions');
    this.questions = questions;
    this.config = config;
    this.status = 'ready';
    this.index = 0;
    this.score = 0;
    this.hearts = config.startingHearts;
    this.history = [];
    this.outcome = null; // 'completed' | 'gameover'
    this.deadline = 0;
    this.pausedRemainingMs = 0;
    this.questionStartedAt = 0;
  }

  get current() {
    return this.questions[this.index] || null;
  }

  get total() {
    return this.questions.length;
  }

  get isLastQuestion() {
    return this.index === this.total - 1;
  }

  /** Starts (or restarts) the quiz. */
  start(now) {
    this.status = 'asking';
    this.index = 0;
    this.score = 0;
    this.hearts = this.config.startingHearts;
    this.history = [];
    this.outcome = null;
    this.#beginQuestion(now);
  }

  #beginQuestion(now) {
    this.status = 'asking';
    this.questionStartedAt = now;
    this.deadline = now + this.config.secondsPerQuestion * 1000;
  }

  remainingMs(now) {
    if (this.status === 'paused') return this.pausedRemainingMs;
    if (this.status !== 'asking') return 0;
    return Math.max(0, this.deadline - now);
  }

  /** Player picked an option. Returns null when the click must be ignored. */
  answer(optionIndex, now) {
    if (this.status !== 'asking') return null; // already answered, paused or finished
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= this.current.options.length) return null;
    if (now > this.deadline) return this.timeout(now); // clicked after the buzzer
    return this.#resolve(optionIndex, false, now);
  }

  /** The timer ran out. Ignored unless the question is still open and the time is really up. */
  timeout(now) {
    if (this.status !== 'asking') return null;
    if (now < this.deadline) return null;
    return this.#resolve(-1, true, now);
  }

  #resolve(chosenIndex, timedOut, now) {
    const question = this.current;
    const correct = !timedOut && chosenIndex === question.correctIndex;

    if (correct) {
      this.score += this.config.pointsPerCorrect;
    } else {
      this.hearts -= 1;
    }
    this.status = 'feedback';

    this.history.push({
      question,
      chosenIndex,
      correct,
      timedOut,
      timeSpentMs: Math.min(now, this.deadline) - this.questionStartedAt,
    });

    const isLast = this.isLastQuestion;
    return {
      kind: correct ? 'correct' : timedOut ? 'timeout' : 'wrong',
      correct,
      timedOut,
      chosenIndex,
      correctIndex: question.correctIndex,
      scoreDelta: correct ? this.config.pointsPerCorrect : 0,
      score: this.score,
      hearts: this.hearts,
      isLast,
      // Zero hearts ends the run, unless that was the very last question (the level is then complete).
      gameOver: this.hearts <= 0 && !isLast,
    };
  }

  /** Moves on after the feedback. Returns 'asking' or 'finished'. */
  next(now) {
    if (this.status !== 'feedback') return this.status;
    const wentGameOver = this.hearts <= 0 && !this.isLastQuestion;

    if (wentGameOver || this.isLastQuestion) {
      this.status = 'finished';
      this.outcome = wentGameOver ? 'gameover' : 'completed';
      return 'finished';
    }
    this.index += 1;
    this.#beginQuestion(now);
    return 'asking';
  }

  pause(now) {
    if (this.status !== 'asking') return false;
    this.pausedRemainingMs = this.remainingMs(now);
    this.status = 'paused';
    return true;
  }

  resume(now) {
    if (this.status !== 'paused') return false;
    this.status = 'asking';
    this.deadline = now + this.pausedRemainingMs;
    return true;
  }

  /** Final numbers for the results screen. */
  summary() {
    const correctCount = this.history.filter((entry) => entry.correct).length;
    const accuracy = Math.round((correctCount / this.total) * 100);
    const completed = this.outcome === 'completed';
    const passed = completed && accuracy >= this.config.passAccuracyPercent;
    return {
      outcome: this.outcome,
      completed,
      passed,
      score: this.score,
      correctCount,
      wrongCount: this.history.length - correctCount,
      answeredCount: this.history.length,
      total: this.total,
      accuracy,
      stars: completed ? starsForAccuracy(accuracy) : 0,
      heartsLeft: Math.max(0, this.hearts),
      mistakes: this.history.filter((entry) => !entry.correct),
    };
  }
}
