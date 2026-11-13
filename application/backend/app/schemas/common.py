"""Common and shared Pydantic validation schemas."""

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = Field(default="healthy", description="Overall service status")
    environment: str = Field(..., description="Current environment mode (development/production)")
    database_connected: bool = Field(..., description="PostgreSQL connectivity status")
    version: str = Field(default="0.1.0", description="Application API version")


class MessageResponse(BaseModel):
    """Generic message schema."""

    message: str
    detail: str | None = None


class BaseSchema(BaseModel):
    """Base schema configured with ORM mode."""

    model_config = ConfigDict(from_attributes=True)
