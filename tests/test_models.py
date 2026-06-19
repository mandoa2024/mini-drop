from datetime import datetime, timezone

from server.app.models import ProfileSegmentUpload, ProfileSessionCreate, TaskCreate


def test_task_create_accepts_all_collectors():
    assert TaskCreate(agent_id="a", pid=1, collector="perf").collector == "perf"
    assert TaskCreate(agent_id="a", pid=1, collector="ebpf").collector == "ebpf"
    assert TaskCreate(agent_id="a", pid=1, collector="py-spy").collector == "py-spy"


def test_profile_session_defaults_to_low_frequency_perf():
    session = ProfileSessionCreate(agent_id="a", pid=1)

    assert session.collector == "perf"
    assert session.sample_rate == 49
    assert session.segment_seconds == 30


def test_profile_segment_upload_accepts_window_and_payload():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 1, 0, 0, 30, tzinfo=timezone.utc)
    upload = ProfileSegmentUpload(start_at=start, end_at=end, raw_data="main 1")

    assert upload.start_at == start
    assert upload.end_at == end
    assert upload.raw_data == "main 1"
