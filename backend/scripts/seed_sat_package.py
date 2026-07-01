from __future__ import annotations

import json
from pathlib import Path
import sys


def _ensure_import_path() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))


def main() -> int:
    _ensure_import_path()
    from app.services.package_service import seedSATPackageInfrastructure

    result = seedSATPackageInfrastructure()
    report = result["report"]

    print("SAT package seed complete")
    print(
        json.dumps(
            {
                "package_count": report["package_count"],
                "concept_count": report["concept_count"],
                "relationship_count": report["relationship_count"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())