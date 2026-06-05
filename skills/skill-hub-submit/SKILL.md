---
name: skill-hub-submit
description: Submit reusable technical experience to Skill Hub after solving a problem. Use when the user asks to 沉淀技能, 提交到 Skill Hub, record team knowledge, or after verifying a fix that others can reuse. Requires Skill Hub API Key.
---

# Skill Hub Submit

Set `SKILL_HUB_URL` (e.g. `http://localhost:3000`) and `SKILL_HUB_API_KEY` from `/profile`.

Pair with **skill-hub-query** to search before submitting.

## Submit API

```bash
curl -sS -X POST "${SKILL_HUB_URL}/api/skills/submit" \
  -H "Authorization: Bearer ${SKILL_HUB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"problem":"...","solution":"...","context":"..."}'
```

Required: `problem`, `solution`. Optional: `context`, `scope`, `id`, `name`, `domain`, `tags`, `description`.

Response: `{ "action": "created", "skillId": "@...", "skillName": "..." }`

## Import API

Import a skill from a ZIP file. The ZIP must contain a SKILL.md file with frontmatter.

```bash
curl -sS -X POST "${SKILL_HUB_URL}/api/skills/import" \
  -H "Authorization: Bearer ${SKILL_HUB_API_KEY}" \
  -F "file=@skill-package.zip" \
  -F "force=false"
```

ZIP structure:

```
{scope}/{slug}/
├── SKILL.md          # Required: frontmatter + markdown body
├── scripts/          # Optional: executable scripts
├── references/       # Optional: reference files
└── assets/           # Optional: other assets
```

SKILL.md frontmatter format:

```yaml
---
name: my-skill
description: Skill description
license: MIT
compatibility: Requires Node.js 18+
metadata:
  domain: frontend
  language: typescript
  framework: react
  difficulty: intermediate
  tags: [react, error-handling]
  prerequisites: [react-basics]
  relatedSkillIds: ["@frontend/react-state-management"]
  author: zhangsan
  source: manual
  version: 1
  importUrl: https://example.com/skills/my-skill.zip
---

# Markdown body...
```

Required: `name`, `description`. Optional: `force` (overwrite existing, default false).

Response: skill object (201 created, 200 if force-updated).

## Export API

Export a skill as a ZIP file for importing into another instance.

```bash
curl -sS "${SKILL_HUB_URL}/api/skills/export/@scope/skill-slug" \
  -H "Authorization: Bearer ${SKILL_HUB_API_KEY}" \
  -o skill-package.zip
```

Response: downloadable ZIP file (`@scope_skill-slug.zip`).

## Rules

- API Key required; personal scope by default.
- Domain scope (`@frontend/...`) needs domain owner or admin.
- Submit always `created` — no auto-update of existing skills.
- Import requires Pro/Enterprise plan (or self-hosted mode).
- Import with `force=true` overwrites existing skill with same ID.
- Do not send `author` in submit; import uses SKILL.md frontmatter `metadata.author`.

Full reference: copy from `/install` → **技能沉淀**, or see `lib/install/submit-skill-content.ts` in the Skill Hub repo.
