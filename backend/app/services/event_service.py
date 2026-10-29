from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional
from app.extensions import db
from app.models import Device, DoorEvent
from app.services.settings_service import get_setting


def parse_timestamp(ts_value: Any) -> datetime:
    """Safely parse ISO string or timestamp number to timezone-aware UTC datetime."""
    if isinstance(ts_value, datetime):
        if ts_value.tzinfo is None:
            return ts_value.replace(tzinfo=timezone.utc)
        return ts_value.astimezone(timezone.utc)
    if isinstance(ts_value, (int, float)):
        # Support both seconds and milliseconds unix timestamps
        if ts_value > 1e11:
            ts_value = ts_value / 1000.0
        return datetime.fromtimestamp(ts_value, tz=timezone.utc)
    if isinstance(ts_value, str):
        try:
            # Replace Z with +00:00 for fromisoformat compatibility
            clean_ts = ts_value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)


def get_or_create_device(device_id: str, default_name: str = "Main Entrance Door", mode: str = "ESP32") -> Device:
    """Get device or create new record if missing."""
    device = db.session.get(Device, device_id)
    if not device:
        device = Device(
            id=device_id,
            name=default_name,
            current_state="CLOSED",
            operating_mode=mode,
            last_seen_at=datetime.now(timezone.utc),
        )
        db.session.add(device)
        db.session.commit()
    return device


def process_heartbeat(device_id: str, mode: str = "ESP32") -> Device:
    """Update device heartbeat / last seen timestamp."""
    now = datetime.now(timezone.utc)
    device = db.session.get(Device, device_id)
    if not device:
        device = Device(
            id=device_id,
            name="Main Entrance Door" if mode == "ESP32" else "Simulated Door",
            current_state="CLOSED",
            operating_mode=mode,
            last_seen_at=now,
        )
        db.session.add(device)
    else:
        device.last_seen_at = now
        device.operating_mode = mode
    db.session.commit()
    return device


def process_door_event(
    device_id: str,
    state: str,
    source: str = "ESP32",
    event_timestamp: Optional[Any] = None,
    sequence_number: Optional[int] = None,
    idempotency_key: Optional[str] = None,
) -> Tuple[DoorEvent, bool]:
    """
    Process incoming door event with validation, idempotency, duplicate suppression,
    and duration tracking.
    
    Returns (DoorEvent, is_state_changed).
    """
    clean_state = state.strip().upper()
    if clean_state not in ("OPEN", "CLOSED"):
        raise ValueError(f"Invalid state '{state}'. Must be 'OPEN' or 'CLOSED'.")

    # Check idempotency key if provided
    if idempotency_key:
        existing = DoorEvent.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return existing, False

    dt_event = parse_timestamp(event_timestamp)
    now_utc = datetime.now(timezone.utc)

    device = get_or_create_device(
        device_id=device_id,
        default_name="Simulated Door" if source == "SIMULATION" else "Main Entrance Door",
        mode=source,
    )

    prev_state = device.current_state
    is_state_changed = (clean_state != prev_state)
    duration_seconds = None

    # Handle state transition
    if is_state_changed:
        if clean_state == "OPEN":
            device.last_opened_at = dt_event
        elif clean_state == "CLOSED":
            if device.last_opened_at:
                # Calculate duration of the continuous open period
                raw_duration = (dt_event - device.last_opened_at).total_seconds()
                duration_seconds = round(max(0.0, raw_duration), 2)
            device.last_opened_at = None

    # Only update current_state if event is newer than or equal to last_event_at
    is_newer_or_equal = True
    if device.last_event_at and dt_event < device.last_event_at:
        is_newer_or_equal = False

    if is_newer_or_equal:
        device.current_state = clean_state
        device.last_event_at = dt_event
        device.operating_mode = source

    device.last_seen_at = now_utc

    # Record event in PostgreSQL
    event = DoorEvent(
        device_id=device.id,
        state=clean_state,
        event_timestamp=dt_event,
        server_received_at=now_utc,
        source=source,
        sequence_number=sequence_number,
        idempotency_key=idempotency_key,
        duration_seconds=duration_seconds,
    )
    db.session.add(event)
    db.session.commit()

    return event, is_state_changed


def get_current_status(preferred_device_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate and return current door monitoring status including open duration,
    alert trigger state, and device connectivity.
    """
    now = datetime.now(timezone.utc)

    # Find the most relevant device (preferred_device_id or most recently seen device)
    device = None
    if preferred_device_id:
        device = db.session.get(Device, preferred_device_id)

    if not device:
        device = Device.query.order_by(Device.last_seen_at.desc().nullslast()).first()

    # If still no device, provide default offline closed state
    if not device:
        device = Device(
            id="esp32_main_gate",
            name="Main Gate",
            current_state="CLOSED",
            operating_mode="ESP32",
            last_seen_at=None,
        )

    # Load alert threshold and heartbeat timeout settings
    alert_threshold = int(get_setting("alert_threshold_seconds", "10"))
    heartbeat_timeout = int(get_setting("heartbeat_timeout_seconds", "30"))

    # Determine online/offline status
    is_online = False
    if device.last_seen_at:
        diff_seconds = (now - device.last_seen_at).total_seconds()
        is_online = (diff_seconds <= heartbeat_timeout)

    # Calculate current open duration
    open_duration_seconds = 0.0
    if device.current_state == "OPEN":
        ref_time = device.last_opened_at or device.last_event_at
        if ref_time:
            open_duration_seconds = max(0.0, (now - ref_time).total_seconds())

    open_duration_seconds = round(open_duration_seconds, 1)

    # Alert is active if door is OPEN and open duration >= threshold
    is_alert_active = (device.current_state == "OPEN" and open_duration_seconds >= alert_threshold)

    return {
        "device_id": device.id,
        "device_name": device.name,
        "current_state": device.current_state,
        "operating_mode": device.operating_mode,
        "is_online": is_online,
        "open_duration_seconds": open_duration_seconds,
        "is_alert_active": is_alert_active,
        "alert_threshold_seconds": alert_threshold,
        "heartbeat_timeout_seconds": heartbeat_timeout,
        "last_opened_at": device.last_opened_at.isoformat() if device.last_opened_at else None,
        "last_event_at": device.last_event_at.isoformat() if device.last_event_at else None,
        "last_seen_at": device.last_seen_at.isoformat() if device.last_seen_at else None,
        "server_time": now.isoformat(),
    }


def list_all_devices() -> list:
    """List all registered devices with evaluated online status."""
    now = datetime.now(timezone.utc)
    heartbeat_timeout = int(get_setting("heartbeat_timeout_seconds", "30"))
    devices = Device.query.order_by(Device.created_at.asc()).all()
    results = []
    for d in devices:
        is_online = False
        if d.last_seen_at:
            is_online = (now - d.last_seen_at).total_seconds() <= heartbeat_timeout
        results.append({
            "id": d.id,
            "name": d.name,
            "current_state": d.current_state,
            "operating_mode": d.operating_mode,
            "is_online": is_online,
            "last_event_at": d.last_event_at.isoformat() if d.last_event_at else None,
            "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else None,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return results


def register_new_device(device_id: str, name: str, operating_mode: str = "ESP32") -> Device:
    """Register or update a device."""
    clean_id = device_id.strip()
    clean_name = name.strip() or "Smart Door Sensor"
    clean_mode = operating_mode.strip().upper()
    if clean_mode not in ("ESP32", "SIMULATION"):
        clean_mode = "ESP32"

    device = db.session.get(Device, clean_id)
    if not device:
        device = Device(
            id=clean_id,
            name=clean_name,
            current_state="CLOSED",
            operating_mode=clean_mode,
            last_seen_at=None,
        )
        db.session.add(device)
    else:
        device.name = clean_name
        device.operating_mode = clean_mode

    db.session.commit()
    return device


def remove_device(device_id: str) -> bool:
    """Delete a device and its related events."""
    device = db.session.get(Device, device_id)
    if not device:
        return False
    db.session.delete(device)
    db.session.commit()
    return True


def reset_simulation_data(simulation_device_id: str = "simulation_device") -> Dict[str, Any]:
    """
    Delete simulation events and reset simulation device state.
    Real ESP32 records and application settings are preserved.
    """
    deleted_events_count = DoorEvent.query.filter(
        (DoorEvent.source == "SIMULATION") | (DoorEvent.device_id == simulation_device_id)
    ).delete(synchronize_session=False)

    sim_device = db.session.get(Device, simulation_device_id)
    if sim_device:
        sim_device.current_state = "CLOSED"
        sim_device.last_opened_at = None
        sim_device.last_event_at = None
        sim_device.last_seen_at = datetime.now(timezone.utc)

    db.session.commit()
    return {
        "status": "success",
        "deleted_events": deleted_events_count,
        "message": f"Successfully reset simulation. Deleted {deleted_events_count} simulated events.",
    }
