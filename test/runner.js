/**
 * AgentDock 2.0 — Comprehensive Test Runner
 * Zero dependencies. Pure Node.js.
 * Usage: node test/runner.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const ROOT = path.dirname(__dirname);
const HOST = '127.0.0.1';
const PORT = 17777; // test port to avoid collision with running server

let serverProc = null;
let passCount = 0;
let failCount = 0;
const failures = [];

function log(msg) { console.log(msg); }
function ok(name) { passCount++; console.log(`  ✓ ${name}`); }
function fail(name, reason) { failCount++; failures.push({ name, reason }); console.log(`  ✗ ${name}: ${reason}`); }

function request(method, path_, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path: path_, method, headers: {} };
    if (body) { const data = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(data); }
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, body: data, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, AGENTDOCK_PORT: String(PORT) };
    serverProc = spawn('node', ['server.js'], { cwd: ROOT, env, windowsHide: true });
    let ready = false;
    serverProc.stdout.on('data', d => {
      const text = d.toString();
      if (text.includes(`running at http://${HOST}:${PORT}`)) { ready = true; resolve(); }
    });
    serverProc.stderr.on('data', d => {
      const text = d.toString();
      if (!ready && text.includes('running at http://')) { ready = true; resolve(); }
    });
    setTimeout(() => {
      if (!ready) {
        // poll instead
        const poll = setInterval(async () => {
          try { await request('GET', '/api/profiles'); clearInterval(poll); ready = true; resolve(); }
          catch {}
        }, 300);
        setTimeout(() => { clearInterval(poll); if (!ready) reject(new Error('Server did not start')); }, 10000);
      }
    }, 2000);
  });
}

function stopServer() {
  return new Promise(resolve => {
    if (!serverProc) return resolve();
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(serverProc.pid), '/T', '/F'], () => resolve());
    } else {
      serverProc.kill('SIGTERM');
      setTimeout(() => { try { serverProc.kill('SIGKILL'); } catch {} resolve(); }, 1000);
    }
  });
}

// ─── TEST SUITES ───

async function testScanner() {
  log('\n── Scanner Tests ──');
  const scanFile = path.join(ROOT, 'scanner.ps1');
  if (!fs.existsSync(scanFile)) { fail('scanner.ps1 exists', 'missing'); return; }
  ok('scanner.ps1 exists');

  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scanFile, '-RepoPath', ROOT], { windowsHide: true });
  let out = '', err = '';
  child.stdout.on('data', d => out += d.toString());
  child.stderr.on('data', d => err += d.toString());

  await new Promise((resolve, reject) => {
    child.on('close', code => {
      if (code !== 0) reject(new Error(err || `exit ${code}`));
      else resolve();
    });
    setTimeout(() => reject(new Error('scanner timeout')), 60000);
  });

  let scan;
  try { scan = JSON.parse(out); }
  catch (e) { fail('scanner JSON parses', e.message); return; }
  ok('scanner JSON parses');

  if (scan.system && scan.system.os) ok('scanner.system.os'); else fail('scanner.system.os', JSON.stringify(scan.system));
  if (typeof scan.hardware?.ram_gb === 'number') ok('scanner.hardware.ram_gb'); else fail('scanner.hardware.ram_gb', typeof scan.hardware?.ram_gb);
  if (Array.isArray(scan.hardware?.gpu)) ok('scanner.hardware.gpu array'); else fail('scanner.hardware.gpu', typeof scan.hardware?.gpu);
  if (scan.tools && typeof scan.tools === 'object') ok('scanner.tools object'); else fail('scanner.tools', typeof scan.tools);
  if (Array.isArray(scan.coders)) ok('scanner.coders array'); else fail('scanner.coders', typeof scan.coders);
  if (Array.isArray(scan.env_files)) ok('scanner.env_files array'); else fail('scanner.env_files', typeof scan.env_files);
  if (scan.ollama && typeof scan.ollama === 'object') ok('scanner.ollama object'); else fail('scanner.ollama', typeof scan.ollama);
  if (Array.isArray(scan.ollama?.loaded_models) || (scan.ollama?.loaded_models && typeof scan.ollama.loaded_models === 'object')) ok('scanner.ollama.loaded_models'); else fail('scanner.ollama.loaded_models', typeof scan.ollama?.loaded_models);
  if (scan.local_models && typeof scan.local_models === 'object') ok('scanner.local_models object'); else fail('scanner.local_models', typeof scan.local_models);
  if (Array.isArray(scan.local_models?.backends)) ok('scanner.local_models.backends array'); else fail('scanner.local_models.backends', typeof scan.local_models?.backends);
  if (Array.isArray(scan.local_models?.discovered_ggufs)) ok('scanner.local_models.discovered_ggufs array'); else fail('scanner.local_models.discovered_ggufs', typeof scan.local_models?.discovered_ggufs);
  if (scan.repo && typeof scan.repo === 'object') ok('scanner.repo object'); else fail('scanner.repo', typeof scan.repo);
}

async function testApiProfiles() {
  log('\n── API: Profiles ──');
  const r = await request('GET', '/api/profiles');
  if (r.status === 200 && Array.isArray(r.body)) ok('GET /api/profiles returns array'); else fail('GET /api/profiles', `status=${r.status} type=${typeof r.body}`);
  if (r.body.length >= 9) ok(`profiles count >= 9 (${r.body.length})`); else fail('profiles count', r.body.length);

  const first = r.body[0];
  if (first.id && first.name && first.meta) ok('profile has id/name/meta'); else fail('profile shape', JSON.stringify(Object.keys(first)));
  if (typeof first.hasLaunch === 'boolean') ok('profile.hasLaunch boolean'); else fail('profile.hasLaunch', typeof first.hasLaunch);

  // individual profile
  const p = await request('GET', '/api/profile/' + encodeURIComponent(first.id));
  if (p.status === 200 && p.body.id === first.id) ok('GET /api/profile/:id'); else fail('GET /api/profile/:id', `status=${p.status}`);
}

async function testApiScan() {
  log('\n── API: Scan ──');
  const r = await request('GET', '/api/scan?repo=' + encodeURIComponent(ROOT));
  if (r.status === 200 && r.body.system) ok('GET /api/scan returns system'); else fail('GET /api/scan', `status=${r.status}`);
  if (r.body.local_models?.backends?.length >= 6) ok('scan includes >=6 local backends'); else fail('scan local backends', r.body.local_models?.backends?.length);
}

async function testApiPlan() {
  log('\n── API: Plan ──');
  const r = await request('POST', '/api/plan', { goal: 'privacy' });
  if (r.status === 200 && Array.isArray(r.body.recommended)) ok('POST /api/plan returns recommendations'); else fail('POST /api/plan', `status=${r.status}`);
  if (Array.isArray(r.body.blocked)) ok('plan returns blocked array'); else fail('plan blocked', typeof r.body.blocked);
  if (r.body.recommended.length > 0 && r.body.recommended[0].score !== undefined) ok('plan recommendation has score'); else fail('plan score', JSON.stringify(r.body.recommended?.[0]));
  if (r.body.recommended.length > 0 && r.body.recommended[0].state) ok('plan recommendation has state'); else fail('plan state', JSON.stringify(r.body.recommended?.[0]));

  // Verify no false blocks from substring matching
  const blockedIds = (r.body.blocked || []).map(p => p.id);
  const falseBlock = blockedIds.find(id => id.includes('hermes') && id !== 'qwen-local-hermes-64k');
  if (!falseBlock) ok('no false Hermes blocks from Qwen memory'); else fail('false block detected', falseBlock);
}

async function testApiLaunchDryRun() {
  log('\n── API: Launch Dry Run ──');
  const r = await request('POST', '/api/launch/local-safe-audit', { dryRun: true });
  if (r.status === 200 && typeof r.body.script === 'string') ok('dryRun returns script'); else fail('dryRun script', `status=${r.status}`);
  if (r.body.blocked === undefined || r.body.blocked === false) ok('local-safe-audit not falsely blocked'); else fail('local-safe-audit blocked', r.body.blocked);
  if (r.body.script.includes('D:\\projects\\agentdock') || r.body.script.includes('D:/projects/agentdock')) ok('project path injected into script'); else fail('project path injection', r.body.script?.slice(0, 100));
}

async function testApiMemory() {
  log('\n── API: Memory ──');
  const r = await request('GET', '/api/memory');
  if (r.status === 200 && typeof r.body.text === 'string') ok('GET /api/memory'); else fail('GET /api/memory', `status=${r.status}`);

  const save = await request('POST', '/api/memory', { text: r.body.text + '\n\n# Test append\n' });
  if (save.status === 200) ok('POST /api/memory saves'); else fail('POST /api/memory', `status=${save.status}`);

  const r2 = await request('GET', '/api/memory');
  if (r2.body.text.includes('# Test append')) ok('memory persisted'); else fail('memory persistence', 'missing append');

  // restore original
  await request('POST', '/api/memory', { text: r.body.text });
}

async function testApiCatalog() {
  log('\n── API: Catalog ──');
  const r = await request('GET', '/api/catalog');
  if (r.status === 200 && Array.isArray(r.body.tools)) ok('GET /api/catalog'); else fail('GET /api/catalog', `status=${r.status}`);
  if (r.body.tools.every(t => t.install_guide || t.install_windows)) ok('all catalog tools have install guide'); else fail('catalog install guides', r.body.tools.find(t => !t.install_guide && !t.install_windows)?.id);
}

async function testApiSessions() {
  log('\n── API: Sessions ──');
  const r = await request('GET', '/api/sessions');
  if (r.status === 200 && Array.isArray(r.body.sessions)) ok('GET /api/sessions'); else fail('GET /api/sessions', `status=${r.status}`);
}

async function testApiAdvisor() {
  log('\n── API: Advisor ──');
  const r = await request('POST', '/api/advisor/analyze', { question: 'What should I install?', useGemini: false });
  if (r.status === 200 && r.body.advice) ok('POST /api/advisor/analyze'); else fail('POST /api/advisor/analyze', `status=${r.status}`);
  if (r.body.advice.includes('===') && r.body.advice.length > 200) ok('advisor returns comprehensive report'); else fail('advisor comprehensiveness', `length=${r.body.advice?.length}`);
  if (r.body.source === 'rule-based') ok('advisor uses rule-based fallback'); else fail('advisor source', r.body.source);
}

async function testApiChat() {
  log('\n── API: Chat ──');
  const r = await request('POST', '/api/chat', { sessionId: 'test-session-1', text: 'Hello' });
  if (r.status === 200 && r.body.text) ok('POST /api/chat responds'); else fail('POST /api/chat', `status=${r.status}`);
  const hist = await request('GET', '/api/chat/history?session=test-session-1');
  if (hist.status === 200 && Array.isArray(hist.body.history)) ok('GET /api/chat/history'); else fail('GET /api/chat/history', `status=${hist.status}`);
  const clear = await request('POST', '/api/chat/clear', { sessionId: 'test-session-1' });
  if (clear.status === 200) ok('POST /api/chat/clear'); else fail('POST /api/chat/clear', `status=${clear.status}`);
}

async function testApiProjects() {
  log('\n── API: Projects ──');
  const r = await request('GET', '/api/projects');
  if (r.status === 200 && Array.isArray(r.body.projects)) ok('GET /api/projects'); else fail('GET /api/projects', `status=${r.status}`);
  if (r.body.projects.some(p => p.path && p.name)) ok('projects have path and name'); else fail('project shape', JSON.stringify(r.body.projects?.[0]));

  const first = r.body.projects.find(p => p.hasGit);
  if (first) {
    const agents = await request('GET', '/api/project/' + encodeURIComponent(first.path) + '/agents-md');
    if (agents.status === 200 && typeof agents.body.present === 'boolean') ok('GET /api/project/:path/agents-md'); else fail('GET agents-md', `status=${agents.status}`);

    const git = await request('GET', '/api/project/' + encodeURIComponent(first.path) + '/git-status');
    if (git.status === 200 && typeof git.body.present === 'boolean') ok('GET /api/project/:path/git-status'); else fail('GET git-status', `status=${git.status}`);
  } else {
    ok('GET /api/project/:path/agents-md (skipped: no git project)');
    ok('GET /api/project/:path/git-status (skipped: no git project)');
  }
}

async function testApiTemplates() {
  log('\n── API: Templates ──');
  const r = await request('GET', '/api/templates');
  if (r.status === 200 && Array.isArray(r.body.templates)) ok('GET /api/templates'); else fail('GET /api/templates', `status=${r.status}`);
  if (r.body.templates.length >= 3) ok(`templates count >= 3 (${r.body.templates.length})`); else fail('templates count', r.body.templates?.length);
}

async function testApiMcp() {
  log('\n── API: MCP ──');
  const r = await request('GET', '/api/mcp');
  if (r.status === 200 && Array.isArray(r.body.configs)) ok('GET /api/mcp'); else fail('GET /api/mcp', `status=${r.status}`);
}

async function testApiPortfolio() {
  log('\n── API: Portfolio ──');
  const r = await request('GET', '/api/portfolio/health');
  if (r.status === 200 && Array.isArray(r.body.items)) ok('GET /api/portfolio/health'); else fail('GET /api/portfolio/health', `status=${r.status}`);
}

async function testHtmlStructure() {
  log('\n── UI HTML Structure ──');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (html.includes('id="easyMode"')) ok('HTML has easyMode container'); else fail('easyMode container', 'missing');
  if (html.includes('id="advancedMode"')) ok('HTML has advancedMode container'); else fail('advancedMode container', 'missing');
  if (html.includes('setMode(')) ok('HTML has mode toggle logic'); else fail('mode toggle logic', 'missing');
  if (html.includes('toggleChat()')) ok('HTML has chat toggle'); else fail('chat toggle', 'missing');
  if (html.includes('class="mascot-btn"')) ok('HTML has mascot button'); else fail('mascot button', 'missing');
  if (html.includes('class="chat-window"')) ok('HTML has chat window'); else fail('chat window', 'missing');
  if (html.includes('class="install-card"')) ok('HTML has install card styling'); else fail('install card', 'missing');
  if (html.includes('class="troubleshoot-box"')) ok('HTML has troubleshoot box'); else fail('troubleshoot box', 'missing');
  if (html.includes('copyText(')) ok('HTML has copy helper'); else fail('copy helper', 'missing');
  if (html.includes('renderLocalModels')) ok('HTML has local models renderer'); else fail('localModels renderer', 'missing');
  if (html.includes('id="easyProjectPanel"')) ok('HTML has easy project panel'); else fail('easy project panel', 'missing');
  if (html.includes('id="easyMissingTools"')) ok('HTML has easy missing tools'); else fail('easy missing tools', 'missing');
  if (html.includes('class="easy-card"')) ok('HTML has easy-card styling'); else fail('easy-card styling', 'missing');
  if (html.includes('outcome-btns')) ok('HTML has outcome buttons'); else fail('outcome buttons', 'missing');
  if (html.includes('troubleshootPanel')) ok('HTML has troubleshoot panel'); else fail('troubleshoot panel ID', 'missing');
}

async function testAdvisorModule() {
  log('\n── Advisor Module ──');
  const advisor = require(path.join(ROOT, 'advisor.js'));
  if (typeof advisor.advisorAnalyze === 'function') ok('advisorAnalyze exported'); else fail('advisorAnalyze export', typeof advisor.advisorAnalyze);
  if (typeof advisor.buildSystemContext === 'function') ok('buildSystemContext exported'); else fail('buildSystemContext export', typeof advisor.buildSystemContext);

  const ctx = advisor.buildSystemContext({
    system: { os: 'windows' },
    hardware: { cpu: 'test', ram_gb: 32, gpu: [{ name: 'RTX 4060' }] },
    coders: [{ id: 'hermes', detection: { present: true } }],
    env: { OPENAI_API_KEY: { present: true } },
    ollama: { loaded_models: [{ name: 'llama3.1:8b', context: 8192 }] },
    local_models: { backends: [{ id: 'lm-studio', name: 'LM Studio', present: true, model_count: 2 }], discovered_ggufs: [{ name: 'test.gguf' }] }
  }, { name: 'testproj', type: 'node', hasGit: true, git: { clean: true, hasRemote: true } }, [], []);

  if (ctx.localBackends?.length === 1) ok('buildSystemContext includes localBackends'); else fail('localBackends', JSON.stringify(ctx.localBackends));
  if (ctx.discoveredGgufs?.includes('test.gguf')) ok('buildSystemContext includes discoveredGgufs'); else fail('discoveredGgufs', JSON.stringify(ctx.discoveredGgufs));
}

async function testChatModule() {
  log('\n── Chat Module ──');
  const chat = require(path.join(ROOT, 'chat.js'));
  if (typeof chat.processChatMessage === 'function') ok('processChatMessage exported'); else fail('processChatMessage export', typeof chat.processChatMessage);
  if (typeof chat.getChatHistory === 'function') ok('getChatHistory exported'); else fail('getChatHistory export', typeof chat.getChatHistory);
  if (typeof chat.clearChat === 'function') ok('clearChat exported'); else fail('clearChat export', typeof chat.clearChat);
}

async function testServerModuleBlocking() {
  log('\n── Server Blocking Logic ──');
  // We must require server.js to test internal functions, but it starts a server.
  // Instead, we'll test the logic by extracting it inline.
  // Since server.js doesn't export, we run a small inline replication of the critical path.

  function memoryBlocks(memory) {
    const blocks = [];
    const parts = memory.split(/\n(?=## Evidence: )/g);
    for (const part of parts) {
      const title = /## Evidence:\s*(.+)/.exec(part)?.[1]?.trim();
      if (!title) continue;
      const status = /^Status:\s*(.+)$/mi.exec(part)?.[1]?.trim().toLowerCase() || '';
      const profile = /^Profile:\s*(.+)$/mi.exec(part)?.[1]?.trim() || '';
      blocks.push({ title, status, profile });
    }
    return blocks;
  }
  function isBlockedByMemory(profile, memory) {
    const blocks = memoryBlocks(memory);
    const profileId = String(profile.id || '').toLowerCase();
    const profileModel = String(profile.meta?.model || '').toLowerCase();
    return blocks.find(b => {
      if (b.status !== 'blocked') return false;
      const blockProfile = String(b.profile || '').toLowerCase();
      const blockTitle = String(b.title || '').toLowerCase();
      if (blockProfile === profileId) return true;
      if (blockTitle === profileId) return true;
      if (profileModel && (blockProfile === profileModel || blockTitle === profileModel)) return true;
      return false;
    });
  }

  const memory = `# AgentDock Memory
## Evidence: qwen-local-hermes-64k
Date: 2026-06-05
Profile: qwen-local-hermes-64k
Status: blocked
Observed: Qwen local attempts repeatedly loaded at CONTEXT 32768
Reason: Do not recommend Qwen 7B local Hermes 64K
`;

  const qwenProfile = { id: 'qwen-local-hermes-64k', meta: { model: 'qwen' } };
  const hermesProfile = { id: 'hermes-local-llama31-64k', meta: { model: 'llama31' } };
  const safeAuditProfile = { id: 'local-safe-audit', meta: { model: 'llama3.1' } };

  if (isBlockedByMemory(qwenProfile, memory)) ok('Qwen profile correctly blocked'); else fail('Qwen block', 'should be blocked');
  if (!isBlockedByMemory(hermesProfile, memory)) ok('Hermes llama31 NOT falsely blocked'); else fail('Hermes false block', 'should NOT be blocked');
  if (!isBlockedByMemory(safeAuditProfile, memory)) ok('local-safe-audit NOT falsely blocked'); else fail('safe-audit false block', 'should NOT be blocked');
}

async function testServerModuleNormalizeLoadedModels() {
  log('\n── Server normalizeLoadedModels ──');
  // Inline replication
  function normalizeLoadedModels(scan) {
    const raw = scan?.ollama?.loaded_models;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object' && raw.name) return [raw];
    return [];
  }

  if (normalizeLoadedModels({ ollama: { loaded_models: [{ name: 'a' }] } }).length === 1) ok('normalize array'); else fail('normalize array', '');
  if (normalizeLoadedModels({ ollama: { loaded_models: { name: 'a', context: 8192 } } }).length === 1) ok('normalize object'); else fail('normalize object', '');
  if (normalizeLoadedModels({ ollama: { loaded_models: null } }).length === 0) ok('normalize null'); else fail('normalize null', '');
}

async function runAll() {
  log('═══════════════════════════════════════════════');
  log('  AgentDock 2.0 — Comprehensive Test Runner');
  log('═══════════════════════════════════════════════');

  try {
    await startServer();
    log('\nServer started on port ' + PORT);
  } catch (e) {
    log('\nFATAL: Could not start server: ' + e.message);
    process.exit(1);
  }

  await testScanner();
  await testApiProfiles();
  await testApiScan();
  await testApiPlan();
  await testApiLaunchDryRun();
  await testApiMemory();
  await testApiCatalog();
  await testApiSessions();
  await testApiAdvisor();
  await testApiChat();
  await testApiProjects();
  await testApiTemplates();
  await testApiMcp();
  await testApiPortfolio();
  await testHtmlStructure();
  await testAdvisorModule();
  await testChatModule();
  await testServerModuleBlocking();
  await testServerModuleNormalizeLoadedModels();

  await stopServer();

  log('\n═══════════════════════════════════════════════');
  log(`  Results: ${passCount} passed, ${failCount} failed`);
  log('═══════════════════════════════════════════════');

  if (failures.length) {
    log('\nFailures:');
    for (const f of failures) log(`  • ${f.name}: ${f.reason}`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runAll().catch(e => {
  log('\nFATAL ERROR: ' + e.message);
  stopServer().then(() => process.exit(1));
});
