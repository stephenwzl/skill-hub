# Skill Hub

**[English](#features) | [中文文档](docs/README.zh-CN.md)**

A self-hosted experience skill pool for AI agents and teams. Store, search, and reuse technical knowledge across Cursor, Codex, Claude Code, and any AI coding assistant.

---

## Features

- **SKILL.md Standard** — Skills follow the [Agent Skills open standard](https://github.com/RiverOnVenus/agent-skills-standard) with YAML frontmatter, fully editable in any text editor
- **Hybrid Search** — Keyword + vector embedding search powered by a local ONNX model (multilingual-e5-small, 384-dim) with sqlite-vec acceleration
- **Agent-Native APIs** — Plain-text endpoints designed for AI agent consumption; built-in skill packs for Claude Code / Codex auto-query and auto-submit
- **LLM-Powered Matching** — Semantic skill matching and automatic skill compaction via OpenAI-compatible LLM APIs
- **ZIP Import / Export** — Share skills as `.zip` archives containing `SKILL.md` + `scripts/` + `references/` + `assets/`
- **Filesystem-First Storage** — Full content lives on disk (`data/skills/{scope}/{slug}/SKILL.md`); database stores metadata and search summaries; auto-sync on startup
- **Scope-Based Permissions** — `@domain/skill` for team knowledge, `@username/skill` for personal notes; domain owners manage shared scopes
- **Self-Hosted** — Single binary, zero external dependencies. SQLite + local embeddings, no cloud services required

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/stephenwzl/skill-hub.git
cd skill-hub
cp .env.example .env.local
npm install
```

### 2. Configure

Edit `.env.local` — at minimum, set your LLM API key (used for semantic matching and skill compaction):

```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4o-mini
```

> The embedding model runs **locally** (Xenova/multilingual-e5-small via ONNX Runtime). No API key needed for search.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 — log in with the default admin account (`admin@skillhub.local` / `skill-hub-admin`).

### Docker

```bash
cp .env.example .env.local
# Edit .env.local
docker compose up -d
```

Data is persisted in `./data/` via a bind mount.

---

## How It Works

### Skill Format

Every skill is a directory on disk:

```
data/skills/
  frontend/                    # scope (domain or username)
    react-error-boundary/      # slug
      SKILL.md                 # required — frontmatter + markdown
      scripts/                 # optional — executable scripts
      references/             # optional — reference files
      assets/                 # optional — other resources
```

**SKILL.md** uses YAML frontmatter under the `metadata:` namespace, compatible with the Agent Skills open standard:

```yaml
---
name: react-error-boundary
description: React error boundary pattern for graceful error handling
license: MIT
compatibility: Requires React 16+
metadata:
  domain: frontend
  language: typescript
  framework: react
  difficulty: intermediate
  tags: [react, error-handling, boundary]
  author: zhangsan
  version: 1
---

# Problem

React components that throw unhandled errors crash the entire UI...

# Solution

Wrap component trees with an Error Boundary class component...
```

### Startup Sync

On startup, Skill Hub scans `data/skills/` and auto-syncs with the database:

- New `SKILL.md` files → inserted into the database
- Changed files (detected via `content_hash`) → metadata and search summary updated
- Deleted files → skill marked as `deprecated`

This means you can edit skills directly on disk and changes are picked up on the next restart.

### Search Architecture

```
User Query
    │
    ├─► Keyword Search (normalized text matching)
    │       weight: 0.4
    │
    └─► Vector Search (multilingual-e5-small, 384-dim)
            weight: 0.6
            │
            ├─► sqlite-vec (preferred, fast)
            └─► File-based cache (fallback)
```

Results are merged and ranked by combined score.

---

## API Reference

### Skill CRUD

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/skills` | GET | - | List skills (filter by domain, scope, status, search, etc.) |
| `/api/skills` | POST | Required | Create a skill |
| `/api/skills/[...id]` | GET | - | Get skill detail |
| `/api/skills/[...id]` | PUT | Required | Update a skill |
| `/api/skills/[...id]` | DELETE | Required | Delete a skill |

### Agent Endpoints (Plain-Text)

These endpoints return `text/plain` — designed for AI agent consumption:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/skills/agent/list` | GET | List skill metadata catalog |
| `/api/skills/agent/search` | GET | Hybrid search (keyword + vector) |
| `/api/skills/agent/fetch` | POST | Batch fetch skill details (1–20 IDs) |
| `/api/skills/agent/embeddings/status` | GET | Embedding index build status |

### Other Endpoints

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/skills/submit` | POST | Required | Quick submit (problem + solution) |
| `/api/skills/query` | POST | - | LLM-powered semantic matching |
| `/api/skills/compact` | POST | Domain Owner | LLM-powered skill compaction |
| `/api/skills/import` | POST | Required | Import skill from ZIP |
| `/api/skills/export/[...id]` | GET | - | Export skill as ZIP |
| `/api/stats` | GET | - | System statistics |

### Authentication

Two auth methods are supported:

- **Session Cookie** — via `/api/auth/login` (browser)
- **API Key** — via `X-API-Key` header or `Authorization: Bearer <key>` (programmatic)

---

## AI Agent Integration

Skill Hub ships with two built-in skill packs that teach AI agents how to query and submit skills:

### Claude Code / Codex

Visit `/install` after starting the server to get a one-click install prompt. Or manually add:

**Query skills:**
```
Add this skill: http://localhost:3000/api/skills/agent/fetch
```

**Submit skills:**
```
Add this skill with your API key: http://localhost:3000/api/skills/submit
```

### Programmatic Usage

```bash
# Search skills
curl "http://localhost:3000/api/skills/agent/search?q=react+error+boundary&topK=5"

# Fetch skill details
curl -X POST http://localhost:3000/api/skills/agent/fetch \
  -H "Content-Type: application/json" \
  -d '{"ids": ["@frontend/react-error-boundary"]}'

# Submit a skill
curl -X POST http://localhost:3000/api/skills/submit \
  -H "X-API-Key: skh_xxx_yyy" \
  -H "Content-Type: application/json" \
  -d '{"problem": "React errors crash the UI", "solution": "Use Error Boundaries"}'
```

---

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `LLM_BASE_URL` | — | OpenAI-compatible API base URL |
| `LLM_API_KEY` | — | API key for LLM service |
| `LLM_MODEL` | `gpt-4o-mini` | Model name for semantic matching |
| `SKILL_HUB_DB_PATH` | `data/skill-hub.sqlite` | SQLite database path |
| `SKILL_HUB_SKILLS_DIR` | `data/skills` | Skill files directory |
| `SQLITE_VEC_PATH` | auto | Path to sqlite-vec extension |
| `ADMIN_EMAIL` | `admin@skillhub.local` | Admin email (created on first launch) |
| `ADMIN_PASSWORD` | `skill-hub-admin` | Admin password (change in production!) |
| `ALLOWED_EMAIL_DOMAIN` | *(empty = any)* | Restrict registration to this email domain |
| `SELF_HOSTED` | `true` | Unlock all features without subscription |
| `COOKIE_SECURE` | auto | Set `false` for HTTP deployments |

---

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **SQLite** via better-sqlite3 + **sqlite-vec** for vector search
- **ONNX Runtime** — multilingual-e5-small (384-dim) embedding model runs locally
- **Vercel AI SDK** — OpenAI-compatible LLM integration
- **Tailwind CSS 4** + **shadcn/ui** for the frontend
- **gray-matter** for SKILL.md frontmatter parsing
- **adm-zip** for ZIP import/export

---

## Project Structure

```
skill-hub/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (skills, auth, admin, stats)
│   └── *.tsx              # Frontend pages
├── lib/
│   ├── auth/              # Authentication & permissions
│   ├── db/                # SQLite client & schema
│   ├── embeddings/        # Embedding model, vector store, search
│   ├── llm/               # LLM client, skill matching, compaction
│   ├── skills/            # Core skill logic (storage, fs, frontmatter, sync)
│   └── install/           # Agent install prompt content
├── skills/                # Built-in skill packs (query + submit)
├── data/                  # Runtime data (gitignored)
│   ├── skill-hub.sqlite   # Database
│   └── skills/            # Skill files on disk
└── scripts/               # Utility scripts
```

---

## License

[MIT](LICENSE)
