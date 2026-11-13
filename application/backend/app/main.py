import json
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.endpoints.health import get_health
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppException


class StructuredFormatter(logging.Formatter):
    """Formats log records as structured key-value / JSON strings."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            log_entry["exception"] = record.exc_text
        return json.dumps(log_entry)


handler = logging.StreamHandler()
handler.setFormatter(StructuredFormatter())
logging.basicConfig(level=settings.LOG_LEVEL, handlers=[handler], force=True)
logger = logging.getLogger("deploystack.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan events for startup and shutdown."""
    logger.info("DeployStack backend initializing in %s mode...", settings.ENVIRONMENT)
    yield
    logger.info("DeployStack backend shutting down gracefully.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="DeployStack Three-Tier Web Application Modular Monolith Backend API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Exception Handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    error_phrase = (
        exc.error
        or (HTTPStatus(exc.status_code).phrase if exc.status_code in HTTPStatus._value2member_map_ else "Error")
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status_code": exc.status_code,
            "error": error_phrase,
            "message": exc.message,
            "detail": exc.detail,
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "path": request.url.path,
        },
        headers=exc.headers,
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    error_phrase = (
        HTTPStatus(exc.status_code).phrase
        if exc.status_code in HTTPStatus._value2member_map_
        else "Error"
    )
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    detail = exc.detail if isinstance(exc.detail, list) else [{"issue": message}]
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status_code": exc.status_code,
            "error": error_phrase,
            "message": message,
            "detail": detail,
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "path": request.url.path,
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Maintain OpenAPI 422 standard format for request validation errors."""
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server exception at %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={
            "status_code": 500,
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred.",
            "detail": [],
            "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "path": request.url.path,
        },
    )


# Master API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Top-level health probe for ALB and container runtime orchestrators
app.add_api_route("/health", get_health, methods=["GET"], tags=["Health"])


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    """Root entrypoint returning basic service descriptor."""
    return {
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "status": "online",
        "documentation": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
