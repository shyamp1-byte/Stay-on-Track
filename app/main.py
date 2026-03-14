from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.api import auth, projects, tasks, task_actions, members
from app.core.observability import observability_middleware
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(task_actions.router)
app.include_router(members.router)
app.middleware("http")(observability_middleware)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request, "app_name": "Strato Track"})

@app.get("/db/ping")
def db_ping(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    return {"ok": True}

@app.get("/__version")
def version():
    return {"version": "cors-fix-1"}