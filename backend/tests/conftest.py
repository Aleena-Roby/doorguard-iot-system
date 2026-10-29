import os
import pytest
from app import create_app
from app.extensions import db
from app.services.settings_service import init_default_settings
from app.models import Device, DoorEvent, AppSetting


@pytest.fixture(scope="session")
def app():
    """Create and configure a testing Flask app instance connected to PostgreSQL test DB."""
    # Enforce strictly testing mode and PostgreSQL test database
    os.environ["FLASK_ENV"] = "testing"
    os.environ["TEST_DATABASE_URL"] = "postgresql+psycopg://postgres:postgrespassword@localhost:5432/doorguard_test"
    
    flask_app = create_app("testing")

    with flask_app.app_context():
        # Clean and rebuild tables in the dedicated test database
        db.create_all()
        init_default_settings()

    yield flask_app

    with flask_app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean all records before each test to guarantee test isolation."""
    with app.app_context():
        DoorEvent.query.delete()
        Device.query.delete()
        AppSetting.query.delete()
        db.session.commit()
        init_default_settings()
    yield


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

