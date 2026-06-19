import asyncio
import json
import logging
import os
import platform

import httpx

from .collector import collect_performance

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("minidrop.agent")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8080")
AGENT_ID = os.getenv("AGENT_ID", "demo-agent")
AGENT_NAME = os.getenv("AGENT_NAME", AGENT_ID)
HEARTBEAT_SECONDS = int(os.getenv("HEARTBEAT_SECONDS", "5"))
POLL_SECONDS = int(os.getenv("AGENT_POLL_SECONDS", "2"))
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"


async def heartbeat_loop(client: httpx.AsyncClient) -> None:
    payload = {"agent_id": AGENT_ID, "name": AGENT_NAME, "hostname": platform.node()}
    while True:
        try:
            response = await client.post(f"{SERVER_URL}/api/v1/agents/heartbeat", json=payload)
            response.raise_for_status()
        except Exception as exc:
            log.error(json.dumps({"event": "heartbeat_failed", "error": str(exc)}))
        await asyncio.sleep(HEARTBEAT_SECONDS)


async def execute_task(client: httpx.AsyncClient, task: dict) -> None:
    task_id = task["id"]
    try:
        collected = await asyncio.to_thread(
            collect_performance,
            task["pid"],
            task["duration_seconds"],
            task["sample_rate"],
            DEMO_MODE,
            task.get("collector", "perf"),
        )
        response = await client.post(
            f"{SERVER_URL}/api/v1/agent/tasks/{task_id}/upload",
            json={
                "raw_data": collected["raw_data"],
                "performance_data": collected["performance_data"],
                "reason": "collector finished; uploading samples and metrics",
            },
            timeout=60,
        )
        response.raise_for_status()
        log.info(json.dumps({"event": "task_completed", "task_id": task_id}))
    except Exception as exc:
        log.exception(json.dumps({"event": "task_failed", "task_id": task_id, "error": str(exc)}))
        try:
            await client.post(
                f"{SERVER_URL}/api/v1/agent/tasks/{task_id}/status",
                json={"status": "FAILED", "reason": f"collector failed: {type(exc).__name__}: {exc}"},
            )
        except Exception:
            log.exception(json.dumps({"event": "failure_report_failed", "task_id": task_id}))


async def task_loop(client: httpx.AsyncClient) -> None:
    while True:
        try:
            response = await client.post(f"{SERVER_URL}/api/v1/agent/{AGENT_ID}/tasks/next")
            if response.status_code == 200:
                await execute_task(client, response.json())
            elif response.status_code != 204:
                response.raise_for_status()
        except Exception as exc:
            log.error(json.dumps({"event": "task_poll_failed", "error": str(exc)}))
        await asyncio.sleep(POLL_SECONDS)


async def execute_profile_session(client: httpx.AsyncClient, session: dict) -> None:
    session_id = session["id"]
    try:
        collected = await asyncio.to_thread(
            collect_performance,
            session["pid"],
            session["segment_seconds"],
            session["sample_rate"],
            DEMO_MODE,
            session["collector"],
        )
        segment = collected["performance_data"]["segment"]
        response = await client.post(
            f"{SERVER_URL}/api/v1/agent/profile-sessions/{session_id}/segments",
            json={
                "start_at": segment["start_at"],
                "end_at": segment["end_at"],
                "raw_data": collected["raw_data"],
                "performance_data": collected["performance_data"],
                "reason": f"{session['collector']} segment collected",
            },
            timeout=60,
        )
        response.raise_for_status()
        log.info(json.dumps({"event": "profile_segment_uploaded", "session_id": session_id}))
    except Exception as exc:
        log.exception(json.dumps({"event": "profile_segment_failed", "session_id": session_id, "error": str(exc)}))


async def profile_session_loop(client: httpx.AsyncClient) -> None:
    while True:
        try:
            response = await client.get(f"{SERVER_URL}/api/v1/agent/{AGENT_ID}/profile-sessions")
            response.raise_for_status()
            for session in response.json():
                await execute_profile_session(client, session)
        except Exception as exc:
            log.error(json.dumps({"event": "profile_session_poll_failed", "error": str(exc)}))
        await asyncio.sleep(POLL_SECONDS)


async def main() -> None:
    async with httpx.AsyncClient(timeout=15) as client:
        await asyncio.gather(heartbeat_loop(client), task_loop(client), profile_session_loop(client))


if __name__ == "__main__":
    asyncio.run(main())
