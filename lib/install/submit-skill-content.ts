export function buildSkillHubSubmitSkillContent(host: string): string {
  return `Install or update the skill-hub-submit skill. Write the content below (from --- to end) to the corresponding SKILL.md file.

---
name: skill-hub-submit
description: Submit reusable technical experience to Skill Hub after solving a problem. Requires Skill Hub API Key.
---

# Skill Hub Submit

## When to use

Submit only after you **successfully solved** a problem with **reuse value** for the team.

Skip submission when:
- The issue is not verified or still speculative
- The answer is trivial or one-off
- The lesson contains secrets

## API

\`\`\`bash
curl -sS -X POST "${host}/api/skills/submit" \\
  -H "Authorization: Bearer <SKILL_HUB_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "problem": "Concrete symptom or error message",
    "solution": "Steps, commands, and key code that fixed it",
    "context": "Stack, versions, repo constraints (optional)",
    "language": "typescript",
    "framework": "react"
  }'
\`\`\`

Alternative header: \`X-API-Key: <SKILL_HUB_API_KEY>\`

### Request fields

| Field | Required | Description |
| --- | --- | --- |
| \`problem\` | yes | What went wrong — specific symptoms |
| \`solution\` | yes | How it was fixed — commands, config, code |
| \`context\` | no | Stack, OS, versions, repo layout |
| \`scope\` | no | Target scope without \`@\`, e.g. \`frontend\` |
| \`id\` | no | Full ID \`@scope/slug\` |
| \`name\` | no | Display name; default: first line of problem |
| \`domain\` | no | One of: frontend, backend, devops, database, security, testing, architecture, performance, ai-ml, general |
| \`tags\` | no | String array; default: \`["submitted"]\` |
| \`language\` | no | Programming language |
| \`framework\` | no | Framework or library |
| \`force\` | no | Boolean. Overwrite existing skill |

### Response (JSON)

\`\`\`json
{ "action": "created", "skillId": "@user.name/my-skill", "skillName": "My Skill" }
\`\`\`

## Workflow

1. Confirm the problem is solved and worth reusing.
2. Search Skill Hub for overlapping skills.
3. Draft \`problem\`, \`solution\`, optional \`context\` — remove secrets.
4. POST to \`/api/skills/submit\` with API Key.
5. Report \`skillId\` and \`skillName\` to the user.
`;
}
