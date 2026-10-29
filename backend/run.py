import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

from app import create_app
from app.extensions import db
from app.services.settings_service import init_default_settings

env = os.environ.get("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    with app.app_context():
        # Ensure tables and initial settings are created in PostgreSQL
        try:
            db.create_all()
            init_default_settings()
            print("PostgreSQL tables and default settings initialized.")
        except Exception as e:
            print(f"Database initialization error: {e}")

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 5000))
    debug = env == "development"
    print(f"Starting DoorGuard backend on {host}:{port} (debug={debug})...")
    app.run(host=host, port=port, debug=debug)

