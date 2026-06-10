const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/skills';
const CACHE_DIR = path.join(__dirname, '..', 'skills', 'compound-engineering', 'cache');
const SKILLS = [
  'ce-strategy',
  'ce-ideate',
  'ce-brainstorm',
  'ce-plan',
  'ce-work',
  'ce-code-review',
  'ce-compound',
  'ce-debug',
  'ce-product-pulse',
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'AgentDock/1.1' } }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function main() {
  for (const skill of SKILLS) {
    const dir = path.join(CACHE_DIR, skill);
    fs.mkdirSync(dir, { recursive: true });
    const url = `${BASE_URL}/${skill}/SKILL.md`;
    try {
      const content = await fetch(url);
      fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
      console.log(`Synced ${skill}`);
    } catch (e) {
      console.error(`Failed to sync ${skill}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log('Done.');
}

main();
