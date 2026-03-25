import importlib
import sys

import pytest
from fastapi.testclient import TestClient


MODULES_TO_RESET = ["app.main", "app.models", "app.database"]


@pytest.fixture()
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "safeed-test.db"
    monkeypatch.setenv("SAFEED_DATABASE_URL", f"sqlite:///{db_path.as_posix()}")

    for module_name in MODULES_TO_RESET:
        sys.modules.pop(module_name, None)

    main = importlib.import_module("app.main")

    with TestClient(main.app) as test_client:
        test_client.get("/api/bootstrap")
        yield test_client


def csrf_headers(client: TestClient):
    token = client.cookies.get("safeed_csrf")
    return {"X-CSRF-Token": token} if token else {}


def register_user(client: TestClient, email: str = "learner@example.com"):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Learner One",
            "email": email,
            "password": "StrongPass123!",
            "role": "learner",
            "organization": "Community Lab",
        },
        headers=csrf_headers(client),
    )
    assert response.status_code == 200, response.text
    return response.json()


def login_admin(client: TestClient):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@safeed.local",
            "password": "SafeEdAdmin123!",
        },
        headers=csrf_headers(client),
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_bootstrap_exposes_seeded_content_and_defaults(client: TestClient):
    response = client.get("/api/bootstrap")
    assert response.status_code == 200

    payload = response.json()
    assert payload["user"] is None
    assert len(payload["tracks"]) >= 6
    assert len(payload["resources"]) >= 5
    assert len(payload["supportContacts"]) >= 3
    assert payload["defaults"]["defaultAdminEmail"] is None
    assert payload["defaults"]["reportCategories"]
    assert payload["defaults"]["reportStatuses"]
    assert payload["defaults"]["contentVersion"]


def test_register_toggle_progress_and_submit_quiz(client: TestClient):
    register_user(client)

    bootstrap = client.get("/api/bootstrap").json()
    assert bootstrap["user"]["email"] == "learner@example.com"

    track = bootstrap["tracks"][0]
    toggle_response = client.post(f"/api/tracks/{track['id']}/toggle-complete", headers=csrf_headers(client))
    assert toggle_response.status_code == 200
    assert toggle_response.json()["completed"] is True

    answers = [question["answer"] for question in track["quiz"]]
    quiz_response = client.post(
        f"/api/tracks/{track['id']}/quiz",
        json={"answers": answers},
        headers=csrf_headers(client),
    )
    assert quiz_response.status_code == 200
    quiz_payload = quiz_response.json()
    assert quiz_payload["score"] == 100
    assert quiz_payload["passed"] is True

    dashboard_response = client.get("/api/dashboard")
    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.json()["dashboard"]
    assert dashboard["completedTracks"] >= 1
    assert dashboard["averageQuizScore"] == 100


def test_admin_can_review_reports_and_create_resources(client: TestClient):
    report_response = client.post(
        "/api/reports",
        json={
            "reporter_name": "Case Reporter",
            "reporter_email": "reporter@example.com",
            "category": "General support",
            "urgency": "Priority",
            "preferred_contact": "Email",
            "description": "Need a guided follow-up plan for repeated safety incidents in a student group.",
        },
        headers=csrf_headers(client),
    )
    assert report_response.status_code == 200, report_response.text
    report_id = report_response.json()["report"]["id"]

    login_admin(client)

    overview_response = client.get("/api/admin/overview")
    assert overview_response.status_code == 200
    overview = overview_response.json()
    assert overview["counts"]["reports"] >= 1
    assert any(report["id"] == report_id for report in overview["reports"])

    status_response = client.patch(
        f"/api/admin/reports/{report_id}",
        json={"status": "Resolved"},
        headers=csrf_headers(client),
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "Resolved"

    create_resource_response = client.post(
        "/api/admin/resources",
        json={
            "title": "Campus response manual",
            "owner": "SafeEd Ops",
            "category": "Implementation",
            "description": "A reusable operations guide for facilitators handling reporting, referrals, and follow-up.",
            "link": "https://example.org/campus-response-manual",
            "verified_on": "March 10, 2026",
            "tags": ["operations", "facilitator"],
        },
        headers=csrf_headers(client),
    )
    assert create_resource_response.status_code == 200, create_resource_response.text

    bootstrap = client.get("/api/bootstrap").json()
    assert any(resource["title"] == "Campus response manual" for resource in bootstrap["resources"])


def test_csrf_required_for_state_change(client: TestClient):
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@safeed.local", "password": "SafeEdAdmin123!"},
    )
    assert response.status_code == 403
