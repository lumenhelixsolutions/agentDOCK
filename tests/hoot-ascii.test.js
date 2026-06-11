const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mirror of gap/beak alignment logic (keep in sync with ui/src/lib/hoot-ascii.ts)
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

function beakLineFromEyes(glyph, eyeLine, width = 11) {
  const text = glyph;
  if (!text.trim()) return ' '.repeat(width);
  const gap = gapCenterFromEyeLine(eyeLine);
  const start = Math.max(0, Math.round(gap - (text.length - 1) / 2));
  const line = ' '.repeat(start) + text;
  if (line.length >= width) return line.slice(0, width);
  return line + ' '.repeat(width - line.length);
}

describe('hoot ascii beak alignment', () => {
  it('centers single-char beak under eye gap (compact owl)', () => {
    const eyes = '  ( · · )  ';
    const beak = beakLineFromEyes('▽', eyes);
    assert.strictEqual(beak.length, 11);
    assert.strictEqual(beak.indexOf('▽'), 5);
    assert.strictEqual(gapCenterFromEyeLine(eyes), 5);
  });

  it('centers multi-char beak under eye gap', () => {
    const eyes = '  ( · · )  ';
    const beak = beakLineFromEyes('~▽~', eyes);
    assert.strictEqual(beak.indexOf('~'), 4);
    assert.strictEqual(beak.indexOf('▽'), 5);
    assert.strictEqual(beak.indexOf('~', 6), 6);
  });

  it('centers alert spaced beaks under eyes', () => {
    const eyes = '  ( ! ! )  ';
    const bangs = beakLineFromEyes('! !', eyes);
    assert.strictEqual(bangs[4], '!');
    assert.strictEqual(bangs[5], ' ');
    assert.strictEqual(bangs[6], '!');

    const question = beakLineFromEyes(' ? ', eyes);
    assert.strictEqual(question[5], '?');
  });
});