from datetime import datetime, timezone
from app.extensions import db
from app.models import AppSetting

DEFAULT_SETTINGS = {
    "alert_threshold_seconds": "10",
    "heartbeat_timeout_seconds": "30",
    "active_device_id": "esp32_door_sensor_01",
}


def get_setting(key: str, default: str | None = None) -> str:
    """Retrieve setting value from database, fallback to defaults."""
    setting = db.session.get(AppSetting, key)
    if setting:
        return setting.value
    if default is not None:
        return default
    return DEFAULT_SETTINGS.get(key, "")


def set_setting(key: str, value: str) -> AppSetting:
    """Save or update setting in database."""
    setting = db.session.get(AppSetting, key)
    if not setting:
        setting = AppSetting(key=key, value=str(value))
        db.session.add(setting)
    else:
        setting.value = str(value)
        setting.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return setting


def get_all_settings() -> dict:
    """Return dictionary of all application settings."""
    settings = {**DEFAULT_SETTINGS}
    db_settings = AppSetting.query.all()
    for s in db_settings:
        settings[s.key] = s.value
        
    return {
        "alert_threshold_seconds": int(settings.get("alert_threshold_seconds", 10)),
        "heartbeat_timeout_seconds": int(settings.get("heartbeat_timeout_seconds", 30)),
        "active_device_id": settings.get("active_device_id", "esp32_door_sensor_01"),
    }


def init_default_settings():
    """Ensure default settings exist in the database."""
    for key, value in DEFAULT_SETTINGS.items():
        if not db.session.get(AppSetting, key):
            db.session.add(AppSetting(key=key, value=value))
    db.session.commit()
