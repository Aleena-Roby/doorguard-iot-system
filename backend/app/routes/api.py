import io
import csv
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, make_response, current_app
from sqlalchemy import text
from app.extensions import db
from app.models import DoorEvent, Device, AppSetting
from app.services.event_service import (
    process_door_event,
    process_heartbeat,
    get_current_status,
    reset_simulation_data,
    list_all_devices,
    register_new_device,
    remove_device,
)
from app.services.stats_service import get_daily_statistics
from app.services.settings_service import (
    get_all_settings,
    set_setting,
    get_setting,
)

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/health", methods=["GET"])
def health_check():
    """Check backend health and verify live PostgreSQL database connectivity."""
    db_connected = False
    db_version = None
    try:
        result = db.session.execute(text("SELECT version();")).scalar()
        db_connected = True
        db_version = result
    except Exception as e:
        current_app.logger.error(f"Database health check failed: {e}")
        db_connected = False

    if not db_connected:
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "database_type": "postgresql",
            "error": "Failed to connect to PostgreSQL database",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 503

    return jsonify({
        "status": "healthy",
        "database": "connected",
        "database_type": "postgresql",
        "database_version": db_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


@api_bp.route("/devices", methods=["GET"])
def get_devices():
    """List all registered devices with online status."""
    devices = list_all_devices()
    return jsonify({"devices": devices}), 200


@api_bp.route("/devices", methods=["POST"])
def add_device():
    """
    Register a new device or update existing device info.
    Payload:
      - id: string (required)
      - name: string (optional)
      - operating_mode: 'ESP32' or 'SIMULATION' (optional)
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON body"}), 400

    device_id = data.get("id")
    if not device_id or not isinstance(device_id, str) or not device_id.strip():
        return jsonify({"error": "Field 'id' is required and cannot be empty"}), 400

    name = data.get("name") or "Smart Door Sensor"
    mode = data.get("operating_mode") or "ESP32"

    device = register_new_device(device_id=device_id, name=name, operating_mode=mode)
    return jsonify({
        "status": "success",
        "device": device.to_dict(),
    }), 201


@api_bp.route("/devices/<device_id>", methods=["DELETE"])
def delete_device(device_id: str):
    """Delete a device and cascade delete its associated events."""
    deleted = remove_device(device_id)
    if not deleted:
        return jsonify({"error": f"Device '{device_id}' not found"}), 404
    return jsonify({"status": "success", "message": f"Device '{device_id}' deleted"}), 200


@api_bp.route("/status", methods=["GET"])
def get_status():
    """Get current door status, duration, alert state, and device connectivity."""
    preferred_device_id = request.args.get("device_id")
    status = get_current_status(preferred_device_id)
    return jsonify(status), 200


@api_bp.route("/events", methods=["POST"])
def post_event():
    """
    Accept and process door state change events from ESP32 or client.
    Payload:
      - state: 'OPEN' or 'CLOSED' (required)
      - device_id: string (optional, defaults to config)
      - sequence_number: int (optional)
      - event_timestamp: ISO-8601 or unix timestamp (optional)
      - idempotency_key: string (optional)
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request body. Expected JSON object."}), 400

    state = data.get("state")
    if not state or not isinstance(state, str):
        return jsonify({"error": "Field 'state' is required and must be a string ('OPEN' or 'CLOSED')."}), 400

    clean_state = state.strip().upper()
    if clean_state not in ("OPEN", "CLOSED"):
        return jsonify({"error": f"Invalid state '{state}'. Must be 'OPEN' or 'CLOSED'."}), 400

    device_id = data.get("device_id") or current_app.config.get("DEFAULT_DEVICE_ID", "esp32_door_sensor_01")
    sequence_number = data.get("sequence_number")
    if sequence_number is not None:
        try:
            sequence_number = int(sequence_number)
        except (ValueError, TypeError):
            sequence_number = None

    event_timestamp = data.get("event_timestamp")
    idempotency_key = data.get("idempotency_key")
    source = data.get("source", "ESP32")

    try:
        event, changed = process_door_event(
            device_id=device_id,
            state=clean_state,
            source=source,
            event_timestamp=event_timestamp,
            sequence_number=sequence_number,
            idempotency_key=idempotency_key,
        )
        return jsonify({
            "status": "success",
            "state_changed": changed,
            "event": event.to_dict(),
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        current_app.logger.error(f"Error processing event: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to process door event", "details": str(e)}), 500


@api_bp.route("/heartbeat", methods=["POST"])
def post_heartbeat():
    """
    Heartbeat endpoint for ESP32 and connected devices to report active connectivity.
    Payload:
      - device_id: string (optional)
      - mode: 'ESP32' or 'SIMULATION' (optional)
    """
    data = request.get_json(silent=True) or {}
    device_id = data.get("device_id") or current_app.config.get("DEFAULT_DEVICE_ID", "esp32_door_sensor_01")
    mode = data.get("mode", "ESP32")

    device = process_heartbeat(device_id=device_id, mode=mode)
    return jsonify({
        "status": "success",
        "device": device.to_dict(),
        "server_time": datetime.now(timezone.utc).isoformat(),
    }), 200


@api_bp.route("/events", methods=["GET"])
def get_events():
    """
    Get paginated or limited history of door events.
    Query parameters:
      - limit: int (default: 50, max: 200)
      - page: int (default: 1)
      - source: 'ESP32' | 'SIMULATION' (optional)
      - state: 'OPEN' | 'CLOSED' (optional)
    """
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
        page = max(int(request.args.get("page", 1)), 1)
    except ValueError:
        limit, page = 50, 1

    source = request.args.get("source")
    state = request.args.get("state")
    device_id = request.args.get("device_id")

    query = DoorEvent.query
    if source:
        query = query.filter(DoorEvent.source == source.upper())
    if state:
        query = query.filter(DoorEvent.state == state.upper())
    if device_id:
        query = query.filter(DoorEvent.device_id == device_id)

    total_count = query.count()
    events = (
        query.order_by(DoorEvent.event_timestamp.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return jsonify({
        "total": total_count,
        "page": page,
        "limit": limit,
        "events": [e.to_dict() for e in events],
    }), 200


@api_bp.route("/stats", methods=["GET"])
def get_stats():
    """Return today's summary metrics and hourly activity chart data."""
    device_id = request.args.get("device_id")
    stats = get_daily_statistics(device_id)
    return jsonify(stats), 200


@api_bp.route("/settings", methods=["GET"])
def get_settings():
    """Get active application settings."""
    settings = get_all_settings()
    return jsonify(settings), 200


@api_bp.route("/settings", methods=["PUT"])
def update_settings():
    """
    Update application settings such as alert threshold.
    Payload:
      - alert_threshold_seconds: int (e.g., 10, 30, 60, 300)
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request body. Expected JSON object."}), 400

    updated = {}
    if "alert_threshold_seconds" in data:
        try:
            threshold = int(data["alert_threshold_seconds"])
            if threshold <= 0 or threshold > 3600:
                return jsonify({"error": "alert_threshold_seconds must be between 1 and 3600 seconds."}), 400
            set_setting("alert_threshold_seconds", str(threshold))
            updated["alert_threshold_seconds"] = threshold
        except (ValueError, TypeError):
            return jsonify({"error": "alert_threshold_seconds must be an integer."}), 400

    if "heartbeat_timeout_seconds" in data:
        try:
            timeout = int(data["heartbeat_timeout_seconds"])
            if timeout <= 0 or timeout > 600:
                return jsonify({"error": "heartbeat_timeout_seconds must be between 1 and 600 seconds."}), 400
            set_setting("heartbeat_timeout_seconds", str(timeout))
            updated["heartbeat_timeout_seconds"] = timeout
        except (ValueError, TypeError):
            return jsonify({"error": "heartbeat_timeout_seconds must be an integer."}), 400

    all_current = get_all_settings()
    return jsonify({
        "status": "success",
        "updated": updated,
        "settings": all_current,
    }), 200


@api_bp.route("/events/export", methods=["GET"])
def export_events_csv():
    """Export stored events as a downloadable CSV file."""
    device_id = request.args.get("device_id")
    source = request.args.get("source")

    query = DoorEvent.query
    if device_id:
        query = query.filter(DoorEvent.device_id == device_id)
    if source:
        query = query.filter(DoorEvent.source == source.upper())

    events = query.order_by(DoorEvent.event_timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID",
        "Device ID",
        "State",
        "Source",
        "Event Timestamp (UTC)",
        "Server Received Timestamp (UTC)",
        "Duration Seconds",
        "Sequence Number",
        "Idempotency Key",
    ])

    for e in events:
        writer.writerow([
            e.id,
            e.device_id,
            e.state,
            e.source,
            e.event_timestamp.isoformat() if e.event_timestamp else "",
            e.server_received_at.isoformat() if e.server_received_at else "",
            e.duration_seconds if e.duration_seconds is not None else "",
            e.sequence_number if e.sequence_number is not None else "",
            e.idempotency_key or "",
        ])

    csv_data = output.getvalue()
    filename = f"doorguard_events_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    response = make_response(csv_data)
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    return response


@api_bp.route("/simulation/door", methods=["POST"])
def simulate_door_event():
    """
    Trigger simulated door open/close event.
    Only available when ALLOW_SIMULATION is enabled.
    """
    if not current_app.config.get("ALLOW_SIMULATION", True):
        return jsonify({"error": "Simulation is disabled in production mode."}), 403

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request body. Expected JSON object."}), 400

    state = data.get("state")
    if not state or not isinstance(state, str):
        return jsonify({"error": "Field 'state' is required ('OPEN' or 'CLOSED')."}), 400

    clean_state = state.strip().upper()
    if clean_state not in ("OPEN", "CLOSED"):
        return jsonify({"error": f"Invalid state '{state}'. Must be 'OPEN' or 'CLOSED'."}), 400

    sim_device_id = current_app.config.get("SIMULATION_DEVICE_ID", "simulation_device")

    try:
        event, changed = process_door_event(
            device_id=sim_device_id,
            state=clean_state,
            source="SIMULATION",
            event_timestamp=datetime.now(timezone.utc),
        )
        current_status = get_current_status(preferred_device_id=sim_device_id)
        return jsonify({
            "status": "success",
            "state_changed": changed,
            "event": event.to_dict(),
            "current_status": current_status,
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error in simulation: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to simulate door event", "details": str(e)}), 500


@api_bp.route("/simulation/reset", methods=["POST"])
def reset_simulation():
    """
    Reset simulation data only. Real ESP32 events and settings are preserved.
    Only available when ALLOW_SIMULATION is enabled.
    """
    if not current_app.config.get("ALLOW_SIMULATION", True):
        return jsonify({"error": "Simulation reset is disabled in production mode."}), 403

    sim_device_id = current_app.config.get("SIMULATION_DEVICE_ID", "simulation_device")
    result = reset_simulation_data(simulation_device_id=sim_device_id)
    return jsonify(result), 200

