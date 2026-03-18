import os
import resend
from jinja2 import Environment, FileSystemLoader

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@stayontrack.app")
FROM_NAME = "Stay on Track"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

_template_env = Environment(
    loader=FileSystemLoader("app/templates/email"),
    autoescape=True,
)


def _render(template_name: str, **kwargs) -> str:
    return _template_env.get_template(template_name).render(
        **kwargs, frontend_url=FRONTEND_URL
    )


def _send(to: str, subject: str, html: str) -> None:
    if not RESEND_API_KEY or RESEND_API_KEY == "re_your_api_key_here":
        return
    resend.api_key = RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
    except Exception:
        pass  # Email failures must never break the main request flow


def send_welcome_email(to: str, full_name: str) -> None:
    html = _render("welcome.html", full_name=full_name)
    _send(to, "Welcome to Stay on Track", html)


def send_invite_email(to: str, inviter_name: str, project_name: str) -> None:
    html = _render("invite.html", inviter_name=inviter_name, project_name=project_name)
    _send(to, f"You've been added to {project_name} on Stay on Track", html)


def send_task_assigned_email(
    to: str, assignee_name: str, task_title: str, project_name: str
) -> None:
    html = _render(
        "task_assigned.html",
        assignee_name=assignee_name,
        task_title=task_title,
        project_name=project_name,
    )
    _send(to, f"Task assigned to you: {task_title}", html)


def send_password_reset_email(to: str, full_name: str, reset_token: str) -> None:
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    html = _render("password_reset.html", full_name=full_name, reset_url=reset_url)
    _send(to, "Reset your Stay on Track password", html)
