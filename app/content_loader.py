from __future__ import annotations

import json
from pathlib import Path
from typing import Any


CONTENT_DIR = Path(__file__).resolve().parent / "content"


def _read_json(filename: str, default: Any) -> Any:
    path = CONTENT_DIR / filename
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default
    except json.JSONDecodeError:
        return default


def load_content_bundle() -> dict[str, Any]:
    return {
        "manifest": _read_json("manifest.json", {}),
        "tracks": _read_json("tracks.json", []),
        "resources": _read_json("resources.json", []),
        "programs": _read_json("programs.json", []),
        "support_contacts": _read_json("support_contacts.json", []),
        "reporting": _read_json("reporting.json", {}),
    }
