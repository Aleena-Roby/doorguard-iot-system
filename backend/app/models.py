from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    DateTime,
    BigInteger,
    ForeignKey,
    Index,
    Float,
    text,
)
from sqlalchemy.sql import func
from app.extensions import db


class Device(db.Model):
    __tablename__ = "devices"

    id = Column(String(64), primary_key=True)
    name = Column(String(100), nullable=False, default="Main Entrance Door")
    current_state = Column(String(10), nullable=False, default="CLOSED")
    operating_mode = Column(String(20), nullable=False, default="ESP32")  # 'SIMULATION' or 'ESP32'
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    last_event_at = Column(DateTime(timezone=True), nullable=True)
    last_opened_at = Column(DateTime(timezone=True), nullable=True)  # Timestamp when current open period started
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    events = db.relationship("DoorEvent", backref="device", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "current_state": self.current_state,
            "operating_mode": self.operating_mode,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "last_event_at": self.last_event_at.isoformat() if self.last_event_at else None,
            "last_opened_at": self.last_opened_at.isoformat() if self.last_opened_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DoorEvent(db.Model):
    __tablename__ = "door_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    state = Column(String(10), nullable=False)  # 'OPEN' or 'CLOSED'
    event_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    server_received_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    source = Column(String(20), nullable=False, default="ESP32", index=True)  # 'SIMULATION' or 'ESP32'
    sequence_number = Column(BigInteger, nullable=True)
    idempotency_key = Column(String(128), unique=True, nullable=True)
    duration_seconds = Column(Float, nullable=True)  # Duration of the completed opening when state is CLOSED

    __table_args__ = (
        Index("idx_device_event_time", "device_id", text("event_timestamp DESC")),
        Index("idx_source_event_time", "source", text("event_timestamp DESC")),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "state": self.state,
            "source": self.source,
            "event_timestamp": self.event_timestamp.isoformat() if self.event_timestamp else None,
            "server_received_at": self.server_received_at.isoformat() if self.server_received_at else None,
            "sequence_number": self.sequence_number,
            "idempotency_key": self.idempotency_key,
            "duration_seconds": self.duration_seconds,
        }


class AppSetting(db.Model):
    __tablename__ = "app_settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

