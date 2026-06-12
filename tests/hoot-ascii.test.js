const { describe, it } = require('node:test');
const assert = require('node:assert');

const WIDTH = 11;
const FACE_CENTER_COL = 5;
const BROW_SLASH_L_COL = 3;
const BROW_L_COL = 4;
const THIRD_EYE_COL = 5;
const BROW_R_COL = 6;
const BROW_SLASH_R_COL = 7;
const EYE_L_PAREN_COL = 3;
const EYE_L_COL = 4;
const EYE_R_COL = 6;
const EYE_R_PAREN_COL = 7;
const BEAK_L_COL = 4;
const BEAK_GLYPH_COL = 5;
const BEAK_R_COL = 6;
const FACE_ANIM_BEAT_FRAMES = 4;
const CASCADE_TICK_MULT = 2;
const BEAK_CASCADE_LAG = 2;

function fixedFaceRow(slots, width = WIDTH) {
  const row = Array(width).fill(' ');
  for (const [col, ch] of Object.entries(slots)) {
    const idx = Number(col);
    if (idx >= 0 && idx < width) row[idx] = String(ch).slice(0, 1);
  }
  return row.join('');
}

function buildBrowLine(thirdEye, width = WIDTH, browFlanks) {
  const g = (thirdEye || '·').slice(0, 1);
  const left = (browFlanks?.left ?? '_').slice(0, 1);
  const right = (browFlanks?.right ?? '_').slice(0, 1);
  return fixedFaceRow({
    [BROW_SLASH_L_COL]: '/',
    [BROW_L_COL]: left,
    [THIRD_EYE_COL]: g,
    [BROW_R_COL]: right,
    [BROW_SLASH_R_COL]: '\\',
  }, width);
}

function buildEyesLine(left, right, width = WIDTH) {
  return fixedFaceRow({
    [EYE_L_PAREN_COL]: '(',
    [EYE_L_COL]: (left || '·').slice(0, 1),
    [EYE_R_COL]: (right || '·').slice(0, 1),
    [EYE_R_PAREN_COL]: ')',
  }, width);
}

function buildBeakLine(glyph, width = WIDTH) {
  const g = (glyph || '▽').slice(0, 1);
  return fixedFaceRow({ [BEAK_L_COL]: '\\', [BEAK_GLYPH_COL]: g, [BEAK_R_COL]: '/' }, width);
}

function gapCenterFromEyeLine(eyeLine) {
  const open = eyeLine.indexOf('(');
  const close = eyeLine.indexOf(')', open + 1);
  if (open < 0 || close < 0) return Math.floor(eyeLine.length / 2);
  const inner = eyeLine.slice(open + 1, close);
  const tokens = inner.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return Math.floor(eyeLine.length / 2);
  const firstStart = eyeLine.indexOf(tokens[0], open + 1);
  const firstEnd = firstStart + tokens[0].length;
  const secondStart = eyeLine.indexOf(tokens[1], firstEnd);
  return Math.floor((firstEnd + secondStart) / 2);
}

function flankGlyphLtr(flanks, fastIndex, fallback = '·') {
  if (!flanks.length) return fallback;
  const n = flanks.length;
  const idx = ((fastIndex % n) + n) % n;
  return flanks[idx];
}

function resolveAlternatingAnim(frame) {
  const beat = Math.floor(frame / FACE_ANIM_BEAT_FRAMES);
  const generation = Math.floor(beat / 2);
  const isThinkBeat = beat % 2 === 1;
  return {
    beat,
    generation,
    isThinkBeat,
    isEyeBeat: !isThinkBeat,
    eyeIndex: generation,
    cascadeIndex: isThinkBeat ? generation : Math.max(0, generation - 1),
  };
}

function resolveCascadeGlyphs(phase, holdCenter, flanks, frame) {
  const fast = frame * CASCADE_TICK_MULT;
  const idleFlank = '_';

  if (phase === 'perceive') {
    return { browLeft: idleFlank, thirdEye: '?', browRight: idleFlank, beak: '▽' };
  }
  if (phase === 'think') {
    return { browLeft: idleFlank, thirdEye: '?', browRight: idleFlank, beak: '?' };
  }
  if (phase === 'intent') {
    return { browLeft: idleFlank, thirdEye: '@', browRight: idleFlank, beak: '?' };
  }
  if (phase === 'act') {
    return { browLeft: idleFlank, thirdEye: '>', browRight: idleFlank, beak: '@' };
  }

  return {
    browLeft: flankGlyphLtr(flanks, fast, holdCenter),
    thirdEye: flankGlyphLtr(flanks, fast - 1, holdCenter),
    browRight: flankGlyphLtr(flanks, fast - 2, holdCenter),
    beak: flankGlyphLtr(flanks, fast - BEAK_CASCADE_LAG, '▽'),
  };
}

describe('hoot cascade glyphs', () => {
  it('phase drip cascades top → beak: ? → @ → >', () => {
    assert.deepStrictEqual(resolveCascadeGlyphs('perceive', '~', ['A', 'B'], 0), {
      browLeft: '_', thirdEye: '?', browRight: '_', beak: '▽',
    });
    assert.deepStrictEqual(resolveCascadeGlyphs('think', '~', ['A', 'B'], 0), {
      browLeft: '_', thirdEye: '?', browRight: '_', beak: '?',
    });
    assert.deepStrictEqual(resolveCascadeGlyphs('intent', '~', ['A', 'B'], 0), {
      browLeft: '_', thirdEye: '@', browRight: '_', beak: '?',
    });
    assert.deepStrictEqual(resolveCascadeGlyphs('act', '~', ['A', 'B'], 0), {
      browLeft: '_', thirdEye: '>', browRight: '_', beak: '@',
    });
  });

  it('hold marches flanks L→R across brow with beak trailing lead', () => {
    const flanks = ['A', 'B', 'C', 'D'];
    const f = 2;
    const fast = f * CASCADE_TICK_MULT;
    const cascade = resolveCascadeGlyphs('hold', '~', flanks, f);
    assert.strictEqual(cascade.browLeft, flankGlyphLtr(flanks, fast));
    assert.strictEqual(cascade.thirdEye, flankGlyphLtr(flanks, fast - 1));
    assert.strictEqual(cascade.browRight, flankGlyphLtr(flanks, fast - 2));
    assert.strictEqual(cascade.beak, flankGlyphLtr(flanks, fast - BEAK_CASCADE_LAG));
    assert.notStrictEqual(cascade.browLeft, cascade.beak);
  });

  it('face rows center on FACE_CENTER_COL', () => {
    const brow = buildBrowLine('@', WIDTH, { left: 'A', right: '!' });
    const eyes = buildEyesLine('◉', '◉');
    const beak = buildBeakLine('▽');
    assert.strictEqual(brow[THIRD_EYE_COL], '@');
    assert.strictEqual(brow[BROW_SLASH_L_COL], '/');
    assert.strictEqual(brow[BROW_SLASH_R_COL], '\\');
    assert.strictEqual(gapCenterFromEyeLine(eyes), FACE_CENTER_COL);
    assert.strictEqual(beak[BEAK_GLYPH_COL], '▽');
    assert.strictEqual(THIRD_EYE_COL, FACE_CENTER_COL);
    assert.strictEqual(BEAK_GLYPH_COL, FACE_CENTER_COL);
  });

  it('brow headband uses only outer / and \\ with three glyph slots between', () => {
    const brow = buildBrowLine('@', WIDTH, { left: 'A', right: '!' });
    assert.strictEqual((brow.match(/\//g) || []).length, 1);
    assert.strictEqual((brow.match(/\\/g) || []).length, 1);
    assert.strictEqual(brow.slice(BROW_L_COL, BROW_R_COL + 1), 'A@!');
  });

  it('beak uses \\ G / frame with single cycling glyph', () => {
    const { beak } = resolveCascadeGlyphs('hold', '~', ['X', 'Y', 'Z'], 5);
    const row = buildBeakLine(beak);
    assert.strictEqual(row[BEAK_L_COL], '\\');
    assert.strictEqual(row[BEAK_GLYPH_COL], beak);
    assert.strictEqual(row[BEAK_R_COL], '/');
  });

  it('eyes and thinking alternate beats', () => {
    const eyeBeat = resolveAlternatingAnim(0);
    const thinkBeat = resolveAlternatingAnim(FACE_ANIM_BEAT_FRAMES);
    assert.strictEqual(eyeBeat.isEyeBeat, true);
    assert.strictEqual(eyeBeat.isThinkBeat, false);
    assert.strictEqual(thinkBeat.isThinkBeat, true);
    assert.strictEqual(thinkBeat.isEyeBeat, false);
    assert.strictEqual(eyeBeat.cascadeIndex, 0);
    assert.strictEqual(thinkBeat.cascadeIndex, 0);
    const laterEye = resolveAlternatingAnim(FACE_ANIM_BEAT_FRAMES * 2);
    const laterThink = resolveAlternatingAnim(FACE_ANIM_BEAT_FRAMES * 3);
    assert.strictEqual(laterEye.eyeIndex, 1);
    assert.strictEqual(laterEye.cascadeIndex, 0);
    assert.strictEqual(laterThink.cascadeIndex, 1);
  });
});