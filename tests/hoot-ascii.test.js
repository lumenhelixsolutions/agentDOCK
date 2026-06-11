const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mirror alignment helpers — keep in sync with ui/src/lib/hoot-ascii.ts
const WIDTH = 11;

function fit(line, width = WIDTH) {
  if (line.length === width) return line;
  if (line.length > width) return line.slice(0, width);
  const pad = width - line.length;
  const left = Math.floor(pad / 2);
  return ' '.repeat(left) + line + ' '.repeat(width - line.length - left);
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

function alignRow(glyph, width = WIDTH, centerCol) {
  const text = String(glyph || '').trim();
  if (!text) return ' '.repeat(width);
  const center = centerCol ?? Math.floor(width / 2);
  const start = Math.max(0, Math.round(center - (text.length - 1) / 2));
  const line = ' '.repeat(start) + text;
  if (line.length >= width) return line.slice(0, width);
  return line + ' '.repeat(width - line.length);
}

function faceCenterCol(eyeLine) {
  return gapCenterFromEyeLine(fit(eyeLine));
}

function beakLineFromEyes(glyph, eyeLine, width = 11) {
  return alignRow(glyph, width, gapCenterFromEyeLine(eyeLine));
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

  it('faceCenterCol matches gap center on fitted eyes', () => {
    const eyes = '  ( ! ! )  ';
    assert.strictEqual(faceCenterCol(eyes), gapCenterFromEyeLine(eyes));
  });
});

describe('hoot cognitive layout', () => {
  it('builds 7-line stack order: band above eyes, emit below beak', () => {
    const eyes = fit('( ! ! )');
    const center = faceCenterCol(eyes);
    const band = alignRow('! @ !', WIDTH, center);
    const beak = alignRow('▽', WIDTH, center);
    const emit = alignRow('@', WIDTH, center);
    const lines = [band, eyes, beak, emit, fit('watching')];
    assert.strictEqual(lines[0].trim(), '! @ !');
    assert.ok(lines[1].includes('!'));
    assert.strictEqual(lines[2].trim(), '▽');
    assert.strictEqual(lines[3].trim(), '@');
  });
});