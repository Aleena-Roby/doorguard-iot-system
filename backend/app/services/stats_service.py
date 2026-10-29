from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func
from app.extensions import db
from app.models import DoorEvent, Device


def get_daily_statistics(device_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Compute daily statistics from PostgreSQL records for today (UTC):
    - Door openings count today
    - Total door-open duration today (seconds)
    - Longest continuous opening today (seconds)
    - Current open duration
    - Hourly activity chart data
    """
    now = datetime.now(timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)

    query_events = DoorEvent.query.filter(DoorEvent.event_timestamp >= start_of_today)
    if device_id:
        query_events = query_events.filter(DoorEvent.device_id == device_id)

    today_events: List[DoorEvent] = query_events.order_by(DoorEvent.event_timestamp.asc()).all()

    # Count openings today
    openings_today = sum(1 for e in today_events if e.state == "OPEN")

    # Completed durations from CLOSED events
    completed_durations = [e.duration_seconds for e in today_events if e.state == "CLOSED" and e.duration_seconds is not None]
    total_completed_duration = sum(completed_durations) if completed_durations else 0.0

    # Check active device current open duration
    device_query = Device.query
    if device_id:
        device = device_query.filter_by(id=device_id).first()
    else:
        device = device_query.order_by(Device.last_seen_at.desc().nullslast()).first()

    current_open_duration = 0.0
    if device and device.current_state == "OPEN":
        ref_time = device.last_opened_at or device.last_event_at
        if ref_time:
            # If opened before today, calculate duration starting from midnight
            effective_start = max(ref_time, start_of_today)
            current_open_duration = max(0.0, (now - effective_start).total_seconds())

    total_duration_today = round(total_completed_duration + current_open_duration, 1)

    # Longest opening today
    all_open_durations = list(completed_durations)
    if current_open_duration > 0:
        all_open_durations.append(current_open_duration)

    longest_opening_seconds = round(max(all_open_durations), 1) if all_open_durations else 0.0

    # Hourly activity chart: 24 slots (00:00 to 23:00)
    hourly_slots = {f"{h:02d}:00": {"hour": f"{h:02d}:00", "openings": 0, "duration_seconds": 0.0} for h in range(24)}

    for ev in today_events:
        hour_key = f"{ev.event_timestamp.hour:02d}:00"
        if ev.state == "OPEN":
            hourly_slots[hour_key]["openings"] += 1
        elif ev.state == "CLOSED" and ev.duration_seconds:
            hourly_slots[hour_key]["duration_seconds"] = round(
                hourly_slots[hour_key]["duration_seconds"] + ev.duration_seconds, 1
            )

    activity_chart = [hourly_slots[f"{h:02d}:00"] for h in range(24)]

    return {
        "date": start_of_today.strftime("%Y-%m-%d"),
        "openings_today": openings_today,
        "total_open_duration_seconds": total_duration_today,
        "longest_opening_seconds": longest_opening_seconds,
        "current_open_duration_seconds": round(current_open_duration, 1),
        "activity_chart": activity_chart,
        "events_count_today": len(today_events),
    }

