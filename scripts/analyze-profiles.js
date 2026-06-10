const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'profiles');
const profiles = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = {};
  if (raw.startsWith('---')) {
    const end = raw.indexOf('\n---', 3);
    raw.slice(3, end).split(/\r?\n/).forEach((l) => {
      const x = /^([a-z_]+):\s*(.*)$/i.exec(l);
      if (x) m[x[1]] = x[2].replace(/^"|"$/g, '');
    });
  }
  return { id: m.id || f.replace('.md', ''), frontend: m.frontend || 'unknown', task_mode: m.task_mode || 'general' };
});
const byAgent = {};
profiles.forEach((p) => {
  const a = p.frontend.toLowerCase();
  (byAgent[a] = byAgent[a] || []).push(p);
});
console.log('Total:', profiles.length);
Object.entries(byAgent).sort((a, b) => b[1].length - a[1].length).forEach(([k, v]) => console.log(`${k}: ${v.length}`));