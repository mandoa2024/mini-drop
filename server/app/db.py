import json
import os
from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .state import validate_transition

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://drop:drop@localhost:5432/drop")
pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=10, open=False)


def open_pool() -> None:
    pool.open(wait=True)
    with connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            ALTER TABLE tasks
                ADD COLUMN IF NOT EXISTS ebpf_probes JSONB
                NOT NULL DEFAULT '["vfs_read"]'::jsonb
            """
        )
        cur.execute(
            """
            ALTER TABLE profiling_sessions
                ADD COLUMN IF NOT EXISTS ebpf_probes JSONB
                NOT NULL DEFAULT '["vfs_read"]'::jsonb
            """
        )
        conn.commit()


def close_pool() -> None:
    pool.close()


@contextmanager
def connection():
    with pool.connection() as conn:
        conn.row_factory = dict_row
        yield conn


def transition_task(conn, task_id: str, target: str, reason: str, result=None) -> dict:
    with conn.cursor() as cur:
        task = cur.execute(
            "SELECT * FROM tasks WHERE id = %s FOR UPDATE", (task_id,)
        ).fetchone()
        if task is None:
            raise LookupError("task not found")
        validate_transition(task["status"], target, reason)
        cur.execute(
            """
            UPDATE tasks
               SET status = %s, status_reason = %s,
                   result = COALESCE(%s::jsonb, result), updated_at = NOW()
             WHERE id = %s
            """,
            (target, reason.strip(), json.dumps(result) if result is not None else None, task_id),
        )
        cur.execute(
            "INSERT INTO task_events(task_id, from_status, to_status, reason) VALUES (%s, %s, %s, %s)",
            (task_id, task["status"], target, reason.strip()),
        )
        return cur.execute("SELECT * FROM tasks WHERE id = %s", (task_id,)).fetchone()
