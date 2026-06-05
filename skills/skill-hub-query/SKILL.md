---
name: skill-hub-query
description: Query Skill Hub for reusable team skills using catalog list, keyword search, and batch detail fetch. Use when encountering technical problems, before implementing fixes, or when the user asks to search Skill Hub, 查询技能库, or check for existing team experience.
---

# Skill Hub Query

Replace `SKILL_HUB_URL` with your Skill Hub base URL (e.g. `http://localhost:3000`).

## APIs (plain text responses)

### List all metadata

```bash
curl -sS "${SKILL_HUB_URL}/api/skills/agent/list"
```

Optional: `?status=active&domain=frontend&scope=frontend`

### Keyword search

```bash
curl -sS "${SKILL_HUB_URL}/api/skills/agent/search?q=your+keywords"
```

Params: `q` / `keyword` / `search` (required). Same optional filters as list.

### Batch fetch details

```bash
curl -sS -X POST "${SKILL_HUB_URL}/api/skills/agent/fetch" \
  -H "Content-Type: application/json" \
  -d '{"ids":["@scope/skill-slug"]}'
```

Body: `ids` — array of 1–20 skill IDs.

## Workflow

1. `search?q=...` or `list` → read metadata, note relevant `ID:` values.
2. `fetch` with those IDs → read full SKILL.md content.
3. Apply to the current problem; submit new experience separately if needed.
