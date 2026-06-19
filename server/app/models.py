from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


CollectorName = Literal["perf", "ebpf", "py-spy"]


class TaskCreate(BaseModel):
    agent_id: str = Field(min_length=1)
    pid: int = Field(gt=0)
    duration_seconds: int = Field(default=10, ge=1, le=300)
    sample_rate: int = Field(default=99, ge=1, le=999)
    collector: CollectorName = "perf"


class Heartbeat(BaseModel):
    agent_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    hostname: str = Field(min_length=1)


class TaskStatusUpdate(BaseModel):
    status: Literal["RUNNING", "UPLOADING", "FAILED"]
    reason: str = Field(min_length=1)


class TaskUpload(BaseModel):
    raw_data: str = Field(min_length=1)
    performance_data: dict[str, Any] = Field(default_factory=dict)
    reason: str = Field(default="agent uploaded profiling data", min_length=1)


class ProfileSessionCreate(BaseModel):
    agent_id: str = Field(min_length=1)
    pid: int = Field(gt=0)
    collector: CollectorName = "perf"
    sample_rate: int = Field(default=49, ge=1, le=999)
    segment_seconds: int = Field(default=30, ge=1, le=300)


class ProfileSegmentUpload(BaseModel):
    start_at: datetime
    end_at: datetime
    raw_data: str = Field(min_length=1)
    performance_data: dict[str, Any] = Field(default_factory=dict)
    reason: str = Field(default="profile segment collected", min_length=1)
