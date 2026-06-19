import asyncio
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from .db import close_pool, connection, open_pool, transition_task
from .models import (
    Heartbeat,
    ProfileSegmentUpload,
    ProfileSessionCreate,
    TaskCreate,
    TaskStatusUpdate,
    TaskUpload,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("minidrop.server")
ANALYZER_URL = os.getenv("ANALYZER_URL", "http://localhost:8090")


def serialize(row):
    if row is None:
        return None
    return {
        key: value.isoformat() if isinstance(value, datetime) else value
        for key, value in row.items()
    }


async def offline_monitor() -> None:
    while True:
        try:
            with connection() as conn, conn.cursor() as cur:
                offline = cur.execute(
                    """
                    UPDATE agents SET status = 'OFFLINE', updated_at = NOW()
                     WHERE status = 'ONLINE'
                       AND last_heartbeat_at < NOW() - INTERVAL '30 seconds'
                    RETURNING id
                    """
                ).fetchall()
                for row in offline:
                    cur.execute(
                        "INSERT INTO agent_audit_logs(agent_id, event, reason) VALUES (%s, 'OFFLINE', %s)",
                        (row["id"], "no heartbeat for more than 30 seconds"),
                    )
                conn.commit()
        except Exception:
            log.exception('{"event":"offline_monitor_failed"}')
        await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    open_pool()
    monitor = asyncio.create_task(offline_monitor())
    yield
    monitor.cancel()
    close_pool()


app = FastAPI(title="Mini-Drop Server", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/api/v1/agents/heartbeat")
def heartbeat(body: Heartbeat):
    with connection() as conn, conn.cursor() as cur:
        existing = cur.execute("SELECT status FROM agents WHERE id = %s", (body.agent_id,)).fetchone()
        event = "ONLINE" if existing is None else "RECOVERED" if existing["status"] == "OFFLINE" else None
        cur.execute(
            """
            INSERT INTO agents(id, name, hostname, status, last_heartbeat_at)
            VALUES (%s, %s, %s, 'ONLINE', NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, hostname = EXCLUDED.hostname,
                status = 'ONLINE', last_heartbeat_at = NOW(), updated_at = NOW()
            """,
            (body.agent_id, body.name, body.hostname),
        )
        if event:
            reason = "agent registered" if event == "ONLINE" else "heartbeat resumed"
            cur.execute(
                "INSERT INTO agent_audit_logs(agent_id, event, reason) VALUES (%s, %s, %s)",
                (body.agent_id, event, reason),
            )
        conn.commit()
    return {"status": "ONLINE"}


@app.get("/api/v1/agents")
def list_agents():
    with connection() as conn, conn.cursor() as cur:
        rows = cur.execute("SELECT * FROM agents ORDER BY created_at").fetchall()
    return [serialize(row) for row in rows]


@app.get("/api/v1/agents/audit-logs")
def list_agent_audits():
    with connection() as conn, conn.cursor() as cur:
        rows = cur.execute("SELECT * FROM agent_audit_logs ORDER BY created_at DESC LIMIT 100").fetchall()
    return [serialize(row) for row in rows]


@app.post("/api/v1/tasks", status_code=201)
def create_task(body: TaskCreate):
    task_id = str(uuid.uuid4())
    reason = "task accepted by server"
    with connection() as conn, conn.cursor() as cur:
        agent = cur.execute("SELECT id FROM agents WHERE id = %s", (body.agent_id,)).fetchone()
        if agent is None:
            raise HTTPException(404, "agent not found")
        cur.execute(
            """
            INSERT INTO tasks(id, agent_id, pid, duration_seconds, sample_rate, collector, status, status_reason)
            VALUES (%s, %s, %s, %s, %s, %s, 'PENDING', %s)
            """,
            (task_id, body.agent_id, body.pid, body.duration_seconds, body.sample_rate, body.collector, reason),
        )
        cur.execute(
            "INSERT INTO task_events(task_id, from_status, to_status, reason) VALUES (%s, NULL, 'PENDING', %s)",
            (task_id, reason),
        )
        conn.commit()
        task = cur.execute("SELECT * FROM tasks WHERE id = %s", (task_id,)).fetchone()
    return serialize(task)


@app.get("/api/v1/tasks")
def list_tasks():
    with connection() as conn, conn.cursor() as cur:
        rows = cur.execute("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100").fetchall()
    return [serialize(row) for row in rows]


@app.post("/api/v1/profile-sessions", status_code=201)
def create_profile_session(body: ProfileSessionCreate):
    session_id = str(uuid.uuid4())
    reason = "continuous profiling started"
    with connection() as conn, conn.cursor() as cur:
        agent = cur.execute("SELECT id FROM agents WHERE id = %s", (body.agent_id,)).fetchone()
        if agent is None:
            raise HTTPException(404, "agent not found")
        cur.execute(
            """
            INSERT INTO profiling_sessions(
                id, agent_id, pid, collector, sample_rate,
                segment_seconds, status, status_reason
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'RUNNING', %s)
            """,
            (
                session_id,
                body.agent_id,
                body.pid,
                body.collector,
                body.sample_rate,
                body.segment_seconds,
                reason,
            ),
        )
        conn.commit()
        session = cur.execute("SELECT * FROM profiling_sessions WHERE id = %s", (session_id,)).fetchone()
    return serialize(session)


@app.get("/api/v1/profile-sessions")
def list_profile_sessions():
    with connection() as conn, conn.cursor() as cur:
        rows = cur.execute(
            """
            SELECT s.*,
                   COUNT(ps.id) AS segment_count,
                   MAX(ps.end_at) AS last_segment_at
              FROM profiling_sessions s
              LEFT JOIN profile_segments ps ON ps.session_id = s.id
             GROUP BY s.id
             ORDER BY s.created_at DESC
             LIMIT 100
            """
        ).fetchall()
    return [serialize(row) for row in rows]


@app.post("/api/v1/profile-sessions/{session_id}/stop")
def stop_profile_session(session_id: str):
    with connection() as conn, conn.cursor() as cur:
        session = cur.execute(
            "SELECT * FROM profiling_sessions WHERE id = %s FOR UPDATE", (session_id,)
        ).fetchone()
        if session is None:
            raise HTTPException(404, "profile session not found")
        if session["status"] == "RUNNING":
            cur.execute(
                """
                UPDATE profiling_sessions
                   SET status = 'STOPPED',
                       status_reason = 'continuous profiling stopped',
                       stopped_at = NOW(),
                       updated_at = NOW()
                 WHERE id = %s
                """,
                (session_id,),
            )
            conn.commit()
        return serialize(cur.execute("SELECT * FROM profiling_sessions WHERE id = %s", (session_id,)).fetchone())


@app.get("/api/v1/profile-sessions/{session_id}/segments")
def list_profile_segments(session_id: str):
    with connection() as conn, conn.cursor() as cur:
        session = cur.execute("SELECT id FROM profiling_sessions WHERE id = %s", (session_id,)).fetchone()
        if session is None:
            raise HTTPException(404, "profile session not found")
        rows = cur.execute(
            """
            SELECT id, session_id, agent_id, pid, collector, start_at, end_at,
                   performance_data, created_at
              FROM profile_segments
             WHERE session_id = %s
             ORDER BY start_at
            """,
            (session_id,),
        ).fetchall()
    return [serialize(row) for row in rows]


@app.get("/api/v1/profile-sessions/{session_id}/flamegraph")
async def analyze_profile_window(
    session_id: str,
    from_at: datetime | None = Query(default=None, alias="from"),
    to_at: datetime | None = Query(default=None, alias="to"),
):
    if to_at is None:
        to_at = datetime.now(timezone.utc)
    if from_at is None:
        from_at = to_at - timedelta(minutes=5)
    if from_at >= to_at:
        raise HTTPException(422, "from must be earlier than to")

    with connection() as conn, conn.cursor() as cur:
        session = cur.execute("SELECT * FROM profiling_sessions WHERE id = %s", (session_id,)).fetchone()
        if session is None:
            raise HTTPException(404, "profile session not found")
        rows = cur.execute(
            """
            SELECT raw_data, performance_data, start_at, end_at
              FROM profile_segments
             WHERE session_id = %s
               AND end_at > %s
               AND start_at < %s
             ORDER BY start_at
            """,
            (session_id, from_at, to_at),
        ).fetchall()

    if not rows:
        raise HTTPException(404, "no profile segments in requested window")

    raw_data = "\n".join(row["raw_data"] for row in rows if row["raw_data"].strip())
    performance_data = {
        "collector": session["collector"],
        "pid": session["pid"],
        "window": {
            "from": from_at.isoformat(),
            "to": to_at.isoformat(),
            "segments": len(rows),
        },
        "segments": [serialize(row) for row in rows],
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            analysis = await client.post(
                f"{ANALYZER_URL}/analyze",
                json={
                    "task_id": session_id,
                    "collapsed_stacks": raw_data,
                    "performance_data": performance_data,
                },
            )
            analysis.raise_for_status()
        result = analysis.json()
        result["session"] = serialize(session)
        result["window"] = performance_data["window"]
        return result
    except Exception as exc:
        raise HTTPException(502, "analysis failed") from exc


@app.get("/api/v1/tasks/{task_id}")
def get_task(task_id: str):
    with connection() as conn, conn.cursor() as cur:
        task = cur.execute("SELECT * FROM tasks WHERE id = %s", (task_id,)).fetchone()
        if task is None:
            raise HTTPException(404, "task not found")
        events = cur.execute(
            "SELECT * FROM task_events WHERE task_id = %s ORDER BY created_at", (task_id,)
        ).fetchall()
    data = serialize(task)
    data["events"] = [serialize(event) for event in events]
    return data


@app.get("/api/v1/agent/{agent_id}/profile-sessions")
def list_agent_profile_sessions(agent_id: str):
    with connection() as conn, conn.cursor() as cur:
        rows = cur.execute(
            """
            SELECT * FROM profiling_sessions
             WHERE agent_id = %s AND status = 'RUNNING'
             ORDER BY created_at
            """,
            (agent_id,),
        ).fetchall()
    return [serialize(row) for row in rows]


@app.post("/api/v1/agent/{agent_id}/tasks/next")
def claim_task(agent_id: str, response: Response):
    with connection() as conn, conn.cursor() as cur:
        task = cur.execute(
            """
            SELECT * FROM tasks
             WHERE agent_id = %s AND status = 'PENDING'
             ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
            """,
            (agent_id,),
        ).fetchone()
        if task is None:
            response.status_code = 204
            return None
        task = transition_task(conn, str(task["id"]), "RUNNING", "agent claimed task")
        conn.commit()
    return serialize(task)


@app.post("/api/v1/agent/tasks/{task_id}/status")
def update_task_status(task_id: str, body: TaskStatusUpdate):
    try:
        with connection() as conn:
            task = transition_task(conn, task_id, body.status, body.reason)
            conn.commit()
        return serialize(task)
    except (ValueError, LookupError) as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/api/v1/agent/tasks/{task_id}/upload")
async def upload_task(task_id: str, body: TaskUpload):
    try:
        with connection() as conn, conn.cursor() as cur:
            task = cur.execute("SELECT status FROM tasks WHERE id = %s", (task_id,)).fetchone()
            if task is None:
                raise LookupError("task not found")
            if task["status"] == "RUNNING":
                transition_task(conn, task_id, "UPLOADING", body.reason)
            elif task["status"] != "UPLOADING":
                raise ValueError(f"cannot upload task in {task['status']}")
            cur.execute(
                "UPDATE tasks SET raw_data = %s, performance_data = %s::jsonb WHERE id = %s",
                (body.raw_data, json.dumps(body.performance_data), task_id),
            )
            conn.commit()

        async with httpx.AsyncClient(timeout=30) as client:
            analysis = await client.post(
                f"{ANALYZER_URL}/analyze",
                json={
                    "task_id": task_id,
                    "collapsed_stacks": body.raw_data,
                    "performance_data": body.performance_data,
                },
            )
            analysis.raise_for_status()
        with connection() as conn:
            task = transition_task(conn, task_id, "DONE", "analysis completed", analysis.json())
            conn.commit()
        return serialize(task)
    except (ValueError, LookupError) as exc:
        raise HTTPException(409, str(exc)) from exc
    except Exception as exc:
        log.exception('{"event":"analysis_failed","task_id":"%s"}', task_id)
        with connection() as conn:
            try:
                transition_task(conn, task_id, "FAILED", f"analysis failed: {type(exc).__name__}")
                conn.commit()
            except Exception:
                conn.rollback()
        raise HTTPException(502, "analysis failed") from exc


@app.post("/api/v1/agent/profile-sessions/{session_id}/segments", status_code=201)
def upload_profile_segment(session_id: str, body: ProfileSegmentUpload):
    if body.start_at >= body.end_at:
        raise HTTPException(422, "segment start_at must be earlier than end_at")
    segment_id = str(uuid.uuid4())
    try:
        with connection() as conn, conn.cursor() as cur:
            session = cur.execute(
                "SELECT * FROM profiling_sessions WHERE id = %s FOR UPDATE", (session_id,)
            ).fetchone()
            if session is None:
                raise LookupError("profile session not found")
            if session["status"] != "RUNNING":
                raise ValueError(f"cannot upload segment for {session['status']} session")
            cur.execute(
                """
                INSERT INTO profile_segments(
                    id, session_id, agent_id, pid, collector, start_at,
                    end_at, raw_data, performance_data
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    segment_id,
                    session_id,
                    session["agent_id"],
                    session["pid"],
                    session["collector"],
                    body.start_at,
                    body.end_at,
                    body.raw_data,
                    json.dumps(body.performance_data),
                ),
            )
            cur.execute(
                """
                UPDATE profiling_sessions
                   SET status_reason = %s, updated_at = NOW()
                 WHERE id = %s
                """,
                (body.reason.strip(), session_id),
            )
            conn.commit()
            segment = cur.execute(
                "SELECT * FROM profile_segments WHERE id = %s", (segment_id,)
            ).fetchone()
        return serialize(segment)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
