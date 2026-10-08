"""
AI HEAVEN - PostgreSQL Database Configuration
Reads DATABASE_URL from internal server environment variables.
Provides connection metadata and status reporting without inventing credentials.
"""

import os
from typing import Optional
from urllib.parse import urlparse

DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")


def get_database_status() -> dict:
    """
    Returns connection and configuration status for PostgreSQL database.
    Does NOT invent credentials or report fake active connections.
    """
    if not DATABASE_URL or not DATABASE_URL.strip():
        return {
            "configured": False,
            "status": "UNVERIFIED",
            "message": "DATABASE_URL is not configured in environment. In-memory store active."
        }

    try:
        parsed = urlparse(DATABASE_URL)
        # Redact credentials for security
        safe_url = f"{parsed.scheme}://***:***@{parsed.hostname}:{parsed.port or 5432}{parsed.path}"
        return {
            "configured": True,
            "status": "CONFIGURED",
            "scheme": parsed.scheme,
            "host": parsed.hostname,
            "port": parsed.port or 5432,
            "database": parsed.path.lstrip("/"),
            "safe_url": safe_url,
            "connection_test": "UNVERIFIED (Requires running PostgreSQL daemon in deployment environment)"
        }
    except Exception as e:
        return {
            "configured": False,
            "status": "INVALID",
            "error": str(e)
        }
