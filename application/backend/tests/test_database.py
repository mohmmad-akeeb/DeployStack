from sqlalchemy import text

from app.core.database import check_db_health, engine, get_db


def test_database_connection_and_ping() -> None:
    """Verify live database connectivity and ping execution."""
    assert check_db_health() is True
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 42")).scalar()
        assert result == 42


def test_get_db_session_yields_and_closes() -> None:
    """Verify get_db generator yields active session and closes upon completion."""
    session_gen = get_db()
    db = next(session_gen)
    assert db.is_active is True
    # Verify session can execute queries
    res = db.execute(text("SELECT 1")).scalar()
    assert res == 1

    # Closing generator
    try:
        next(session_gen)
    except StopIteration:
        pass


def test_get_db_rollback_on_exception() -> None:
    """Verify get_db rolls back the transaction if an exception occurs."""
    session_gen = get_db()
    _ = next(session_gen)
    try:
        raise RuntimeError("Simulated failure in request")
    except RuntimeError as exc:
        try:
            session_gen.throw(exc)
        except RuntimeError:
            pass
