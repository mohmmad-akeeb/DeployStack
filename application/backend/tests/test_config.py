from app.core.config import Settings


def test_settings_default_values() -> None:
    """Verify settings defaults are sane and structured properly."""
    settings = Settings()
    assert settings.PROJECT_NAME == "DeployStack"
    assert settings.API_V1_STR == "/api/v1"
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.BACKEND_CORS_ORIGINS) > 0
    assert "postgresql://" in settings.sync_database_url


def test_cors_origins_parsing() -> None:
    """Verify CORS origins string is correctly parsed into a list."""
    settings = Settings(BACKEND_CORS_ORIGINS=["http://localhost:3000"])
    assert settings.BACKEND_CORS_ORIGINS == ["http://localhost:3000"]
