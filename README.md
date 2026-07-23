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

The core loop: user message → LLM reasons → tool call → weather data → LLM reasons → natural-language reply.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18 (Vite) + Tailwind CSS                  |
| Backend    | Node.js 20+, Express                            |
| LLM        | Groq API (`llama-3.3-70b-versatile`)            |
| Weather    | WeatherAPI.com                                  |
| Validation | Zod                                             |
| Logging    | Pino                                            |
| Testing    | Vitest / Jest + Supertest + React Testing Library |

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

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in:
#   GROQ_API_KEY=your_groq_key
#   WEATHER_API_KEY=your_weatherapi_key

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env and fill in:
#   VITE_API_BASE_URL=http://localhost:5000
```

### 3. Start development servers

Open two terminals:

```bash
# Terminal 1 — backend (runs on http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — frontend (runs on http://localhost:5173)
cd frontend
npm run dev
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173) and start asking weather questions.

---

## Project Structure

```
cloudcast/
├── backend/        # Express API + AI agent logic
├── frontend/       # React chat UI
├── docs/           # Project context and task breakdown
├── .gitignore
└── README.md
```

See [`docs/context.md`](docs/context.md) for full architecture details and [`docs/tasks.md`](docs/tasks.md) for the implementation task breakdown.

---

## Available Scripts

### Backend (`backend/`)

| Script          | Description                        |
|-----------------|------------------------------------|
| `npm run dev`   | Start dev server with nodemon      |
| `npm start`     | Start production server            |
| `npm run lint`  | Run ESLint                         |
| `npm run test`  | Run test suite                     |

### Frontend (`frontend/`)

| Script          | Description                        |
|-----------------|------------------------------------|
| `npm run dev`   | Start Vite dev server              |
| `npm run build` | Build for production               |
| `npm run lint`  | Run ESLint                         |
| `npm run test`  | Run test suite                     |

---

## Contributing

1. Branch off `main`: `git checkout -b feat/<short-name>`
2. Commit using Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`
3. Run `npm run lint && npm run test` before pushing
4. Open a PR — CI must pass before merging
