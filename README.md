# SafeEd

SafeEd is a static safety-education frontend designed for India-focused learning, support awareness, and community facilitation. The current version is a rebuilt product shell intended to replace the original one-file prototype with a cleaner, deployable, more credible structure.

## Agenda

SafeEd exists to do four things well:

1. Prevent harm earlier by teaching pattern recognition around harassment, coercion, unsafe digital behavior, and escalation risk.
2. Improve response quality by giving users clearer ways to document, refer, and route issues safely.
3. Support recovery with calmer language, mental-health-first-response framing, and referral awareness.
4. Scale responsibly through maintainable code, accessible UI patterns, offline support, and higher-trust public-service references.

## Uses

SafeEd is suitable for:

1. School and college orientation programs.
2. NGO-led workshops and facilitator toolkits.
3. Workplace awareness initiatives and refresher programs.
4. Parent, caregiver, and community resource sessions.
5. Lightweight safety-resource hubs on static hosting platforms.

## Upgrade summary

The original project was a single `test1.html` file with bundled styles, scripts, demo-only login behavior, in-memory progress, stale dated content, and limited production structure. This upgrade replaces that with:

1. `index.html` as the main entry point, with `test1.html` preserved as a redirect.
2. A stronger brand layer with custom SafeEd SVG logo assets.
3. Split CSS and JS files for maintainability.
4. A local learner planner instead of a fake authentication modal.
5. Track completion and saved resources persisted in local storage.
6. Verified support-routing references pointed toward official or primary public-service sources.
7. PWA basics through `site.webmanifest` and `sw.js`.
8. Responsive, keyboard-friendly UI and reduced external dependency weight.

## Project structure

```text
.
|-- index.html
|-- test1.html
|-- assets/
|   |-- brand/
|   |-- css/
|   `-- js/
|-- sw.js
|-- site.webmanifest
|-- PROJECT_AUDIT.md
`-- README.md
```

## Run locally

You can open `index.html` directly in a browser. For service-worker behavior and a cleaner local environment, run a static server from the project root:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Verified public-service references

These were cross-checked on March 10, 2026:

1. [Emergency Response Support System](https://112.gov.in/)
2. [Mission Shakti contact and helplines](https://missionshakti.wcd.gov.in/contact)
3. [National Cyber Crime Reporting Portal](https://cybercrime.gov.in/)
4. [National Commission for Women](https://www.ncw.gov.in/)
5. [SHe-Box](https://shebox.wcd.gov.in/)
6. [Tele-MANAS](https://telemanas.mohfw.gov.in/)

## Notes

1. The current build is English-first because partially translated safety content is a credibility risk if it has not been reviewed by a human editor or subject expert.
2. This is still a frontend-only product shell. Production rollout should add content governance, analytics, backend auth if needed, and an editorial review workflow.
3. No license file was added because ownership and open-source intent should be set explicitly by the project owner.
