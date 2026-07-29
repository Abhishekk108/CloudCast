# CloudCast 🌤️

A full-stack AI weather agent that answers natural-language weather questions with real-time data. Ask things like:

- "Will it rain in Pune tomorrow?"
- "Should I carry an umbrella this evening in Mumbai?"
- "Compare weather in Delhi and Bangalore this weekend"

CloudCast uses an LLM (Groq) as an orchestration layer — it decides which weather tools to call, interprets the structured results, and replies in plain language. Every factual claim is grounded in a live WeatherAPI.com call, never invented.

---

## Architecture

```
React Frontend  ──▶  Express API (Agent Server)  ──▶  Groq (LLM tool-calling)
                                │
                                ▼
                        WeatherAPI.com
```

The core loop: user message → LLM reasons → tool call → weather data → LLM reasons → natural-language reply. The agent supports multi-step tool chaining (e.g. disambiguating a city with `search_location` before fetching its forecast) and parallel tool calls for multi-city comparisons — all in a single turn.

---

## Features

- **Natural-language weather queries** — current conditions, multi-day forecasts, alerts, astronomy data
- **Tool-calling agent loop** — LLM decides which endpoint to call; every number is traceable to a real API response
- **Streaming replies** — token-by-token SSE so the UI feels instant
- **Weather card UI** — structured temperature/condition widget rendered alongside the chat reply
- **Graceful degradation** — WeatherAPI or Groq outages return a friendly message, not a 500
- **In-memory caching** — identical weather requests within a TTL window skip the network call
- **Rate limiting** — `/api/chat` is rate-limited per IP to control LLM cost
- **Input validation** — all request bodies validated with Zod; clear 400 errors on bad input
- **Structured logging** — every turn logs conversationId, tools called, latency, and token usage

---

## Tech Stack

| Layer      | Technology                                           |
|------------|------------------------------------------------------|
| Frontend   | React 19 (Vite) + Tailwind CSS v4                    |
| Backend    | Node.js 20+, Express                                 |
| LLM        | Groq API (`openai/gpt-oss-120b`)                     |
| Weather    | WeatherAPI.com                                       |
| Validation | Zod                                                  |
| Logging    | Pino + pino-http                                     |
| Testing    | Vitest + Jest + Supertest + React Testing Library    |

> **Note on Groq models:** `llama-3.3-70b-versatile` was decommissioned by Groq in June 2026. The current default is `openai/gpt-oss-120b`. Override via the `GROQ_MODEL` env var if needed — see [Groq deprecations](https://console.groq.com/docs/deprecations).

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Groq API key](https://console.groq.com/)
- A [WeatherAPI.com API key](https://www.weatherapi.com/)

### 1. Clone and install

```bash
git clone <repo-url>
cd cloudcast

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
NODE_ENV=development
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-120b
WEATHER_API_KEY=your_weatherapi_key
```

```bash
# Frontend
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Start development servers

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173) and start asking weather questions.

---

## Project Structure

```
cloudcast/
├── backend/
│   ├── src/
│   │   ├── agent/          # LLM orchestration loop, system prompt, tool schemas
│   │   ├── controllers/    # HTTP request/response handlers (chat, stream)
│   │   ├── middleware/     # Error handler, rate limiter, request validator
│   │   ├── routes/         # Express route definitions
│   │   ├── services/       # Groq client, WeatherAPI client, normalizers
│   │   ├── tools/          # Tool registry (name → schema + execute())
│   │   ├── utils/          # TTL cache, structured logger
│   │   └── config/         # Env var validation (Zod, fail-fast on startup)
│   └── tests/
│       ├── unit/           # 8 unit test files (agent, tools, client, normalizers, cache…)
│       └── integration/    # Supertest tests for /api/chat, /api/chat/stream, degradation
├── frontend/
│   ├── src/
│   │   ├── components/     # Chat/, WeatherCard/, common/
│   │   ├── hooks/          # useChat (conversation state, retry, streaming)
│   │   └── services/       # api.js fetch wrapper
│   └── src/tests/          # Vitest + React Testing Library component tests
├── docs/
│   ├── context.md          # Full architecture reference
│   └── tasks.md            # Phase-by-phase implementation checklist
└── README.md
```

---

## API Reference

### `POST /api/chat`

Send a message and receive a full JSON response.

**Request**
```json
{
  "message": "Will it rain in Pune tomorrow?",
  "conversationId": "optional-uuid",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! Ask me about the weather." }
  ]
}
```

**Response `200`**
```json
{
  "reply": "Tomorrow in Pune looks mostly cloudy with a 60% chance of rain around 6–9 PM.",
  "toolCalls": [
    {
      "tool": "get_forecast",
      "args": { "location": "Pune", "days": 2 },
      "result": { "forecast": [ { "date": "...", "chanceOfRainPct": 60 } ] }
    }
  ],
  "conversationId": "uuid",
  "usage": { "prompt_tokens": 512, "completion_tokens": 88 }
}
```

### `POST /api/chat/stream`

Same request body; streams the reply token-by-token via SSE.

```
data: {"type":"tool","tool":"get_forecast","args":{...}}
data: {"type":"token","token":"Tomorrow "}
data: {"type":"token","token":"in Pune "}
...
data: {"type":"done","conversationId":"uuid","toolCalls":[...]}
```

### `GET /api/health`

```json
{ "status": "ok", "uptime": 123.4 }
```

---

## Available Scripts

### Backend (`backend/`)

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `npm run dev`         | Start dev server with nodemon            |
| `npm start`           | Start production server                  |
| `npm run lint`        | Run ESLint                               |
| `npm run test`        | Run full test suite (136 tests)          |
| `npm run test:coverage` | Run tests with coverage report         |

### Frontend (`frontend/`)

| Script          | Description                              |
|-----------------|------------------------------------------|
| `npm run dev`   | Start Vite dev server                    |
| `npm run build` | Build for production                     |
| `npm run lint`  | Run ESLint                               |
| `npm run test`  | Run test suite (46 tests)                |

---

## Contributing

1. Branch off `main`: `git checkout -b feat/<short-name>`
2. Commit using Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
3. Run `npm run lint && npm run test` in both `backend/` and `frontend/` before pushing
4. Open a PR — CI must pass before merging
