import os
from datetime import timedelta

def normalize_database_url(url: str | None) -> str:
    """Normalize postgres database URLs to postgresql+psycopg scheme."""
    if not url:
        return "postgresql+psycopg://postgres:postgrespassword@localhost:5432/doorguard"
    
    # Handle postgres:// legacy format
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    
    # Handle generic postgresql:// without driver specified
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
        
    return url


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "doorguard-secret-key-change-in-prod")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Database configuration (PostgreSQL only - strictly no SQLite)
    SQLALCHEMY_DATABASE_URI = normalize_database_url(
        os.environ.get("DATABASE_URL")
    )
    
    # Engine options for connection pooling and health checks
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    
    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    
    # App defaults
    ALERT_DEFAULT_THRESHOLD_SECONDS = int(os.environ.get("ALERT_DEFAULT_THRESHOLD_SECONDS", 10))
    HEARTBEAT_TIMEOUT_SECONDS = int(os.environ.get("HEARTBEAT_TIMEOUT_SECONDS", 30))
    DEFAULT_DEVICE_ID = os.environ.get("DEFAULT_DEVICE_ID", "esp32_main_gate")
    SIMULATION_DEVICE_ID = os.environ.get("SIMULATION_DEVICE_ID", "simulation_device")
    
    # Simulation allowed only in development/testing
    ALLOW_SIMULATION = os.environ.get("ALLOW_SIMULATION", "true").lower() in ("true", "1", "yes")


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    ALLOW_SIMULATION = True
    # Dedicated PostgreSQL test database (Strictly PostgreSQL, no SQLite)
    SQLALCHEMY_DATABASE_URI = normalize_database_url(
        os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgrespassword@localhost:5432/doorguard_test")
    )


class ProductionConfig(Config):
    DEBUG = False
    # In production, simulation endpoints should be disabled by default
    ALLOW_SIMULATION = os.environ.get("ALLOW_SIMULATION", "false").lower() in ("true", "1", "yes")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

