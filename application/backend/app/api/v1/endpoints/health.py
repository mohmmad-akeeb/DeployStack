from fastapi import APIRouter

from app.core.config import settings
from app.core.database import check_db_health
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System Health & Readiness Probe",
    description="Returns service availability, environment information, and database connection status.",
)
def get_health() -> HealthResponse:
    db_ok = check_db_health()
    status_str = "healthy" if db_ok else "degraded"
    return HealthResponse(
        status=status_str,
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
        version="0.1.0",
    )
