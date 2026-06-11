/**
 * Lightweight profile list payloads (no markdown body).
 */

function toProfileSummary(p, enrichment = {}) {
  const { body: _body, ...rest } = p;
  return {
    id: rest.id,
    name: rest.name,
    meta: rest.meta,
    file: rest.file,
    state: enrichment.state,
    score: enrichment.score,
    reasons: enrichment.reasons,
    stats: enrichment.stats,
    taskMode: enrichment.taskMode,
    telemetry: enrichment.telemetry,
    ce_compatible: enrichment.ce_compatible,
  };
}

function enrichProfilesSummary(profiles, { evaluateProfile, auditProfile, detectTaskMode, buildProfileTelemetry, lastScan, memory }) {
  return profiles.map((p) => {
    const ev = evaluateProfile(p, lastScan, memory);
    const audit = auditProfile(p, profiles);
    return toProfileSummary(p, {
      state: ev.state,
      score: ev.score,
      reasons: ev.reasons,
      stats: ev.stats,
      taskMode: detectTaskMode(p),
      telemetry: buildProfileTelemetry(p.id),
      ce_compatible: audit.errors.length === 0 && Boolean(p.meta?.ce_version),
    });
  });
}

module.exports = { toProfileSummary, enrichProfilesSummary };