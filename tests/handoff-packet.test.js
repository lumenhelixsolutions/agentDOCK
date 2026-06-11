const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const {
  HANDOFF_HEADER,
  renderMarkdown,
  buildPacketFields,
  parseInboundHandoff,
  generateHandoffPacket,
} = require('../handoff-packet');

describe('handoff-packet', () => {
  it('renders strict template shape', () => {
    const fields = buildPacketFields({
      targetDirectory: 'D:/projects/agentdock',
      currentGoals: 'Ship hybrid workspace',
      completedArtifacts: 'provider-cooldown.js',
      immutableDecisions: 'HOOT owns state',
      reasoningGaps: 'none',
      nextAction: 'Run tests',
    });
    const md = renderMarkdown(fields);
    assert.ok(md.includes(HANDOFF_HEADER));
    assert.ok(md.includes('**Target Directory:** D:/projects/agentdock'));
    assert.ok(md.includes('**Current Goals:** Ship hybrid workspace'));
    assert.ok(md.includes('**Next Immediate Action:** Run tests'));
  });

  it('parses inbound handoff markdown', () => {
    const sample = `### [PROJECT STATE DUMP - DO NOT TRANSLATE]
- **Target Directory:** D:/projects/foo
- **Current Goals:** Fix auth
- **Completed Artifacts:** login.js
- **Immutable Decisions:** JWT only
- **Reasoning Gaps:** refresh token TTL
- **Next Immediate Action:** Add tests`;
    const parsed = parseInboundHandoff(sample);
    assert.strictEqual(parsed.ok, true);
    assert.strictEqual(parsed.fields.target_directory, 'D:/projects/foo');
    assert.ok(parsed.draft.includes('Fix auth'));
    assert.ok(parsed.draft.includes('JWT only'));
  });

  it('graceful fallback when project brain missing', async () => {
    const packet = await generateHandoffPacket({
      activeProject: null,
      rootsState: { roots: [], active_root_id: null, enforce_boundaries: false },
      registry: null,
      memoryText: '# AgentDock Memory\n',
      nextAction: 'Pick a project',
    });
    assert.ok(packet.markdown.includes(HANDOFF_HEADER));
    assert.strictEqual(packet.fields.next_immediate_action, 'Pick a project');
    assert.ok(packet.fields.target_directory === '—' || packet.fields.target_directory);
  });

  it('rejects empty inbound handoff', () => {
    const parsed = parseInboundHandoff('');
    assert.strictEqual(parsed.ok, false);
  });
});