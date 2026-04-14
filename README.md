# Zirak – AI Agent Workspace

A multi-agent AI assistant with a real-time collaborative workspace.  
Users submit a natural-language task; a pipeline of AutoGen agents analyses,
decomposes, and executes it using 13+ built-in tools (file ops, terminal,
web search, code execution, …) while the frontend streams every step live via
WebSocket.

---

## Architecture

```
┌────────────────────────────────────────────────┐
│  Next.js 15 Frontend  (my-app/)                │
│                                                │
│  /chat ─── Socket.IO ──▶  Flask-SocketIO       │
└────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────┐
│  Flask Backend  (Backend/)                     │
│                                                │
│  server.py                                     │
│   └─ conversation_workflow()                   │
│       └─ AutoGen GroupChat                     │
│           ├─ UserProxyAgent  (user I/O)        │
│           ├─ CentralAgent    (analyse / plan)  │
│           └─ LLM_Agent       (execute via MCP) │
│                │                               │
│                ▼ SSE                           │
│        mcp_server.py  (:3002)                  │
│         └─ 13 tools                            │
└────────────────────────────────────────────────┘
                        │
                        ▼
         Supabase  (auth + PostgreSQL)
```

### Agent roles

| Agent | Responsibility |
|---|---|
| `UserProxyAgent` | Collects queries; surfaces clarification questions back via WebSocket |
| `CentralAgent` | Analyses the request, resolves ambiguities, produces a step-by-step execution plan, evaluates LLM output |
| `LLM_Agent` | Executes each step by calling tools through the MCP server |

### Tool catalogue

`BrowserTool` · `CreateFoldersTool` · `DiffEditorTool` · `DuckDuckGoTool` ·
`E2bCodeTool` · `FileContentReaderTool` · `FileCreatorTool` · `FileEditTool` ·
`LintingTool` · `ScreenshotTool` · `TerminalCommandTool` · `UVPackageManager` ·
`WebScraperTool`

---

## Prerequisites

| Tool | Min version |
|---|---|
| Python | 3.10 |
| Node.js | 18 |
| [uv](https://docs.astral.sh/uv/) | latest |

---

## Quick start

### 1 – Clone

```bash
git clone https://github.com/<you>/zirak.git
cd zirak
```

### 2 – Configure environment variables

```bash
# Backend
cp Backend/.env.example Backend/.env
# → fill in OPENAI_API_KEY + SECRET_KEY at minimum

# Frontend
cp my-app/.env.example my-app/.env.local
# → fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3 – Install dependencies

```bash
# Backend (uv resolves from pyproject.toml)
uv sync

# Frontend
cd my-app && npm install && cd ..
```

### 4 – Start the MCP tool server

```bash
cd Backend
python mcp_server.py          # listens on :3002
```

### 5 – Start the Flask backend

```bash
# in a new terminal
cd Backend
python main.py                # listens on :5001
```

### 6 – Start the Next.js frontend

```bash
# in a new terminal
cd my-app
npm run dev                   # listens on :3000
```

Open [http://localhost:3000/chat](http://localhost:3000/chat) — sign in and
start chatting.

---

## Environment variables

### Backend (`Backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | – | OpenAI API key |
| `ANTHROPIC_API_KEY` | – | – | Anthropic key (if switching to Claude) |
| `DEEPSEEK_API_KEY` | – | – | DeepSeek key (swap provider in `config.py`) |
| `MCP_SERVER_URL` | – | `http://localhost:3002/sse` | Running MCP server |
| `PORT` | – | `5001` | Flask listen port |
| `DEBUG` | – | `false` | Flask debug mode |
| `SECRET_KEY` | ✅ | random bytes | Flask session secret |
| `ALLOWED_ORIGINS` | – | `*` | Comma-separated CORS origins |
| `E2B_API_KEY` | – | – | [E2B](https://e2b.dev) sandbox (optional) |
| `LOG_LEVEL` | – | `INFO` | Python log level |

### Frontend (`my-app/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |

---

## Project structure

```
Zirak/
├── Backend/
│   ├── main.py                        # Entry point: python main.py
│   ├── mcp_server.py                  # MCP SSE tool server (:3002)
│   ├── app/
│   │   ├── __init__.py                # Flask app factory (create_app)
│   │   ├── config.py                  # Centralised config (env-var backed)
│   │   ├── extensions.py              # Flask-SocketIO singleton
│   │   ├── agents/
│   │   │   ├── central_agent.py       # Analyse / plan / evaluate
│   │   │   ├── llm_agent.py           # Tool-calling execution agent
│   │   │   ├── user_proxy_agent.py    # User-facing proxy agent
│   │   │   ├── agent_manager.py       # GroupChat construction
│   │   │   ├── workflow.py            # Conversation orchestration
│   │   │   ├── tools/                 # 13 MCP tool implementations
│   │   │   └── prompts/               # System prompt strings
│   │   └── routes/
│   │       ├── http.py                # REST Blueprint (/, /health, /api/query)
│   │       └── socket.py              # SocketIO event handlers + workflow state
│   ├── tests/
│   │   ├── conftest.py                # Shared fixtures (Flask app, mock OpenAI)
│   │   ├── unit/
│   │   │   ├── agents/
│   │   │   │   ├── test_central_agent.py  # analyse / transform / decompose / evaluate
│   │   │   │   └── test_workflow.py       # workflow orchestration
│   │   │   └── tools/
│   │   │       └── test_tools.py          # MCP tool implementations
│   │   └── integration/
│   │       └── test_http.py               # HTTP endpoint behaviour
│   └── .env.example
│
└── my-app/                            # Next.js 15 frontend
    ├── src/
    │   ├── app/
    │   │   ├── chat/page.tsx           # Main AI workspace
    │   │   ├── dashboard/              # User dashboard
    │   │   ├── (auth-pages)/           # Sign-in / sign-up / reset
    │   │   ├── contexts/
    │   │   │   └── WebSocketContext.tsx # Socket.IO state + backend URL resolution
    │   │   └── api/                    # Next.js API routes
    │   ├── components/chat/            # Chat UI components
    │   └── utils/supabase/             # Supabase client helpers
    └── .env.example
```

---

## Development notes

**Concurrency** – The AutoGen group chat currently uses shared agent
instances.  Only one workflow should run at a time.  For multi-tenant
concurrency, instantiate fresh agents inside `conversation_workflow`.

**Switching LLM provider** – Edit the three lines under *Active LLM
configuration* in `Backend/Agents/config.py` to point at DeepSeek or
Anthropic credentials.

**Adding a tool** – Subclass `BaseTool` in `Backend/Agents/tools/`, then add
an instance to the `tools_instances` dict in `mcp_server.py`.

**Security** – Never commit `Backend/OAI_CONFIG_LIST` or any `.env` file.
Both are gitignored.  Rotate API keys if they were previously committed.

---

## Contributing

Pull requests are welcome.  For major changes please open an issue first.

## License

MIT
