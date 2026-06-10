# Compound Engineering Skill Cache

This directory contains offline copies of core CE skills.

## Cached Skills (9)

| Skill | File |
|-------|------|
| ce-strategy | `ce-strategy/SKILL.md` |
| ce-ideate | `ce-ideate/SKILL.md` |
| ce-brainstorm | `ce-brainstorm/SKILL.md` |
| ce-plan | `ce-plan/SKILL.md` |
| ce-work | `ce-work/SKILL.md` |
| ce-code-review | `ce-code-review/SKILL.md` |
| ce-compound | `ce-compound/SKILL.md` |
| ce-debug | `ce-debug/SKILL.md` |
| ce-product-pulse | `ce-product-pulse/SKILL.md` |

## Metadata-only skills (30)

The remaining 30 skills are listed in `skills-catalog.json` only. Full content ships inside the CE plugin after **Full setup**, or re-run `sync-ce-skills.js` when new core skills are added to the cache list. `/api/skills/:id/content` returns a placeholder for uncached skills.

## Sync

Run `node scripts/sync-ce-skills.js` to re-download cached skills from upstream.
