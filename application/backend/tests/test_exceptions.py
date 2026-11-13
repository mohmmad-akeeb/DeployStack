from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.core.exceptions import (
    BadRequestException,
    EntityNotFoundException,
    ForbiddenException,
    UnauthorizedException,
)
from app.main import app

exception_test_router = APIRouter(prefix="/test-exceptions")


@exception_test_router.get("/not-found")
def trigger_not_found() -> None:
    raise EntityNotFoundException("Task", "123e4567-e89b-12d3-a456-426614174000")


@exception_test_router.get("/bad-request")
def trigger_bad_request() -> None:
    raise BadRequestException("Invalid parameter supplied")


@exception_test_router.get("/unauthorized")
def trigger_unauthorized() -> None:
    raise UnauthorizedException("Authentication token expired")


@exception_test_router.get("/forbidden")
def trigger_forbidden() -> None:
    raise ForbiddenException("User is not a member of this project")


@exception_test_router.get("/unhandled")
def trigger_unhandled() -> None:
    raise RuntimeError("Unexpected internal crash")


app.include_router(exception_test_router)


def test_entity_not_found_exception(client: TestClient) -> None:
    response = client.get("/test-exceptions/not-found")
    assert response.status_code == 404
    data = response.json()
    assert data["status_code"] == 404
    assert data["error"] == "Not Found"
    assert "Task with ID '123e4567-e89b-12d3-a456-426614174000' was not found" in data["message"]
    assert data["path"] == "/test-exceptions/not-found"
    assert "timestamp" in data


def test_bad_request_exception(client: TestClient) -> None:
    response = client.get("/test-exceptions/bad-request")
    assert response.status_code == 400
    data = response.json()
    assert data["status_code"] == 400
    assert data["error"] == "Bad Request"
    assert data["message"] == "Invalid parameter supplied"


def test_unauthorized_exception(client: TestClient) -> None:
    response = client.get("/test-exceptions/unauthorized")
    assert response.status_code == 401
    data = response.json()
    assert data["status_code"] == 401
    assert data["error"] == "Unauthorized"
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_forbidden_exception(client: TestClient) -> None:
    response = client.get("/test-exceptions/forbidden")
    assert response.status_code == 403
    data = response.json()
    assert data["status_code"] == 403
    assert data["error"] == "Forbidden"


def test_unhandled_exception() -> None:
    with TestClient(app, raise_server_exceptions=False) as unhandled_client:
        response = unhandled_client.get("/test-exceptions/unhandled")
        assert response.status_code == 500
        data = response.json()
        assert data["status_code"] == 500
        assert data["error"] == "Internal Server Error"
        assert "Unexpected internal crash" not in data["message"]  # no leaked sensitive trace
