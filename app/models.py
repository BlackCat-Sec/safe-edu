from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    password_salt: Mapped[str] = mapped_column(String(64))
    role: Mapped[str] = mapped_column(String(32), default="learner", index=True)
    organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progress_items: Mapped[list["Progress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    saved_resources: Mapped[list["SavedResource"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    reports: Mapped[list["Report"]] = relationship(back_populates="user")
    audits: Mapped[list["AdminAudit"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped[User] = relationship(back_populates="sessions")


class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64), index=True)
    duration: Mapped[str] = mapped_column(String(64))
    audience: Mapped[str] = mapped_column(String(255))
    delivery_format: Mapped[str] = mapped_column(String(120))
    summary: Mapped[str] = mapped_column(Text)
    tags_json: Mapped[str] = mapped_column(Text)
    outcomes_json: Mapped[str] = mapped_column(Text)
    materials_json: Mapped[str] = mapped_column(Text)
    lessons_json: Mapped[str] = mapped_column(Text)
    quiz_json: Mapped[str] = mapped_column(Text)
    prerequisites_json: Mapped[str] = mapped_column(Text, default="[]")
    pathway: Mapped[str | None] = mapped_column(String(120), nullable=True)
    path_order: Mapped[int] = mapped_column(Integer, default=0)
    badge: Mapped[str | None] = mapped_column(String(120), nullable=True)
    passing_score: Mapped[int] = mapped_column(Integer, default=70)
    completion_criteria_json: Mapped[str] = mapped_column(Text, default="[]")
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    license: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="published")
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    progress_items: Mapped[list["Progress"]] = relationship(back_populates="track", cascade="all, delete-orphan")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    owner: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    link: Mapped[str] = mapped_column(String(512))
    verified_on: Mapped[str] = mapped_column(String(64))
    tags_json: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    license: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    saved_by: Mapped[list["SavedResource"]] = relationship(back_populates="resource", cascade="all, delete-orphan")


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    badge: Mapped[str] = mapped_column(String(120))
    summary: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="Active")
    meta_json: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    license: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SupportContact(Base):
    __tablename__ = "support_contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    number: Mapped[str] = mapped_column(String(40))
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    link: Mapped[str] = mapped_column(String(512))
    priority: Mapped[int] = mapped_column(Integer, default=100)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    license: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("user_id", "track_id", name="uq_progress_user_track"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    track_id: Mapped[int] = mapped_column(ForeignKey("tracks.id", ondelete="CASCADE"), index=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    quiz_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_activity: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped[User] = relationship(back_populates="progress_items")
    track: Mapped[Track] = relationship(back_populates="progress_items")


class SavedResource(Base):
    __tablename__ = "saved_resources"
    __table_args__ = (UniqueConstraint("user_id", "resource_id", name="uq_saved_user_resource"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="saved_resources")
    resource: Mapped[Resource] = relationship(back_populates="saved_by")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    reporter_name: Mapped[str] = mapped_column(String(120))
    reporter_email: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(80), index=True)
    urgency: Mapped[str] = mapped_column(String(40), default="Standard")
    preferred_contact: Mapped[str] = mapped_column(String(80), default="Email")
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="New", index=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_follow_up: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolution_checklist_json: Mapped[str] = mapped_column(Text, default="[]")
    report_data_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User | None] = relationship(back_populates="reports")


class AdminAudit(Base):
    __tablename__ = "admin_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    user: Mapped[User] = relationship(back_populates="audits")
