import os
from flask import Flask
from app.config import config_by_name
from app.extensions import db, migrate, cors
from app.routes.api import api_bp


def create_app(config_name: str | None = None) -> Flask:
    """Application factory for DoorGuard Flask backend."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    config_obj = config_by_name.get(config_name, config_by_name["development"])
    app.config.from_object(config_obj)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Configure CORS with allowed origins
    cors_origins = app.config.get("CORS_ORIGINS", "*")
    if cors_origins == "*":
        cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    else:
        origins_list = [o.strip() for o in cors_origins.split(",") if o.strip()]
        cors.init_app(app, resources={r"/api/*": {"origins": origins_list}})

    # Register blueprints
    app.register_blueprint(api_bp)

    # Global index route for simple diagnostics
    @app.route("/", methods=["GET"])
    def index():
        return {
            "name": "DoorGuard API",
            "version": "1.0.0",
            "documentation": "/api/health",
            "status": "online",
        }

    return app

