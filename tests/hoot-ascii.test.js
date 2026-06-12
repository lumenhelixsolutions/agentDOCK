const { describe, it } = require('node:test');
const assert = require('node:assert');

const WIDTH = 11;
const BROW_L_COL = 4;
const THIRD_EYE_COL = 5;
const BROW_R_COL = 6;
const BEAK_L_COL = 4;
const BEAK_GLYPH_COL = 5;
const BEAK_R_COL = 6;
const CASCADE_TICK_MULT = 4;
const BEAK_CASCADE_LAG = 3;

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
  return fixedFaceRow({ 2: '/', 3: '\\', 4: left, 5: g, 6: right, 7: '/', 8: '\\' }, width);
}

function buildBeakLine(glyph, width = WIDTH) {
  const g = (glyph || '▽').slice(0, 1);
  return fixedFaceRow({ [BEAK_L_COL]: '\\', [BEAK_GLYPH_COL]: g, [BEAK_R_COL]: '/' }, width);
}

function flankGlyphLtr(flanks, fastIndex, fallback = '·') {
  if (!flanks.length) return fallback;
  const n = flanks.length;
  const idx = ((fastIndex % n) + n) % n;
  return flanks[idx];
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

  it('brow L→R wave renders in tuft slots without shifting layout', () => {
    const cascade = resolveCascadeGlyphs('hold', '~', ['X', 'Y', 'Z'], 5);
    const brow = buildBrowLine(cascade.thirdEye, WIDTH, { left: cascade.browLeft, right: cascade.browRight });
    assert.strictEqual(brow[BROW_L_COL], cascade.browLeft);
    assert.strictEqual(brow[THIRD_EYE_COL], cascade.thirdEye);
    assert.strictEqual(brow[BROW_R_COL], cascade.browRight);
    assert.strictEqual(brow.length, WIDTH);
  });

  it('beak uses \\ G / frame with single cycling glyph', () => {
    const { beak } = resolveCascadeGlyphs('hold', '~', ['X', 'Y', 'Z'], 5);
    const row = buildBeakLine(beak);
    assert.strictEqual(row[BEAK_L_COL], '\\');
    assert.strictEqual(row[BEAK_GLYPH_COL], beak);
    assert.strictEqual(row[BEAK_R_COL], '/');
  });
});