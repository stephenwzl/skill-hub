# Skill Hub

**[English](../README.md) | [中文文档](#功能特性)**

一个面向 AI Agent 和团队的自托管经验技能池。存储、搜索、复用技术知识，支持 Cursor、Codex、Claude Code 等任何 AI 编程助手。

---

## 功能特性

- **SKILL.md 标准** — 技能遵循 [Agent Skills 开放标准](https://github.com/RiverOnVenus/agent-skills-standard)，使用 YAML frontmatter 格式，任何文本编辑器均可直接编辑
- **混合搜索** — 关键词 + 向量嵌入搜索，基于本地 ONNX 模型（multilingual-e5-small，384 维），sqlite-vec 加速
- **Agent 原生 API** — 纯文本端点专为 AI Agent 消费设计；内置 Claude Code / Codex 自动查询和自动提交技能包
- **LLM 语义匹配** — 通过 OpenAI 兼容的 LLM API 实现语义技能匹配和自动技能合并
- **ZIP 导入/导出** — 以 `.zip` 归档分享技能，包含 `SKILL.md` + `scripts/` + `references/` + `assets/`
- **文件系统优先存储** — 完整内容存于磁盘（`data/skills/{scope}/{slug}/SKILL.md`）；数据库存储元数据和搜索摘要；启动时自动同步
- **Scope 权限模型** — `@domain/skill` 用于团队知识，`@username/skill` 用于个人笔记；Domain Owner 管理共享 scope
- **自托管** — 单进程部署，零外部依赖。SQLite + 本地嵌入模型，无需云服务

---

## 快速上手

### 1. 克隆与安装

```bash
git clone https://github.com/stephenwzl/skill-hub.git
cd skill-hub
cp .env.example .env.local
npm install
```

### 2. 配置

编辑 `.env.local` — 至少设置 LLM API Key（用于语义匹配和技能合并）：

```bash
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4o-mini
```

> 嵌入模型**本地运行**（Xenova/multilingual-e5-small，通过 ONNX Runtime）。搜索功能无需 API Key。

### 3. 启动

```bash
npm run dev
```

打开 http://localhost:3000 — 使用默认管理员账号登录（`admin@skillhub.local` / `skill-hub-admin`）。

### Docker 部署

```bash
cp .env.example .env.local
# 编辑 .env.local
docker compose up -d
```

数据通过 bind mount 持久化到 `./data/` 目录。

---

## 工作原理

### 技能格式

每个技能是磁盘上的一个目录：

```
data/skills/
  frontend/                    # scope（领域或用户名）
    react-error-boundary/      # slug
      SKILL.md                 # 必需 — frontmatter + markdown 正文
      scripts/                 # 可选 — 可执行脚本
      references/             # 可选 — 参考文件
      assets/                 # 可选 — 其他资源
```

**SKILL.md** 使用 `metadata:` 命名空间下的 YAML frontmatter，兼容 Agent Skills 开放标准：

```yaml
---
name: react-error-boundary
description: React 错误边界模式，用于优雅的错误处理
license: MIT
compatibility: 需要 React 16+
metadata:
  domain: frontend
  language: typescript
  framework: react
  difficulty: intermediate
  tags: [react, error-handling, boundary]
  author: zhangsan
  version: 1
---

# 问题描述

React 组件抛出未处理的错误会导致整个 UI 崩溃...

# 解决方案

使用 Error Boundary 类组件包裹组件树...
```

### 启动同步

启动时，Skill Hub 扫描 `data/skills/` 并自动与数据库同步：

- 新增的 `SKILL.md` 文件 → 插入数据库
- 内容变更的文件（通过 `content_hash` 检测）→ 更新元数据和搜索摘要
- 已删除的文件 → 技能标记为 `deprecated`

这意味着你可以直接在磁盘上编辑技能，下次重启时变更会自动同步。

### 搜索架构

```
用户查询
    │
    ├─► 关键词搜索（归一化文本匹配）
    │       权重: 0.4
    │
    └─► 向量搜索（multilingual-e5-small, 384维）
            权重: 0.6
            │
            ├─► sqlite-vec（优先，快速）
            └─► 文件缓存（回退方案）
```

结果按综合得分合并排序。

---

## API 参考

### 技能 CRUD

| 端点 | 方法 | 认证 | 说明 |
| --- | --- | --- | --- |
| `/api/skills` | GET | 无 | 列出技能（支持 domain、scope、status、search 等过滤） |
| `/api/skills` | POST | 需要 | 创建技能 |
| `/api/skills/[...id]` | GET | 无 | 获取技能详情 |
| `/api/skills/[...id]` | PUT | 需要 | 更新技能 |
| `/api/skills/[...id]` | DELETE | 需要 | 删除技能 |

### Agent 端点（纯文本）

这些端点返回 `text/plain` — 专为 AI Agent 消费设计：

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/skills/agent/list` | GET | 列出技能元数据目录 |
| `/api/skills/agent/search` | GET | 混合搜索（关键词 + 向量） |
| `/api/skills/agent/fetch` | POST | 批量获取技能详情（1–20 个 ID） |
| `/api/skills/agent/embeddings/status` | GET | 嵌入索引构建状态 |

### 其他端点

| 端点 | 方法 | 认证 | 说明 |
| --- | --- | --- | --- |
| `/api/skills/submit` | POST | 需要 | 快速提交（problem + solution） |
| `/api/skills/query` | POST | 无 | LLM 语义匹配 |
| `/api/skills/compact` | POST | Domain Owner | LLM 技能合并 |
| `/api/skills/import` | POST | 需要 | 从 ZIP 导入技能 |
| `/api/skills/export/[...id]` | GET | 无 | 导出技能为 ZIP |
| `/api/stats` | GET | 无 | 系统统计 |

### 认证方式

支持两种认证方式：

- **Session Cookie** — 通过 `/api/auth/login`（浏览器）
- **API Key** — 通过 `X-API-Key` 头或 `Authorization: Bearer <key>`（编程调用）

---

## AI Agent 集成

Skill Hub 内置两个技能包，教会 AI Agent 如何查询和提交技能：

### Claude Code / Codex

启动服务后访问 `/install` 获取一键安装提示。或手动添加：

**查询技能：**
```
Add this skill: http://localhost:3000/api/skills/agent/fetch
```

**提交技能：**
```
Add this skill with your API key: http://localhost:3000/api/skills/submit
```

### 编程调用

```bash
# 搜索技能
curl "http://localhost:3000/api/skills/agent/search?q=react+error+boundary&topK=5"

# 获取技能详情
curl -X POST http://localhost:3000/api/skills/agent/fetch \
  -H "Content-Type: application/json" \
  -d '{"ids": ["@frontend/react-error-boundary"]}'

# 提交技能
curl -X POST http://localhost:3000/api/skills/submit \
  -H "X-API-Key: skh_xxx_yyy" \
  -H "Content-Type: application/json" \
  -d '{"problem": "React 错误导致 UI 崩溃", "solution": "使用 Error Boundary"}'
```

---

## 配置项

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_BASE_URL` | — | OpenAI 兼容 API 基础 URL |
| `LLM_API_KEY` | — | LLM 服务 API Key |
| `LLM_MODEL` | `gpt-4o-mini` | 语义匹配使用的模型名 |
| `SKILL_HUB_DB_PATH` | `data/skill-hub.sqlite` | SQLite 数据库路径 |
| `SKILL_HUB_SKILLS_DIR` | `data/skills` | 技能文件目录 |
| `SQLITE_VEC_PATH` | 自动检测 | sqlite-vec 扩展路径 |
| `ADMIN_EMAIL` | `admin@skillhub.local` | 管理员邮箱（首次启动创建） |
| `ADMIN_PASSWORD` | `skill-hub-admin` | 管理员密码（生产环境请修改！） |
| `ALLOWED_EMAIL_DOMAIN` | *（空 = 任意）* | 限制注册邮箱域名 |
| `SELF_HOSTED` | `true` | 自托管模式，解锁全部功能 |
| `COOKIE_SECURE` | 自动 | HTTP 部署时设为 `false` |

---

## 技术栈

- **Next.js 16**（App Router）+ **React 19**
- **SQLite**（better-sqlite3）+ **sqlite-vec** 向量搜索
- **ONNX Runtime** — multilingual-e5-small（384 维）嵌入模型本地运行
- **Vercel AI SDK** — OpenAI 兼容 LLM 集成
- **Tailwind CSS 4** + **shadcn/ui** 前端
- **gray-matter** SKILL.md frontmatter 解析
- **adm-zip** ZIP 导入/导出

---

## 项目结构

```
skill-hub/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由（skills, auth, admin, stats）
│   └── *.tsx              # 前端页面
├── lib/
│   ├── auth/              # 认证与权限
│   ├── db/                # SQLite 客户端与 Schema
│   ├── embeddings/        # 嵌入模型、向量存储、搜索
│   ├── llm/               # LLM 客户端、技能匹配、合并
│   ├── skills/            # 核心技能逻辑（storage, fs, frontmatter, sync）
│   └── install/           # Agent 安装提示内容
├── skills/                # 内置技能包（query + submit）
├── data/                  # 运行时数据（已 gitignore）
│   ├── skill-hub.sqlite   # 数据库
│   └── skills/            # 磁盘上的技能文件
└── scripts/               # 工具脚本
```

---

## 许可证

[MIT](../LICENSE)
