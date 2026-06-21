import asyncio

from agent import main as agent_main


class FakeResponse:
    def __init__(self, *, status_code=200, payload=None, error=None):
        self.status_code = status_code
        self._payload = payload
        self._error = error
        self.raise_calls = 0

    def raise_for_status(self):
        self.raise_calls += 1
        if self._error:
            raise self._error

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, responses=None):
        self.responses = list(responses or [])
        self.posts = []

    async def post(self, url, **kwargs):
        self.posts.append({"url": url, **kwargs})
        if self.responses:
            return self.responses.pop(0)
        return FakeResponse()


def collected_profile():
    return {
        "raw_data": "main;handle_request;parse_payload 10",
        "performance_data": {
            "cpu": {"collector": "perf"},
            "segment": {
                "start_at": "2026-01-01T00:00:00+00:00",
                "end_at": "2026-01-01T00:00:30+00:00",
            },
        },
    }


def test_execute_task_uploads_collected_profile(monkeypatch):
    response = FakeResponse()
    client = FakeClient([response])
    monkeypatch.setattr(
        agent_main, "collect_performance", lambda *args: collected_profile()
    )

    asyncio.run(
        agent_main.execute_task(
            client,
            {
                "id": "task-1",
                "pid": 123,
                "duration_seconds": 5,
                "sample_rate": 99,
                "collector": "perf",
                "ebpf_probes": ["vfs_read"],
            },
        )
    )

    assert response.raise_calls == 1
    assert len(client.posts) == 1
    upload = client.posts[0]
    assert upload["url"].endswith("/api/v1/agent/tasks/task-1/upload")
    assert upload["json"]["raw_data"].endswith("parse_payload 10")
    assert upload["json"]["performance_data"]["cpu"]["collector"] == "perf"
    assert upload["timeout"] == 60


def test_execute_task_reports_failed_collection(monkeypatch):
    client = FakeClient()

    def fail_collection(*_args):
        raise RuntimeError("perf unavailable")

    monkeypatch.setattr(agent_main, "collect_performance", fail_collection)

    asyncio.run(
        agent_main.execute_task(
            client,
            {
                "id": "task-failed",
                "pid": 123,
                "duration_seconds": 5,
                "sample_rate": 99,
                "collector": "perf",
            },
        )
    )

    assert len(client.posts) == 1
    failure = client.posts[0]
    assert failure["url"].endswith(
        "/api/v1/agent/tasks/task-failed/status"
    )
    assert failure["json"]["status"] == "FAILED"
    assert "RuntimeError: perf unavailable" in failure["json"]["reason"]


def test_execute_profile_session_uploads_segment(monkeypatch):
    response = FakeResponse()
    client = FakeClient([response])
    monkeypatch.setattr(
        agent_main, "collect_performance", lambda *args: collected_profile()
    )

    asyncio.run(
        agent_main.execute_profile_session(
            client,
            {
                "id": "session-1",
                "pid": 321,
                "segment_seconds": 30,
                "sample_rate": 49,
                "collector": "perf",
                "ebpf_probes": ["vfs_read"],
            },
        )
    )

    assert response.raise_calls == 1
    assert len(client.posts) == 1
    upload = client.posts[0]
    assert upload["url"].endswith(
        "/api/v1/agent/profile-sessions/session-1/segments"
    )
    assert upload["json"]["start_at"] == "2026-01-01T00:00:00+00:00"
    assert upload["json"]["end_at"] == "2026-01-01T00:00:30+00:00"
    assert upload["json"]["reason"] == "perf segment collected"


def test_execute_profile_session_contains_collection_failure(monkeypatch):
    client = FakeClient()

    def fail_collection(*_args):
        raise RuntimeError("target process exited")

    monkeypatch.setattr(agent_main, "collect_performance", fail_collection)

    asyncio.run(
        agent_main.execute_profile_session(
            client,
            {
                "id": "session-failed",
                "pid": 321,
                "segment_seconds": 30,
                "sample_rate": 49,
                "collector": "perf",
            },
        )
    )

    assert client.posts == []
