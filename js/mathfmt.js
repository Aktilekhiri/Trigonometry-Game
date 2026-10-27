/**
 * mathfmt.js
 * Renders answer strings such as "√3/2" or "(−1/2, √3/2)" with KaTeX when it is available,
 * and falls back to plain Unicode text otherwise (for example when offline).
 */

const MINUS = '−';
// Matches "1/2", "−√3/2", "5√3", "2π/3", "π" ...
const VALUE_PATTERN = /^−?(?:\d*(?:√\d+|π)|\d+)(?:\/\d+)?$/;
const POINT_PATTERN = /^\((.+), (.+)\)$/;

function valueToTex(text) {
  const negative = text.startsWith(MINUS);
  const body = negative ? text.slice(1) : text;
  const [numerator, denominator] = body.split('/');
  const numeratorTex = numerator.replace(/√(\d+)/g, '\\sqrt{$1}').replace(/π/g, '\\pi');
  const tex = denominator ? `\\frac{${numeratorTex}}{${denominator}}` : numeratorTex;
  return negative ? `-${tex}` : tex;
}

/** Returns TeX for a supported string, or null when plain text is better. */
export function toTex(text) {
  if (VALUE_PATTERN.test(text)) return valueToTex(text);
  const point = POINT_PATTERN.exec(text);
  if (point && VALUE_PATTERN.test(point[1]) && VALUE_PATTERN.test(point[2])) {
    return `\\left(${valueToTex(point[1])},\\ ${valueToTex(point[2])}\\right)`;
  }
  return null;
}

/** Plain-language version used for aria-labels. */
export function toSpeech(text) {
  return text
    .replace(/−/g, 'minus ')
    .replace(/√(\d+)/g, 'square root of $1')
    .replace(/π/g, 'pi')
    .replace(/\//g, ' over ')
    .replace(/°/g, ' degrees')
    .replace(/²/g, ' squared')
    .replace(/θ/g, 'theta')
    .replace(/÷/g, ' divided by ')
    .replace(/×/g, ' times ');
}

export function renderMath(element, text) {
  const tex = toTex(text);
  if (tex && window.katex) {
    try {
      window.katex.render(tex, element, { throwOnError: false, displayMode: false });
      element.classList.add('has-math');
      return;
    } catch {
      /* fall through to plain text */
    }
  }
  element.classList.remove('has-math');
  element.textContent = text;
}
