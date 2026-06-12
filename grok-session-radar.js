/**
 * Grok CLI session radar — backward-compatible exports.
 * Implementation lives in session-radar-adapters.js + session-radar-shared.js.
 */

const {
  isPidAlive,
  grokSessionDir,
} = require('./session-radar-shared');
const {
  resolveGrokHome,
  analyzeGrokSessionFolder,
  buildGrokSessionRadar,
} = require('./session-radar-adapters');

module.exports = {
  resolveGrokHome,
  grokSessionDir,
  isPidAlive,
  analyzeSessionFolder: analyzeGrokSessionFolder,
  buildGrokSessionRadar,
};