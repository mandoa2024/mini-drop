CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hostname TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ONLINE', 'OFFLINE')),
    last_heartbeat_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    event TEXT NOT NULL CHECK (event IN ('ONLINE', 'OFFLINE', 'RECOVERED')),
    reason TEXT NOT NULL CHECK (length(reason) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    pid INTEGER NOT NULL CHECK (pid > 0),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 300),
    sample_rate INTEGER NOT NULL CHECK (sample_rate BETWEEN 1 AND 999),
    collector TEXT NOT NULL DEFAULT 'perf' CHECK (collector IN ('perf', 'ebpf', 'py-spy')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'UPLOADING', 'DONE', 'FAILED')),
    status_reason TEXT NOT NULL CHECK (length(status_reason) > 0),
    raw_data TEXT,
    performance_data JSONB,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS performance_data JSONB;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_collector_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_collector_check CHECK (collector IN ('perf', 'ebpf', 'py-spy'));

CREATE TABLE IF NOT EXISTS task_events (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id),
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (length(reason) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_agent_status ON tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat ON agents(last_heartbeat_at);

CREATE TABLE IF NOT EXISTS profiling_sessions (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    pid INTEGER NOT NULL CHECK (pid > 0),
    collector TEXT NOT NULL CHECK (collector IN ('perf', 'ebpf', 'py-spy')),
    sample_rate INTEGER NOT NULL CHECK (sample_rate BETWEEN 1 AND 999),
    segment_seconds INTEGER NOT NULL CHECK (segment_seconds BETWEEN 1 AND 300),
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'STOPPED', 'FAILED')),
    status_reason TEXT NOT NULL CHECK (length(status_reason) > 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stopped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_segments (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES profiling_sessions(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id),
    pid INTEGER NOT NULL CHECK (pid > 0),
    collector TEXT NOT NULL CHECK (collector IN ('perf', 'ebpf', 'py-spy')),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    raw_data TEXT NOT NULL CHECK (length(raw_data) > 0),
    performance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_profile_sessions_agent_status ON profiling_sessions(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_profile_segments_session_time ON profile_segments(session_id, start_at, end_at);
