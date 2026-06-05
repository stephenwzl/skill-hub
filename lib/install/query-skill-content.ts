export function buildSkillHubQuerySkillContent(host: string): string {
  return `Install or update the skill-hub-query skill. Write the content below (from --- to end) to the corresponding SKILL.md file.

---
name: skill-hub-query
description: Query Skill Hub for reusable team skills using catalog list, keyword search, and batch detail fetch. Use when encountering technical problems, before implementing fixes, or when the user asks to search Skill Hub.
---

# Skill Hub Query

## When to use

Use this skill when you need to check whether the team already documented a solution before writing new code or debugging from scratch.

Typical triggers:
- A concrete technical problem or error message
- User asks to query Skill Hub / skill library / team experience
- You want to reuse prior solutions for a stack, library, or workflow

## APIs

All query endpoints return **plain text** (\`text/plain\`) for easy agent consumption.

### 1. List all skill metadata

\`\`\`bash
curl -sS "${host}/api/skills/agent/list"
\`\`\`

Optional filters: \`status\`, \`domain\`, \`scope\`

### 2. Hybrid search (keywords + embeddings)

\`\`\`bash
curl -sS "${host}/api/skills/agent/search?q=react+native"
\`\`\`

Optional: \`format=json\`, \`topK\`, \`status\`, \`domain\`, \`scope\`, \`wait=1\`

### 3. Batch fetch skill details

\`\`\`bash
curl -sS -X POST "${host}/api/skills/agent/fetch" \\
  -H "Content-Type: application/json" \\
  -d '{"ids":["@frontend/my-skill","@user/another-skill"]}'
\`\`\`

### 4. Import a skill from ZIP

\`\`\`bash
curl -sS -X POST "${host}/api/skills/import" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -F "file=@skill-package.zip" \\
  -F "force=false"
\`\`\`

ZIP must contain \`{scope}/{slug}/SKILL.md\` with frontmatter.

### 5. Export a skill as ZIP

\`\`\`bash
curl -sS "${host}/api/skills/export/@scope/skill-slug" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -o skill-package.zip
\`\`\`

## Decision guide

| Situation | Action |
| --- | --- |
| Broad exploration | \`GET /api/skills/agent/list\` |
| You know keywords | \`GET /api/skills/agent/search?q=...\` |
| You have specific skill IDs | \`POST /api/skills/agent/fetch\` |
| List/search empty | Solve normally; consider submit if reusable |

## Rules

1. Prefer **search** over loading the full catalog when you have meaningful keywords.
2. Fetch **at most the skills you need** (batch up to 20 IDs per request).
3. Skill IDs are exact strings like \`@scope/slug\`.
4. Do not guess skill content; always fetch before citing.
`;
}
