import crypto from "crypto";
import type { SkillDetail } from "@/lib/skills/types";
import { SKILL_CONTENT_EMBED_MAX_CHARS, SKILL_REFERENCES_EMBED_MAX_CHARS, SKILL_SCRIPTS_EMBED_MAX_CHARS } from "./constants";

export function buildSkillEmbeddingText(skill: SkillDetail): string {
  const content = skill.content.slice(0, SKILL_CONTENT_EMBED_MAX_CHARS);
  // Sort by filename for deterministic output across calls
  const referencesText = [...skill.references]
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .map((r) => r.content)
    .join("\n")
    .slice(0, SKILL_REFERENCES_EMBED_MAX_CHARS);
  const scriptsText = [...skill.scripts]
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .map((s) => s.content)
    .join("\n")
    .slice(0, SKILL_SCRIPTS_EMBED_MAX_CHARS);

  return [
    skill.id,
    skill.name,
    skill.domain,
    skill.tags.join(", "),
    skill.description,
    skill.language,
    skill.framework,
    content,
    referencesText,
    scriptsText,
  ]
    .filter(Boolean)
    .join("\n");
}

export function computeSkillEmbeddingFingerprint(skill: SkillDetail): string {
  return crypto
    .createHash("sha256")
    .update(skill.status)
    .update("\n")
    .update(buildSkillEmbeddingText(skill))
    .digest("hex");
}
