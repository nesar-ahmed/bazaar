import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main as main_module
from app.core.config import settings
from app.db.base import Base
from app.db import session as database_session
from app.db.session import get_db
from app.main import app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(
        settings, "jwt_secret_key", "test-secret-key-with-at-least-32-characters"
    )

    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(main_module, "SessionLocal", test_session)
    monkeypatch.setattr(database_session, "SessionLocal", test_session)

    def override_get_db():
        database = test_session()
        try:
            yield database
        finally:
            database.close()

    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()
