# SafeEd

SafeEd is now a local full-stack safety education application built with `FastAPI`, `SQLite`, and a browser client that talks to real APIs. It supports account creation, persistent learning progress, quiz scoring, saved resources, support-request submission, admin-managed content, content import/export, and localized UI labels.

## What the application does

SafeEd is structured around four core workflows:

1. Deliver practical safety-learning tracks with lessons, outcomes, and quizzes.
2. Route users toward verified public support channels when they need help.
3. Store real user activity such as progress, quiz scores, saved resources, and support requests.
4. Give admins a local console to manage tracks, resources, program formats, support contacts, and report statuses.

## Current features

- User registration and sign-in for `learner` and `facilitator` roles.
- Seeded admin account for local management (hidden by default; see env flags).
- SQLite-backed persistence for sessions, progress, saved resources, and reports.
- Seeded learning tracks with lessons and graded quizzes.
- Verified India-focused support contacts and public-service resources.
- Admin CRUD workflows for tracks, resources, programs, and support contacts.
- Admin status management for submitted support requests.
- Admin audit log for content and report actions.
- Admin import/export tooling for content backups.
- AI-assisted draft track generator (optional endpoint).
- Theme switcher, responsive layout, dialogs, and service-worker shell caching.
- Health endpoint at `/api/health`.

## Project structure

```text
.
|-- app/
|   |-- database.py
|   |-- content/
|   |-- main.py
|   |-- models.py
|   |-- seed_data.py
|   `-- security.py
|-- assets/
|   |-- brand/
|   |-- css/
|   |-- data/
|   `-- js/
|-- tests/
|   `-- test_app.py
|-- index.html
|-- sw.js
|-- site.webmanifest
|-- requirements.txt
|-- PROJECT_AUDIT.md
`-- README.md
```

## Run locally

Create a virtual environment, install the dependencies, and start the FastAPI server from the project root.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

Do not run this build with `python -m http.server` if you want the application features to work. The browser client expects `/api/*` endpoints, cookies, and database-backed state.

If PowerShell blocks `Activate.ps1`, use one of these options:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

```powershell
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

## Default admin account

Use this only for local development. To expose the seeded admin credentials in the UI, set `SAFEED_EXPOSE_ADMIN_DEMO=true`.

- Email: `admin@safeed.local`
- Password: `SafeEdAdmin123!`

## Test suite

Run the backend tests with:

```powershell
pytest
```

The tests cover:

- bootstrap and seeded content availability
- registration and authenticated progress flows
- quiz submission and dashboard updates
- admin review and resource creation flows

## Seeded content

The application ships with authored seed content in [app/content](C:/VsCode/safeedu/app/content), including:

- harassment response foundations
- consent and boundaries
- digital safety and scam defense
- mental-health first response
- reporting and referrals
- bystander leadership

It also includes official support references such as `112`, Mission Shakti, the National Cyber Crime Reporting Portal, the National Commission for Women, `SHe-Box`, and `Tele-MANAS`.

## Notes

- The current database is a local SQLite file: `safeed.db`.
- If you update schema or seed data, delete `safeed.db` to force a clean rebuild.
- Email addresses are validated in the application layer without requiring optional Pydantic email extras.
- API responses are marked `Cache-Control: no-store`, and the service worker intentionally avoids caching `/api/*` routes.
- The old `test1.html` entry path is preserved as a redirect to the main app.

## Environment flags

- `SAFEED_DATABASE_URL`: override the SQLite database location.
- `SAFEED_EXPOSE_ADMIN_DEMO=true`: show the seeded admin credentials in the UI.
- `SAFEED_LLM_ENDPOINT`: optional HTTP endpoint for AI draft tracks.
- `SAFEED_LLM_MODEL`: optional model name to send to the draft endpoint.
