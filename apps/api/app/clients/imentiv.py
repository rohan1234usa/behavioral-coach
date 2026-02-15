"""
Thin wrapper around the official Imentiv Python SDK.
Replaces the previous hand-rolled HTTP client.
"""
import os
import logging
from typing import Optional
from imentiv import ImentivClient as OfficialImentivClient

logger = logging.getLogger("ImentivClient")

# Module-level singleton (lazy-initialized)
_client: Optional[OfficialImentivClient] = None


def get_imentiv_client() -> OfficialImentivClient:
    """
    Returns a singleton ImentivClient instance.
    Uses the IMENTIV_API_KEY environment variable.
    Timeout set high (120s) to accommodate video uploads.
    """
    global _client
    if _client is None:
        api_key = os.getenv("IMENTIV_API_KEY")
        if not api_key:
            raise ValueError(
                "IMENTIV_API_KEY environment variable is not set. "
                "Add it to your .env file."
            )
        _client = OfficialImentivClient(
            api_key=api_key,
            timeout=120,
            max_retries=3,
        )
        logger.info("✅ Official Imentiv SDK client initialized")
    return _client