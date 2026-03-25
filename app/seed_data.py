from __future__ import annotations

from .content_loader import load_content_bundle


CONTENT_BUNDLE = load_content_bundle()
CONTENT_MANIFEST = CONTENT_BUNDLE.get("manifest", {})
SEED_TRACKS = CONTENT_BUNDLE.get("tracks", [])
SEED_RESOURCES = CONTENT_BUNDLE.get("resources", [])
SEED_PROGRAMS = CONTENT_BUNDLE.get("programs", [])
SEED_SUPPORT_CONTACTS = CONTENT_BUNDLE.get("support_contacts", [])
REPORTING_DEFAULTS = CONTENT_BUNDLE.get("reporting", {})
