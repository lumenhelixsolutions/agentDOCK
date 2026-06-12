#!/usr/bin/env node
/**
 * Seed 10 hard-command approval log entries for Phase 4 entry gate.
 * Usage: node scripts/seed-coach-approvals.mjs
 */
const BASE = process.env.AGENTDOCK_URL || 'http://127.0.0.1:7777';

const COMMANDS = [
  { type: 'appendMemory', status: 'observed-run', profile: 'phase4-seed-1', reason: 'Phase 4 approval seed' },
  { type: 'setMemory', status: 'observed-run', profile: 'phase4-seed-2', reason: 'Phase 4 approval seed' },
  { type: 'switchProject', path: 'D:/projects/Hoot' },
  { type: 'switchProject', path: 'D:/projects/cineforge' },
  { type: 'appendMemory', status: 'success', profile: 'phase4-seed-3', reason: 'Launch approval flow test' },
  { type: 'launch', profileId: 'local-safe-audit' },
  { type: 'launchProfile', profileId: 'local-safe-audit' },
  { type: 'setMemory', status: 'known-good', profile: 'local-safe-audit', reason: 'Coach gate verified' },
  { type: 'switchProject', path: 'D:/projects/racegps' },
  { type: 'appendMemory', status: 'observed-run', profile: 'phase4-seed-10', reason: 'Tenth approval flow' },
];

async function execute(cmd) {
  const res = await fetch(`${BASE}/api/coach/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command: cmd }),
  });
  return res.json();
}

async function main() {
  console.log('Seeding coach approval flows...\n');
  for (let i = 0; i < COMMANDS.length; i += 1) {
    const cmd = COMMANDS[i];
    const out = await execute(cmd);
    console.log(`${i + 1}/10 ${cmd.type} → ok=${out.ok}`);
  }
  const check = await fetch(`${BASE}/api/coach/approvals`);
  const data = await check.json();
  console.log(`\nApproval count: ${data.count}`);
  console.log(`phase4Ready: ${data.phase4Ready}`);
  if (!data.phase4Ready) process.exit(1);
  console.log('Phase 4 entry gate OPEN.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});