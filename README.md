# Stay on Track

A full-stack collaborative project management application with an integrated AI assistant that manages tasks and projects through natural language.

![Stay on Track](frontend/public/ai%20chatbot.png)

---

## Overview

Stay on Track lets teams plan projects, organize tasks, and collaborate — with an AI assistant that can create, update, and delete tasks on your behalf through conversation. Built with a FastAPI backend, Next.js frontend, PostgreSQL database, and the Anthropic Claude API.

---

## Features

### Project & Task Management
- Create and manage projects with target due dates and status tracking
- Kanban-style task board with TODO / DOING / DONE columns
- Task priorities (Low, Medium, High) and due date alerts
- Assign tasks to team members
- Invite collaborators by email

### AI Assistant (Powered by Claude)
- Floating chat panel accessible from any page
- Natural language commands: *"Create a task for the homepage redesign, high priority, due Friday"*
- Bulk operations: *"Mark all TODO tasks as done"*
- Global chat on the home page to create entire projects with tasks in one message
- Real-time streaming responses with live UI refresh after mutations

### Authentication
- Email / password registration and login
- Google OAuth 2.0
- JWT access tokens with rotating 7-day refresh tokens
- Password reset via email

### Email Notifications
- Welcome email on signup
- Project invitation emails
- Task assignment notifications

### UI / UX
- Light and dark mode
- Animated landing page
- Responsive sidebar navigation
- Smooth transitions with Motion (Framer Motion)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Database | PostgreSQL 15, SQLAlchemy ORM |
| AI | Anthropic Claude API (`claude-haiku-4-5`), streaming SSE |
| Task Summaries | HuggingFace Inference API |
| Auth | JWT, Refresh tokens, Google OAuth 2.0 |
| Email | Resend API, Jinja2 templates |
| Infrastructure | Docker, Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A [Resend API key](https://resend.com/) (for email)
- A [HuggingFace API token](https://huggingface.co/settings/tokens) (for task summaries)
- Google OAuth credentials (optional — for Google Sign-In)

---

### 1. Clone the repository

```bash
git clone https://github.com/shyamp1-byte/Stay-on-Track.git
cd Stay-on-Track
```

---

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Database (matches docker-compose defaults)
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/stratotrack

# JWT — use a strong random string in production
JWT_SECRET=your-secret-here

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# HuggingFace (task summarization)
HF_API_TOKEN=hf_...

# Resend (transactional email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=you@yourdomain.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Frontend URL (used in email links)
FRONTEND_URL=http://localhost:3000
```

Create a `.env.local` file inside the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

### 3. Start the backend

```bash
docker-compose up
```

This starts PostgreSQL and the FastAPI server. The backend is available at `http://localhost:8000`.

---

### 4. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app is available at `http://localhost:3000`.

---

## Project Structure

```
Stay-on-Track/
├── app/                        # FastAPI backend
│   ├── api/                    # Route handlers (auth, projects, tasks, members, chat)
│   ├── core/                   # Database engine, middleware
│   ├── models/                 # SQLAlchemy ORM models
│   ├── repositories/           # Data access layer
│   ├── schemas/                # Pydantic request/response models
│   ├── services/               # Business logic, JWT, email
│   └── main.py                 # App entry point
├── frontend/                   # Next.js frontend
│   └── app/
│       ├── projects/           # Project list, detail, layout, chat panel
│       ├── login/              # Auth pages
│       └── signup/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── entrypoint.sh
```

---

## How the AI Assistant Works

The assistant uses **Claude's tool use** feature to perform real actions inside the app — not just answer questions.

**Project-scoped chat** (inside a project page):
- `list_tasks` → `create_task` / `update_task` / `update_task_status` / `delete_task`
- `list_members` for assignment

**Global chat** (home page):
- `list_projects` → `create_project` → `create_task`

Responses stream via **Server-Sent Events (SSE)**. After any mutation, the backend emits a `tasks_changed` or `projects_changed` event that triggers a silent UI refresh — no manual page reload needed.

---

## License

MIT
