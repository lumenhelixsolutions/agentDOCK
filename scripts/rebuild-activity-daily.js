#!/usr/bin/env node
/**
 * Recompute activity-log daily{} rollups from stop/end events (idempotent).
 * Usage: node scripts/rebuild-activity-daily.js [state-file]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const stateFile = process.argv[2] || path.join(ROOT, 'state', 'activity-log.json');

const STOP_TYPES = new Set(['agent.dock.stop', 'agent.external.stop', 'session.end', 'session.fail']);

function emptyDay(date) {
  return { date, events: 0, dock_minutes: 0, external_minutes: 0, launches: 0 };
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const data = readJSON(stateFile, { events: [], daily: {} });
const daily = {};

for (const ev of data.events || []) {
  const day = ev.at?.slice(0, 10);
  if (!day) continue;
  if (!daily[day]) daily[day] = emptyDay(day);
  daily[day].events += 1;
  if (ev.type === 'session.launch') daily[day].launches += 1;
  if (STOP_TYPES.has(ev.type) && ev.duration_ms) {
    const mins = Math.round(ev.duration_ms / 60000);
    if (ev.source === 'agentdock' && ev.type !== 'agent.external.stop') {
      daily[day].dock_minutes += mins;
    } else if (ev.source === 'external' || ev.type === 'agent.external.stop') {
      daily[day].external_minutes += mins;
    } else if (ev.type.startsWith('session.')) {
      daily[day].dock_minutes += mins;
    }
  }
}

data.daily = daily;
fs.writeFileSync(stateFile, JSON.stringify(data, null, 2), 'utf8');
console.log(`Rebuilt daily rollups for ${Object.keys(daily).length} days → ${stateFile}`);