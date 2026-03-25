from __future__ import annotations

import json
import os
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_session
from .models import (
    AdminAudit,
    AuthSession,
    Program,
    Progress,
    Report,
    Resource,
    SavedResource,
    SupportContact,
    Track,
    User,
)
from .security import (
    SESSION_COOKIE_NAME,
    create_session_token,
    default_session_expiry,
    digest_token,
    hash_password,
    verify_password,
)
from .seed_data import CONTENT_MANIFEST, REPORTING_DEFAULTS, SEED_PROGRAMS, SEED_RESOURCES, SEED_SUPPORT_CONTACTS, SEED_TRACKS


BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_INDEX = BASE_DIR / "index.html"
STATIC_TEST1 = BASE_DIR / "test1.html"
STATIC_SW = BASE_DIR / "sw.js"
STATIC_MANIFEST = BASE_DIR / "site.webmanifest"
DEFAULT_ADMIN_EMAIL = "admin@safeed.local"
DEFAULT_ADMIN_PASSWORD = "SafeEdAdmin123!"
ROLE_OPTIONS = ["learner", "facilitator", "admin"]
REPORT_CATEGORIES = REPORTING_DEFAULTS.get(
    "report_categories",
    ["Harassment", "Digital safety", "Mental health", "Workplace safety", "General support"],
)
REPORT_URGENCY = REPORTING_DEFAULTS.get("report_urgency", ["Standard", "Priority", "Urgent"])
REPORT_STATUSES = REPORTING_DEFAULTS.get("report_statuses", ["New", "In review", "Resolved", "Closed"])
REPORT_FIELDS = REPORTING_DEFAULTS.get("category_fields", {})
REPORT_NEXT_STEPS = REPORTING_DEFAULTS.get("next_steps", {})
LOCALE_DEFAULTS = REPORTING_DEFAULTS.get("locales", {"default": "en-IN", "supported": ["en-IN"]})
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CSRF_COOKIE_NAME = "safeed_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
EXPOSE_ADMIN_DEMO = os.getenv("SAFEED_EXPOSE_ADMIN_DEMO", "").lower() in {"1", "true", "yes"}
LLM_ENDPOINT = os.getenv("SAFEED_LLM_ENDPOINT", "").strip()
LLM_MODEL = os.getenv("SAFEED_LLM_MODEL", "").strip()


class RegisterPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    password: str = Field(min_length=8, max_length=120)
    role: str = Field(default="learner")
    organization: str | None = Field(default=None, max_length=255)


class LoginPayload(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=120)


class QuizSubmissionPayload(BaseModel):
    answers: list[int]


class ReportPayload(BaseModel):
    reporter_name: str = Field(min_length=2, max_length=120)
    reporter_email: str
    category: str
    urgency: str
    preferred_contact: str = Field(default="Email", max_length=80)
    description: str = Field(min_length=20, max_length=3000)
    report_data: dict[str, Any] | None = None


class TrackPayload(BaseModel):
    title: str = Field(min_length=4, max_length=255)
    category: str = Field(min_length=3, max_length=64)
    duration: str = Field(min_length=2, max_length=64)
    audience: str = Field(min_length=4, max_length=255)
    delivery_format: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=20, max_length=2000)
    tags: list[str] = Field(default_factory=list)
    outcomes: list[str] = Field(default_factory=list)
    materials: list[str] = Field(default_factory=list)
    lessons: list[dict[str, Any]] | None = None
    quiz: list[dict[str, Any]] | None = None
    prerequisites: list[str] = Field(default_factory=list)
    pathway: str | None = Field(default=None, max_length=120)
    path_order: int = Field(default=0, ge=0)
    badge: str | None = Field(default=None, max_length=120)
    passing_score: int = Field(default=70, ge=0, le=100)
    completion_criteria: list[str] = Field(default_factory=list)
    source_url: str | None = Field(default=None, max_length=512)
    license: str | None = Field(default=None, max_length=120)
    status: str = Field(default="published", max_length=32)


class ResourcePayload(BaseModel):
    title: str = Field(min_length=4, max_length=255)
    owner: str = Field(min_length=2, max_length=255)
    category: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=20, max_length=2000)
    link: str = Field(min_length=8, max_length=512)
    verified_on: str = Field(min_length=4, max_length=64)
    tags: list[str] = Field(default_factory=list)
    source_url: str | None = Field(default=None, max_length=512)
    license: str | None = Field(default=None, max_length=120)
    status: str = Field(default="active", max_length=32)


class ProgramPayload(BaseModel):
    title: str = Field(min_length=4, max_length=255)
    badge: str = Field(min_length=3, max_length=120)
    summary: str = Field(min_length=20, max_length=2000)
    status: str = Field(default="Active", max_length=40)
    meta: list[str] = Field(default_factory=list)
    source_url: str | None = Field(default=None, max_length=512)
    license: str | None = Field(default=None, max_length=120)


class SupportPayload(BaseModel):
    title: str = Field(min_length=4, max_length=255)
    number: str = Field(min_length=2, max_length=40)
    category: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=20, max_length=2000)
    link: str = Field(min_length=8, max_length=512)
    priority: int = Field(default=100, ge=1, le=999)
    source_url: str | None = Field(default=None, max_length=512)
    license: str | None = Field(default=None, max_length=120)


class ReportStatusPayload(BaseModel):
    status: str = Field(min_length=2, max_length=40)
    admin_notes: str | None = Field(default=None, max_length=4000)
    next_follow_up: str | None = Field(default=None, max_length=40)
    resolution_checklist: list[str] = Field(default_factory=list)


class ImportPayload(BaseModel):
    tracks: list[dict[str, Any]] | None = None
    resources: list[dict[str, Any]] | None = None
    programs: list[dict[str, Any]] | None = None
    support_contacts: list[dict[str, Any]] | None = None
    mode: str = Field(default="merge", max_length=20)


class DraftRequestPayload(BaseModel):
    prompt: str = Field(min_length=8, max_length=800)


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned or f"track-{int(datetime.utcnow().timestamp())}"


def dump_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True)


def load_json(value: str, default: Any | None = None) -> Any:
    if not value:
        return [] if default is None else default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return [] if default is None else default


def normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if not EMAIL_PATTERN.match(normalized):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    return normalized


def serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organization": user.organization or "",
        "createdAt": user.created_at.isoformat(),
    }


def serialize_track(track: Track, progress: Progress | None) -> dict[str, Any]:
    return {
        "id": track.id,
        "slug": track.slug,
        "title": track.title,
        "category": track.category,
        "duration": track.duration,
        "audience": track.audience,
        "deliveryFormat": track.delivery_format,
        "summary": track.summary,
        "tags": load_json(track.tags_json),
        "outcomes": load_json(track.outcomes_json),
        "materials": load_json(track.materials_json),
        "lessons": load_json(track.lessons_json),
        "quiz": load_json(track.quiz_json),
        "prerequisites": load_json(track.prerequisites_json),
        "pathway": track.pathway,
        "pathOrder": track.path_order,
        "badge": track.badge,
        "passingScore": track.passing_score,
        "completionCriteria": load_json(track.completion_criteria_json),
        "sourceUrl": track.source_url,
        "license": track.license,
        "status": track.status,
        "published": track.published,
        "progress": {
            "completed": bool(progress.completed) if progress else False,
            "quizScore": progress.quiz_score if progress else None,
            "lastActivity": progress.last_activity.isoformat() if progress else None,
        },
    }


def serialize_resource(resource: Resource, saved: bool) -> dict[str, Any]:
    return {
        "id": resource.id,
        "title": resource.title,
        "owner": resource.owner,
        "category": resource.category,
        "description": resource.description,
        "link": resource.link,
        "verifiedOn": resource.verified_on,
        "tags": load_json(resource.tags_json),
        "saved": saved,
        "sourceUrl": resource.source_url,
        "license": resource.license,
        "status": resource.status,
    }


def serialize_program(program: Program) -> dict[str, Any]:
    return {
        "id": program.id,
        "title": program.title,
        "badge": program.badge,
        "summary": program.summary,
        "status": program.status,
        "meta": load_json(program.meta_json),
        "sourceUrl": program.source_url,
        "license": program.license,
    }


def serialize_support(contact: SupportContact) -> dict[str, Any]:
    return {
        "id": contact.id,
        "title": contact.title,
        "number": contact.number,
        "category": contact.category,
        "description": contact.description,
        "link": contact.link,
        "priority": contact.priority,
        "sourceUrl": contact.source_url,
        "license": contact.license,
    }


def serialize_report(report: Report) -> dict[str, Any]:
    return {
        "id": report.id,
        "reporterName": report.reporter_name,
        "reporterEmail": report.reporter_email,
        "category": report.category,
        "urgency": report.urgency,
        "preferredContact": report.preferred_contact,
        "description": report.description,
        "status": report.status,
        "createdAt": report.created_at.isoformat(),
        "adminNotes": report.admin_notes or "",
        "nextFollowUp": report.next_follow_up.isoformat() if report.next_follow_up else None,
        "resolutionChecklist": load_json(report.resolution_checklist_json),
        "reportData": load_json(report.report_data_json, {}),
    }


def next_steps_for(category: str, urgency: str) -> list[str]:
    return list(REPORT_NEXT_STEPS.get(category, {}).get(urgency, []))


def parse_optional_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def log_admin_action(
    session: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: int | None,
    details: dict[str, Any] | None = None,
) -> None:
    session.add(
        AdminAudit(
            user_id=user.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details_json=dump_json(details or {}),
        )
    )
    session.commit()


def build_default_lessons(payload: TrackPayload) -> list[dict[str, Any]]:
    outcomes = payload.outcomes or ["Understand the topic clearly", "Use the material in practice"]
    materials = payload.materials or ["Workbook", "Checklist"]
    return [
        {"title": "Core briefing", "type": "Brief", "points": outcomes[:3]},
        {"title": "Practical exercise", "type": "Action", "points": materials[:3]},
        {
            "title": "Reflection and next steps",
            "type": "Follow-up",
            "points": [
                "Note one action your team can start this week.",
                "Record which official or internal routes support this topic.",
                "Review progress after the session.",
            ],
        },
    ]


def build_default_quiz(payload: TrackPayload) -> list[dict[str, Any]]:
    topic = payload.title
    return [
        {
            "question": f"What is the main goal of {topic.lower()}?",
            "options": ["Safer action and clearer decisions", "Ignoring real-world risk", "Reducing all documentation"],
            "answer": 0,
            "explanation": "SafeEd tracks are designed to improve practical action and decision quality.",
        },
        {
            "question": "Which habit improves follow-through most?",
            "options": ["Clear next actions", "No notes", "Waiting indefinitely"],
            "answer": 0,
            "explanation": "Clear ownership and next actions improve follow-through.",
        },
        {
            "question": "What should learning material enable?",
            "options": ["Safer choices in real settings", "Only passive reading", "No change in behavior"],
            "answer": 0,
            "explanation": "The point is practical action, not passive content collection.",
        },
    ]


def create_dashboard(session: Session, user: User) -> dict[str, Any]:
    progress_items = session.scalars(
        select(Progress).where(Progress.user_id == user.id).order_by(Progress.last_activity.desc())
    ).all()
    report_items = session.scalars(
        select(Report).where(Report.user_id == user.id).order_by(Report.created_at.desc()).limit(5)
    ).all()
    saved_count = session.scalar(select(func.count(SavedResource.id)).where(SavedResource.user_id == user.id)) or 0
    completed = sum(1 for item in progress_items if item.completed)
    avg_score_values = [item.quiz_score for item in progress_items if item.quiz_score is not None]
    average_score = round(sum(avg_score_values) / len(avg_score_values)) if avg_score_values else None
    progress_map = {item.track_id: item for item in progress_items}
    track_ids = [item.track_id for item in progress_items]
    track_map = {}
    if track_ids:
        track_map = {
            track.id: track
            for track in session.scalars(select(Track).where(Track.id.in_(track_ids))).all()
        }
    recent_activity = [
        {
            "trackId": item.track_id,
            "trackTitle": (track_map.get(item.track_id).title if track_map.get(item.track_id) else "Unknown track"),
            "lastActivity": item.last_activity.isoformat(),
            "completed": bool(item.completed),
            "quizScore": item.quiz_score,
        }
        for item in progress_items[:6]
    ]

    next_recommended = None
    for track in session.scalars(
        select(Track)
        .where(Track.published.is_(True))
        .order_by(Track.path_order.asc(), Track.title.asc())
    ).all():
        progress = progress_map.get(track.id)
        if not progress or not progress.completed:
            next_recommended = serialize_track(track, progress)
            break

    return {
        "completedTracks": completed,
        "savedResources": saved_count,
        "activeReports": sum(1 for item in report_items if item.status not in {"Closed", "Resolved"}),
        "averageQuizScore": average_score,
        "recentReports": [serialize_report(item) for item in report_items],
        "recentActivity": recent_activity,
        "nextRecommended": next_recommended,
    }


def create_admin_overview(session: Session) -> dict[str, Any]:
    return {
        "counts": {
            "users": session.scalar(select(func.count(User.id))) or 0,
            "tracks": session.scalar(select(func.count(Track.id))) or 0,
            "resources": session.scalar(select(func.count(Resource.id))) or 0,
            "programs": session.scalar(select(func.count(Program.id))) or 0,
            "supportContacts": session.scalar(select(func.count(SupportContact.id))) or 0,
            "reports": session.scalar(select(func.count(Report.id))) or 0,
            "audits": session.scalar(select(func.count(AdminAudit.id))) or 0,
        },
        "reports": [
            serialize_report(report)
            for report in session.scalars(select(Report).order_by(Report.created_at.desc()).limit(12)).all()
        ],
        "audits": [
            {
                "id": audit.id,
                "action": audit.action,
                "entityType": audit.entity_type,
                "entityId": audit.entity_id,
                "createdAt": audit.created_at.isoformat(),
                "details": load_json(audit.details_json, {}),
            }
            for audit in session.scalars(select(AdminAudit).order_by(AdminAudit.created_at.desc()).limit(8)).all()
        ],
    }


def resolve_current_user(request: Request, session: Session) -> User | None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None

    session_row = session.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == digest_token(token),
            AuthSession.expires_at > datetime.utcnow(),
        )
    )
    return session_row.user if session_row else None


def require_user(request: Request, session: Session) -> User:
    user = resolve_current_user(request, session)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user


def require_admin(request: Request, session: Session) -> User:
    user = require_user(request, session)
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def ensure_seed_data() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        if not session.scalar(select(User.id).where(User.email == DEFAULT_ADMIN_EMAIL)):
            salt, password_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
            session.add(
                User(
                    name="SafeEd Admin",
                    email=DEFAULT_ADMIN_EMAIL,
                    password_hash=password_hash,
                    password_salt=salt,
                    role="admin",
                    organization="SafeEd",
                )
            )

        if not session.scalar(select(func.count(Track.id))):
            for item in SEED_TRACKS:
                status_value = (item.get("status") or "published").strip()
                session.add(
                    Track(
                        slug=item["slug"],
                        title=item["title"],
                        category=item["category"],
                        duration=item["duration"],
                        audience=item["audience"],
                        delivery_format=item["delivery_format"],
                        summary=item["summary"],
                        tags_json=dump_json(item["tags"]),
                        outcomes_json=dump_json(item["outcomes"]),
                        materials_json=dump_json(item["materials"]),
                        lessons_json=dump_json(item.get("lessons", [])),
                        quiz_json=dump_json(item.get("quiz", [])),
                        prerequisites_json=dump_json(item.get("prerequisites", [])),
                        pathway=item.get("pathway"),
                        path_order=item.get("path_order", 0),
                        badge=item.get("badge"),
                        passing_score=item.get("passing_score", 70),
                        completion_criteria_json=dump_json(item.get("completion_criteria", [])),
                        source_url=item.get("source_url"),
                        license=item.get("license"),
                        status=status_value,
                        published=status_value.lower() == "published",
                    )
                )

        if not session.scalar(select(func.count(Resource.id))):
            for item in SEED_RESOURCES:
                session.add(
                    Resource(
                        title=item["title"],
                        owner=item["owner"],
                        category=item["category"],
                        description=item["description"],
                        link=item["link"],
                        verified_on=item["verified_on"],
                        tags_json=dump_json(item["tags"]),
                        source_url=item.get("source_url"),
                        license=item.get("license"),
                        status=item.get("status", "active"),
                    )
                )

        if not session.scalar(select(func.count(Program.id))):
            for item in SEED_PROGRAMS:
                session.add(
                    Program(
                        title=item["title"],
                        badge=item["badge"],
                        summary=item["summary"],
                        status=item["status"],
                        meta_json=dump_json(item["meta"]),
                        source_url=item.get("source_url"),
                        license=item.get("license"),
                    )
                )

        if not session.scalar(select(func.count(SupportContact.id))):
            for item in SEED_SUPPORT_CONTACTS:
                session.add(
                    SupportContact(
                        title=item["title"],
                        number=item["number"],
                        category=item["category"],
                        description=item["description"],
                        link=item["link"],
                        priority=item["priority"],
                        source_url=item.get("source_url"),
                        license=item.get("license"),
                    )
                )

        session.commit()


app = FastAPI(title="SafeEd", version="2.0.0")
app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
RATE_LIMIT_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMIT_POLICIES = [
    {"prefix": "/api/auth", "limit": 12, "window": 60.0},
    {"prefix": "/api/reports", "limit": 20, "window": 60.0},
    {"prefix": "/api/admin", "limit": 120, "window": 60.0},
    {"prefix": "/api/", "limit": 180, "window": 60.0},
]


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_response(request: Request) -> JSONResponse | None:
    if request.method in SAFE_METHODS:
        return None

    path = request.url.path
    policy = next((item for item in RATE_LIMIT_POLICIES if path.startswith(item["prefix"])), None)
    if not policy:
        return None

    now = time.monotonic()
    bucket_key = f"{_client_key(request)}:{policy['prefix']}"
    bucket = RATE_LIMIT_BUCKETS[bucket_key]
    window = float(policy["window"])

    while bucket and (now - bucket[0]) > window:
        bucket.popleft()

    if len(bucket) >= int(policy["limit"]):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please wait and try again."},
        )

    bucket.append(now)
    return None


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method not in SAFE_METHODS:
        rate_limit_hit = _rate_limit_response(request)
        if rate_limit_hit:
            return rate_limit_hit

        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
        csrf_header = request.headers.get(CSRF_HEADER_NAME)
        if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
            return JSONResponse(status_code=403, content={"detail": "CSRF token missing or invalid."})

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    if not request.cookies.get(CSRF_COOKIE_NAME):
        response.set_cookie(
            CSRF_COOKIE_NAME,
            secrets.token_urlsafe(16),
            httponly=False,
            samesite="lax",
            secure=request.url.scheme == "https",
        )
    return response


@app.on_event("startup")
def on_startup() -> None:
    ensure_seed_data()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> FileResponse:
    return FileResponse(STATIC_INDEX)


@app.get("/index.html")
def index_file() -> FileResponse:
    return FileResponse(STATIC_INDEX)


@app.get("/test1.html")
def legacy_entry() -> FileResponse:
    return FileResponse(STATIC_TEST1)


@app.get("/site.webmanifest")
def manifest() -> FileResponse:
    return FileResponse(STATIC_MANIFEST, media_type="application/manifest+json")


@app.get("/sw.js")
def service_worker() -> FileResponse:
    return FileResponse(STATIC_SW, media_type="application/javascript")


@app.get("/api/bootstrap")
def get_bootstrap(request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    user = resolve_current_user(request, session)
    progress_map: dict[int, Progress] = {}
    saved_resource_ids: set[int] = set()

    if user:
        progress_items = session.scalars(select(Progress).where(Progress.user_id == user.id)).all()
        progress_map = {item.track_id: item for item in progress_items}
        saved_resource_ids = {
            item.resource_id
            for item in session.scalars(select(SavedResource).where(SavedResource.user_id == user.id)).all()
        }

    if user and user.role == "admin":
        tracks_query = select(Track).order_by(Track.path_order.asc(), Track.title.asc())
    else:
        tracks_query = select(Track).where(Track.published.is_(True)).order_by(Track.path_order.asc(), Track.title.asc())
    tracks = session.scalars(tracks_query).all()
    resources = session.scalars(select(Resource).order_by(Resource.title.asc())).all()
    programs = session.scalars(select(Program).order_by(Program.id.asc())).all()
    support_contacts = session.scalars(select(SupportContact).order_by(SupportContact.priority.asc())).all()

    return {
        "user": serialize_user(user) if user else None,
        "tracks": [serialize_track(track, progress_map.get(track.id)) for track in tracks],
        "resources": [serialize_resource(resource, resource.id in saved_resource_ids) for resource in resources],
        "programs": [serialize_program(program) for program in programs],
        "supportContacts": [serialize_support(contact) for contact in support_contacts],
        "dashboard": create_dashboard(session, user) if user else None,
        "adminOverview": create_admin_overview(session) if user and user.role == "admin" else None,
        "defaults": {
            "roles": ROLE_OPTIONS,
            "reportCategories": REPORT_CATEGORIES,
            "reportUrgency": REPORT_URGENCY,
            "reportStatuses": REPORT_STATUSES,
            "reportFields": REPORT_FIELDS,
            "reportNextSteps": REPORT_NEXT_STEPS,
            "locales": LOCALE_DEFAULTS,
            "contentVersion": CONTENT_MANIFEST.get("content_version", "unknown"),
            "defaultAdminEmail": DEFAULT_ADMIN_EMAIL if EXPOSE_ADMIN_DEMO else None,
            "defaultAdminPassword": DEFAULT_ADMIN_PASSWORD if EXPOSE_ADMIN_DEMO else None,
        },
    }


@app.post("/api/auth/register")
def register(payload: RegisterPayload, response: Response, session: Session = Depends(get_session)) -> dict[str, Any]:
    if payload.role not in {"learner", "facilitator"}:
        raise HTTPException(status_code=400, detail="Only learner or facilitator accounts can self-register.")

    existing_user = session.scalar(select(User).where(User.email == normalize_email(payload.email)))
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    salt, password_hash = hash_password(payload.password)
    user = User(
        name=payload.name.strip(),
        email=normalize_email(payload.email),
        password_hash=password_hash,
        password_salt=salt,
        role=payload.role,
        organization=(payload.organization or "").strip() or None,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_session_token()
    session.add(AuthSession(user_id=user.id, token_hash=digest_token(token), expires_at=default_session_expiry()))
    session.commit()
    response.set_cookie(SESSION_COOKIE_NAME, token, httponly=True, samesite="lax", max_age=14 * 24 * 60 * 60)

    return {"user": serialize_user(user), "message": "Account created successfully."}


@app.post("/api/auth/login")
def login(payload: LoginPayload, response: Response, session: Session = Depends(get_session)) -> dict[str, Any]:
    user = session.scalar(select(User).where(User.email == normalize_email(payload.email)))
    if not user or not verify_password(payload.password, user.password_salt, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_session_token()
    session.add(AuthSession(user_id=user.id, token_hash=digest_token(token), expires_at=default_session_expiry()))
    session.commit()
    response.set_cookie(SESSION_COOKIE_NAME, token, httponly=True, samesite="lax", max_age=14 * 24 * 60 * 60)
    return {"user": serialize_user(user), "message": "Signed in successfully."}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, session: Session = Depends(get_session)) -> dict[str, str]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        session_row = session.scalar(select(AuthSession).where(AuthSession.token_hash == digest_token(token)))
        if session_row:
            session.delete(session_row)
            session.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Signed out successfully."}


@app.post("/api/tracks/{track_id}/toggle-complete")
def toggle_complete(track_id: int, request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    user = require_user(request, session)
    track = session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    progress = session.scalar(select(Progress).where(Progress.user_id == user.id, Progress.track_id == track.id))
    if not progress:
        progress = Progress(user_id=user.id, track_id=track.id, completed=True, last_activity=datetime.utcnow())
        session.add(progress)
    else:
        progress.completed = not progress.completed
        progress.last_activity = datetime.utcnow()
    session.commit()
    return {"completed": progress.completed}


@app.post("/api/tracks/{track_id}/quiz")
def submit_quiz(
    track_id: int,
    payload: QuizSubmissionPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    user = require_user(request, session)
    track = session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    quiz = load_json(track.quiz_json)
    if not quiz:
        raise HTTPException(status_code=400, detail="This track does not have a configured quiz.")

    if len(payload.answers) != len(quiz):
        raise HTTPException(status_code=400, detail="All quiz answers are required.")

    correct = 0
    results = []
    for index, question in enumerate(quiz):
        is_correct = payload.answers[index] == question["answer"]
        correct += 1 if is_correct else 0
        results.append(
            {
                "question": question["question"],
                "selected": payload.answers[index],
                "correctIndex": question["answer"],
                "isCorrect": is_correct,
                "explanation": question["explanation"],
            }
        )

    score = round((correct / len(quiz)) * 100)
    passing_score = track.passing_score or 70
    progress = session.scalar(select(Progress).where(Progress.user_id == user.id, Progress.track_id == track.id))
    if not progress:
        progress = Progress(
            user_id=user.id,
            track_id=track.id,
            quiz_score=score,
            completed=score >= passing_score,
            last_activity=datetime.utcnow(),
        )
        session.add(progress)
    else:
        progress.quiz_score = score
        progress.completed = progress.completed or score >= passing_score
        progress.last_activity = datetime.utcnow()
    session.commit()

    return {"score": score, "passed": score >= passing_score, "results": results}


@app.post("/api/resources/{resource_id}/toggle-save")
def toggle_save_resource(resource_id: int, request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    user = require_user(request, session)
    resource = session.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    existing = session.scalar(
        select(SavedResource).where(SavedResource.user_id == user.id, SavedResource.resource_id == resource.id)
    )
    if existing:
        session.delete(existing)
        session.commit()
        return {"saved": False}

    session.add(SavedResource(user_id=user.id, resource_id=resource.id))
    session.commit()
    return {"saved": True}


@app.post("/api/reports")
def submit_report(payload: ReportPayload, request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    user = resolve_current_user(request, session)
    if payload.category not in REPORT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Unsupported report category.")
    if payload.urgency not in REPORT_URGENCY:
        raise HTTPException(status_code=400, detail="Unsupported urgency level.")

    report_data = payload.report_data or {}
    report = Report(
        user_id=user.id if user else None,
        reporter_name=payload.reporter_name.strip(),
        reporter_email=normalize_email(payload.reporter_email),
        category=payload.category,
        urgency=payload.urgency,
        preferred_contact=payload.preferred_contact,
        description=payload.description.strip(),
        report_data_json=dump_json(report_data),
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return {
        "message": "Support request submitted.",
        "report": serialize_report(report),
        "nextSteps": next_steps_for(payload.category, payload.urgency),
    }


@app.get("/api/dashboard")
def get_dashboard(request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    user = require_user(request, session)
    return {"user": serialize_user(user), "dashboard": create_dashboard(session, user)}


@app.get("/api/admin/overview")
def admin_overview(request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    require_admin(request, session)
    return create_admin_overview(session)


@app.post("/api/admin/tracks")
def create_track(payload: TrackPayload, request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    admin = require_admin(request, session)
    slug = slugify(payload.title)
    if session.scalar(select(Track.id).where(Track.slug == slug)):
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
    status_value = payload.status.strip() if payload.status else "published"

    track = Track(
        slug=slug,
        title=payload.title.strip(),
        category=payload.category.strip(),
        duration=payload.duration.strip(),
        audience=payload.audience.strip(),
        delivery_format=payload.delivery_format.strip(),
        summary=payload.summary.strip(),
        tags_json=dump_json(payload.tags),
        outcomes_json=dump_json(payload.outcomes),
        materials_json=dump_json(payload.materials),
        lessons_json=dump_json(payload.lessons or build_default_lessons(payload)),
        quiz_json=dump_json(payload.quiz or build_default_quiz(payload)),
        prerequisites_json=dump_json(payload.prerequisites),
        pathway=payload.pathway.strip() if payload.pathway else None,
        path_order=payload.path_order,
        badge=payload.badge.strip() if payload.badge else None,
        passing_score=payload.passing_score,
        completion_criteria_json=dump_json(payload.completion_criteria),
        source_url=payload.source_url.strip() if payload.source_url else None,
        license=payload.license.strip() if payload.license else None,
        status=status_value,
        published=status_value.lower() == "published",
    )
    session.add(track)
    session.commit()
    session.refresh(track)
    log_admin_action(session, admin, "create", "track", track.id, {"title": track.title})
    return serialize_track(track, None)


@app.put("/api/admin/tracks/{track_id}")
def update_track(
    track_id: int,
    payload: TrackPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    track = session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")

    track.title = payload.title.strip()
    track.category = payload.category.strip()
    track.duration = payload.duration.strip()
    track.audience = payload.audience.strip()
    track.delivery_format = payload.delivery_format.strip()
    track.summary = payload.summary.strip()
    track.tags_json = dump_json(payload.tags)
    track.outcomes_json = dump_json(payload.outcomes)
    track.materials_json = dump_json(payload.materials)
    track.lessons_json = dump_json(payload.lessons or build_default_lessons(payload))
    track.quiz_json = dump_json(payload.quiz or build_default_quiz(payload))
    track.prerequisites_json = dump_json(payload.prerequisites)
    track.pathway = payload.pathway.strip() if payload.pathway else None
    track.path_order = payload.path_order
    track.badge = payload.badge.strip() if payload.badge else None
    track.passing_score = payload.passing_score
    track.completion_criteria_json = dump_json(payload.completion_criteria)
    track.source_url = payload.source_url.strip() if payload.source_url else None
    track.license = payload.license.strip() if payload.license else None
    track.status = payload.status.strip() if payload.status else "published"
    track.published = track.status.lower() == "published"
    session.commit()
    log_admin_action(session, admin, "update", "track", track.id, {"title": track.title})
    return serialize_track(track, None)


@app.delete("/api/admin/tracks/{track_id}")
def delete_track(track_id: int, request: Request, session: Session = Depends(get_session)) -> dict[str, str]:
    admin = require_admin(request, session)
    track = session.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")
    session.delete(track)
    session.commit()
    log_admin_action(session, admin, "delete", "track", track_id, {"title": track.title})
    return {"message": "Track deleted."}


@app.post("/api/admin/resources")
def create_resource(payload: ResourcePayload, request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    admin = require_admin(request, session)
    resource = Resource(
        title=payload.title.strip(),
        owner=payload.owner.strip(),
        category=payload.category.strip(),
        description=payload.description.strip(),
        link=payload.link.strip(),
        verified_on=payload.verified_on.strip(),
        tags_json=dump_json(payload.tags),
        source_url=payload.source_url.strip() if payload.source_url else None,
        license=payload.license.strip() if payload.license else None,
        status=payload.status.strip() if payload.status else "active",
    )
    session.add(resource)
    session.commit()
    session.refresh(resource)
    log_admin_action(session, admin, "create", "resource", resource.id, {"title": resource.title})
    return serialize_resource(resource, False)


@app.put("/api/admin/resources/{resource_id}")
def update_resource(
    resource_id: int,
    payload: ResourcePayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    resource = session.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    resource.title = payload.title.strip()
    resource.owner = payload.owner.strip()
    resource.category = payload.category.strip()
    resource.description = payload.description.strip()
    resource.link = payload.link.strip()
    resource.verified_on = payload.verified_on.strip()
    resource.tags_json = dump_json(payload.tags)
    resource.source_url = payload.source_url.strip() if payload.source_url else None
    resource.license = payload.license.strip() if payload.license else None
    resource.status = payload.status.strip() if payload.status else "active"
    session.commit()
    log_admin_action(session, admin, "update", "resource", resource.id, {"title": resource.title})
    return serialize_resource(resource, False)


@app.delete("/api/admin/resources/{resource_id}")
def delete_resource(resource_id: int, request: Request, session: Session = Depends(get_session)) -> dict[str, str]:
    admin = require_admin(request, session)
    resource = session.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    session.delete(resource)
    session.commit()
    log_admin_action(session, admin, "delete", "resource", resource_id, {"title": resource.title})
    return {"message": "Resource deleted."}


@app.post("/api/admin/programs")
def create_program(payload: ProgramPayload, request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    admin = require_admin(request, session)
    program = Program(
        title=payload.title.strip(),
        badge=payload.badge.strip(),
        summary=payload.summary.strip(),
        status=payload.status.strip(),
        meta_json=dump_json(payload.meta),
        source_url=payload.source_url.strip() if payload.source_url else None,
        license=payload.license.strip() if payload.license else None,
    )
    session.add(program)
    session.commit()
    session.refresh(program)
    log_admin_action(session, admin, "create", "program", program.id, {"title": program.title})
    return serialize_program(program)


@app.put("/api/admin/programs/{program_id}")
def update_program(
    program_id: int,
    payload: ProgramPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    program = session.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found.")
    program.title = payload.title.strip()
    program.badge = payload.badge.strip()
    program.summary = payload.summary.strip()
    program.status = payload.status.strip()
    program.meta_json = dump_json(payload.meta)
    program.source_url = payload.source_url.strip() if payload.source_url else None
    program.license = payload.license.strip() if payload.license else None
    session.commit()
    log_admin_action(session, admin, "update", "program", program.id, {"title": program.title})
    return serialize_program(program)


@app.delete("/api/admin/programs/{program_id}")
def delete_program(program_id: int, request: Request, session: Session = Depends(get_session)) -> dict[str, str]:
    admin = require_admin(request, session)
    program = session.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found.")
    session.delete(program)
    session.commit()
    log_admin_action(session, admin, "delete", "program", program_id, {"title": program.title})
    return {"message": "Program deleted."}


@app.post("/api/admin/support-contacts")
def create_support_contact(
    payload: SupportPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    contact = SupportContact(
        title=payload.title.strip(),
        number=payload.number.strip(),
        category=payload.category.strip(),
        description=payload.description.strip(),
        link=payload.link.strip(),
        priority=payload.priority,
        source_url=payload.source_url.strip() if payload.source_url else None,
        license=payload.license.strip() if payload.license else None,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    log_admin_action(session, admin, "create", "support_contact", contact.id, {"title": contact.title})
    return serialize_support(contact)


@app.put("/api/admin/support-contacts/{contact_id}")
def update_support_contact(
    contact_id: int,
    payload: SupportPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    contact = session.get(SupportContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Support contact not found.")
    contact.title = payload.title.strip()
    contact.number = payload.number.strip()
    contact.category = payload.category.strip()
    contact.description = payload.description.strip()
    contact.link = payload.link.strip()
    contact.priority = payload.priority
    contact.source_url = payload.source_url.strip() if payload.source_url else None
    contact.license = payload.license.strip() if payload.license else None
    session.commit()
    log_admin_action(session, admin, "update", "support_contact", contact.id, {"title": contact.title})
    return serialize_support(contact)


@app.delete("/api/admin/support-contacts/{contact_id}")
def delete_support_contact(contact_id: int, request: Request, session: Session = Depends(get_session)) -> dict[str, str]:
    admin = require_admin(request, session)
    contact = session.get(SupportContact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Support contact not found.")
    session.delete(contact)
    session.commit()
    log_admin_action(session, admin, "delete", "support_contact", contact_id, {"title": contact.title})
    return {"message": "Support contact deleted."}


@app.patch("/api/admin/reports/{report_id}")
def update_report_status(
    report_id: int,
    payload: ReportStatusPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    status_value = payload.status.strip()
    if status_value not in REPORT_STATUSES:
        raise HTTPException(status_code=400, detail="Unsupported report status.")
    report.status = status_value
    report.admin_notes = payload.admin_notes.strip() if payload.admin_notes else None
    report.next_follow_up = parse_optional_datetime(payload.next_follow_up)
    report.resolution_checklist_json = dump_json(payload.resolution_checklist)
    report.updated_at = datetime.utcnow()
    session.commit()
    log_admin_action(
        session,
        admin,
        "update",
        "report",
        report.id,
        {"status": report.status},
    )
    return serialize_report(report)


@app.get("/api/admin/reports")
def list_reports(
    request: Request,
    session: Session = Depends(get_session),
    limit: int = 50,
    offset: int = 0,
    status_filter: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    require_admin(request, session)
    query = select(Report)
    if status_filter:
        query = query.where(Report.status == status_filter)
    if category:
        query = query.where(Report.category == category)
    total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
    reports = session.scalars(query.order_by(Report.created_at.desc()).offset(offset).limit(limit)).all()
    return {"total": total, "reports": [serialize_report(report) for report in reports]}


@app.get("/api/admin/audit")
def list_audits(
    request: Request,
    session: Session = Depends(get_session),
    limit: int = 20,
    offset: int = 0,
) -> dict[str, Any]:
    require_admin(request, session)
    audits = session.scalars(
        select(AdminAudit).order_by(AdminAudit.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return {
        "audits": [
            {
                "id": audit.id,
                "action": audit.action,
                "entityType": audit.entity_type,
                "entityId": audit.entity_id,
                "createdAt": audit.created_at.isoformat(),
                "details": load_json(audit.details_json, {}),
            }
            for audit in audits
        ]
    }


def _draft_track_from_prompt(prompt: str) -> dict[str, Any]:
    title = prompt.strip().title()[:120]
    base = {
        "title": title or "New safety track",
        "category": "custom",
        "duration": "60 minutes",
        "audience": "Community learners",
        "delivery_format": "Workshop plus checklist",
        "summary": f"Draft track generated for: {prompt.strip()}",
        "tags": ["Draft"],
        "outcomes": ["Identify key risks", "Choose safer next actions"],
        "materials": ["Checklist", "Scenario prompts"],
        "lessons": build_default_lessons(
            TrackPayload(
                title=title or "New safety track",
                category="custom",
                duration="60 minutes",
                audience="Community learners",
                delivery_format="Workshop plus checklist",
                summary=f"Draft track generated for: {prompt.strip()}",
            )
        ),
        "quiz": build_default_quiz(
            TrackPayload(
                title=title or "New safety track",
                category="custom",
                duration="60 minutes",
                audience="Community learners",
                delivery_format="Workshop plus checklist",
                summary=f"Draft track generated for: {prompt.strip()}",
            )
        ),
        "prerequisites": [],
        "pathway": "Drafts",
        "path_order": 0,
        "badge": "Draft badge",
        "passing_score": 70,
        "completion_criteria": ["Review content", "Score 70% or higher on the quiz"],
        "source_url": "",
        "license": "Draft",
        "status": "draft",
    }
    return base


def _call_llm_draft(prompt: str) -> dict[str, Any] | None:
    if not LLM_ENDPOINT:
        return None
    payload = {
        "prompt": prompt,
        "model": LLM_MODEL or "safeed-draft",
        "type": "track",
    }
    try:
        request_data = json.dumps(payload).encode("utf-8")
        req = urlrequest.Request(
            LLM_ENDPOINT,
            data=request_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data.get("draft") if isinstance(data, dict) else None
    except (urlerror.URLError, json.JSONDecodeError, TimeoutError):
        return None


@app.post("/api/admin/ai/draft-track")
def ai_draft_track(
    payload: DraftRequestPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    draft = _call_llm_draft(payload.prompt) or _draft_track_from_prompt(payload.prompt)
    log_admin_action(session, admin, "draft", "track", None, {"prompt": payload.prompt[:120]})
    return {"draft": draft}


@app.get("/api/admin/export")
def export_content(request: Request, session: Session = Depends(get_session)) -> dict[str, Any]:
    require_admin(request, session)
    tracks = [
        {
            "slug": track.slug,
            "title": track.title,
            "category": track.category,
            "duration": track.duration,
            "audience": track.audience,
            "delivery_format": track.delivery_format,
            "summary": track.summary,
            "tags": load_json(track.tags_json),
            "outcomes": load_json(track.outcomes_json),
            "materials": load_json(track.materials_json),
            "lessons": load_json(track.lessons_json),
            "quiz": load_json(track.quiz_json),
            "prerequisites": load_json(track.prerequisites_json),
            "pathway": track.pathway,
            "path_order": track.path_order,
            "badge": track.badge,
            "passing_score": track.passing_score,
            "completion_criteria": load_json(track.completion_criteria_json),
            "source_url": track.source_url or "",
            "license": track.license or "",
            "status": track.status,
        }
        for track in session.scalars(select(Track).order_by(Track.title.asc())).all()
    ]
    resources = [
        {
            "title": resource.title,
            "owner": resource.owner,
            "category": resource.category,
            "description": resource.description,
            "link": resource.link,
            "verified_on": resource.verified_on,
            "tags": load_json(resource.tags_json),
            "source_url": resource.source_url or "",
            "license": resource.license or "",
            "status": resource.status,
        }
        for resource in session.scalars(select(Resource).order_by(Resource.title.asc())).all()
    ]
    programs = [
        {
            "title": program.title,
            "badge": program.badge,
            "summary": program.summary,
            "status": program.status,
            "meta": load_json(program.meta_json),
            "source_url": program.source_url or "",
            "license": program.license or "",
        }
        for program in session.scalars(select(Program).order_by(Program.title.asc())).all()
    ]
    support_contacts = [
        {
            "title": contact.title,
            "number": contact.number,
            "category": contact.category,
            "description": contact.description,
            "link": contact.link,
            "priority": contact.priority,
            "source_url": contact.source_url or "",
            "license": contact.license or "",
        }
        for contact in session.scalars(select(SupportContact).order_by(SupportContact.priority.asc())).all()
    ]
    return {
        "contentVersion": CONTENT_MANIFEST.get("content_version", "unknown"),
        "tracks": tracks,
        "resources": resources,
        "programs": programs,
        "support_contacts": support_contacts,
    }


@app.post("/api/admin/import")
def import_content(
    payload: ImportPayload,
    request: Request,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    admin = require_admin(request, session)
    mode = payload.mode.lower().strip()
    if mode != "merge":
        raise HTTPException(status_code=400, detail="Only merge mode is supported right now.")

    created = {"tracks": 0, "resources": 0, "programs": 0, "support_contacts": 0}
    updated = {"tracks": 0, "resources": 0, "programs": 0, "support_contacts": 0}

    if payload.tracks:
        for item in payload.tracks:
            slug = item.get("slug") or slugify(item.get("title", "track"))
            track_payload = TrackPayload(**{**item, "delivery_format": item.get("delivery_format", item.get("deliveryFormat", ""))})
            existing = session.scalar(select(Track).where(Track.slug == slug))
            status_value = track_payload.status.strip() if track_payload.status else "published"
            if existing:
                existing.title = track_payload.title.strip()
                existing.category = track_payload.category.strip()
                existing.duration = track_payload.duration.strip()
                existing.audience = track_payload.audience.strip()
                existing.delivery_format = track_payload.delivery_format.strip()
                existing.summary = track_payload.summary.strip()
                existing.tags_json = dump_json(track_payload.tags)
                existing.outcomes_json = dump_json(track_payload.outcomes)
                existing.materials_json = dump_json(track_payload.materials)
                existing.lessons_json = dump_json(track_payload.lessons or build_default_lessons(track_payload))
                existing.quiz_json = dump_json(track_payload.quiz or build_default_quiz(track_payload))
                existing.prerequisites_json = dump_json(track_payload.prerequisites)
                existing.pathway = track_payload.pathway.strip() if track_payload.pathway else None
                existing.path_order = track_payload.path_order
                existing.badge = track_payload.badge.strip() if track_payload.badge else None
                existing.passing_score = track_payload.passing_score
                existing.completion_criteria_json = dump_json(track_payload.completion_criteria)
                existing.source_url = track_payload.source_url.strip() if track_payload.source_url else None
                existing.license = track_payload.license.strip() if track_payload.license else None
                existing.status = status_value
                existing.published = status_value.lower() == "published"
                updated["tracks"] += 1
            else:
                session.add(
                    Track(
                        slug=slug,
                        title=track_payload.title.strip(),
                        category=track_payload.category.strip(),
                        duration=track_payload.duration.strip(),
                        audience=track_payload.audience.strip(),
                        delivery_format=track_payload.delivery_format.strip(),
                        summary=track_payload.summary.strip(),
                        tags_json=dump_json(track_payload.tags),
                        outcomes_json=dump_json(track_payload.outcomes),
                        materials_json=dump_json(track_payload.materials),
                        lessons_json=dump_json(track_payload.lessons or build_default_lessons(track_payload)),
                        quiz_json=dump_json(track_payload.quiz or build_default_quiz(track_payload)),
                        prerequisites_json=dump_json(track_payload.prerequisites),
                        pathway=track_payload.pathway.strip() if track_payload.pathway else None,
                        path_order=track_payload.path_order,
                        badge=track_payload.badge.strip() if track_payload.badge else None,
                        passing_score=track_payload.passing_score,
                        completion_criteria_json=dump_json(track_payload.completion_criteria),
                        source_url=track_payload.source_url.strip() if track_payload.source_url else None,
                        license=track_payload.license.strip() if track_payload.license else None,
                        status=status_value,
                        published=status_value.lower() == "published",
                    )
                )
                created["tracks"] += 1

    if payload.resources:
        for item in payload.resources:
            resource_payload = ResourcePayload(**item)
            existing = session.scalar(select(Resource).where(Resource.title == resource_payload.title.strip()))
            if existing:
                existing.owner = resource_payload.owner.strip()
                existing.category = resource_payload.category.strip()
                existing.description = resource_payload.description.strip()
                existing.link = resource_payload.link.strip()
                existing.verified_on = resource_payload.verified_on.strip()
                existing.tags_json = dump_json(resource_payload.tags)
                existing.source_url = resource_payload.source_url.strip() if resource_payload.source_url else None
                existing.license = resource_payload.license.strip() if resource_payload.license else None
                existing.status = resource_payload.status.strip() if resource_payload.status else "active"
                updated["resources"] += 1
            else:
                session.add(
                    Resource(
                        title=resource_payload.title.strip(),
                        owner=resource_payload.owner.strip(),
                        category=resource_payload.category.strip(),
                        description=resource_payload.description.strip(),
                        link=resource_payload.link.strip(),
                        verified_on=resource_payload.verified_on.strip(),
                        tags_json=dump_json(resource_payload.tags),
                        source_url=resource_payload.source_url.strip() if resource_payload.source_url else None,
                        license=resource_payload.license.strip() if resource_payload.license else None,
                        status=resource_payload.status.strip() if resource_payload.status else "active",
                    )
                )
                created["resources"] += 1

    if payload.programs:
        for item in payload.programs:
            program_payload = ProgramPayload(**item)
            existing = session.scalar(select(Program).where(Program.title == program_payload.title.strip()))
            if existing:
                existing.badge = program_payload.badge.strip()
                existing.summary = program_payload.summary.strip()
                existing.status = program_payload.status.strip()
                existing.meta_json = dump_json(program_payload.meta)
                existing.source_url = program_payload.source_url.strip() if program_payload.source_url else None
                existing.license = program_payload.license.strip() if program_payload.license else None
                updated["programs"] += 1
            else:
                session.add(
                    Program(
                        title=program_payload.title.strip(),
                        badge=program_payload.badge.strip(),
                        summary=program_payload.summary.strip(),
                        status=program_payload.status.strip(),
                        meta_json=dump_json(program_payload.meta),
                        source_url=program_payload.source_url.strip() if program_payload.source_url else None,
                        license=program_payload.license.strip() if program_payload.license else None,
                    )
                )
                created["programs"] += 1

    if payload.support_contacts:
        for item in payload.support_contacts:
            support_payload = SupportPayload(**item)
            existing = session.scalar(select(SupportContact).where(SupportContact.title == support_payload.title.strip()))
            if existing:
                existing.number = support_payload.number.strip()
                existing.category = support_payload.category.strip()
                existing.description = support_payload.description.strip()
                existing.link = support_payload.link.strip()
                existing.priority = support_payload.priority
                existing.source_url = support_payload.source_url.strip() if support_payload.source_url else None
                existing.license = support_payload.license.strip() if support_payload.license else None
                updated["support_contacts"] += 1
            else:
                session.add(
                    SupportContact(
                        title=support_payload.title.strip(),
                        number=support_payload.number.strip(),
                        category=support_payload.category.strip(),
                        description=support_payload.description.strip(),
                        link=support_payload.link.strip(),
                        priority=support_payload.priority,
                        source_url=support_payload.source_url.strip() if support_payload.source_url else None,
                        license=support_payload.license.strip() if support_payload.license else None,
                    )
                )
                created["support_contacts"] += 1

    session.commit()
    log_admin_action(session, admin, "import", "content", None, {"created": created, "updated": updated})
    return {"created": created, "updated": updated}



