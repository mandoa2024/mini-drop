import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

const API_BASE = window.location.port === "3000"
  ? `${window.location.protocol}//${window.location.hostname}:8080`
  : "";

async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
}

function formatTimestamp(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function formatKb(value) {
  if (value === null || value === undefined) return "N/A";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024) return `${(value / 1024).toFixed(2)} MB`;
  return `${value} KB`;
}

function renderResponsiveSvgDocument(svg) {
  const responsiveSvg = svg.replace(/<svg\b([^>]*)>/, (match, attrs) => {
    const width = attrs.match(/\bwidth="([\d.]+)"/);
    const height = attrs.match(/\bheight="([\d.]+)"/);
    let nextAttrs = attrs
      .replace(/\swidth="[^"]*"/, ' width="100%"')
      .replace(/\sheight="[^"]*"/, ' height="auto"');
    if (!/\bviewBox=/.test(nextAttrs) && width && height) {
      nextAttrs += ` viewBox="0 0 ${width[1]} ${height[1]}"`;
    }
    if (!/\bpreserveAspectRatio=/.test(nextAttrs)) {
      nextAttrs += ' preserveAspectRatio="xMinYMin meet"';
    }
    return `<svg${nextAttrs}>`;
  });
  return `<!doctype html><html><head><style>html,body{margin:0;overflow:hidden;background:white}svg{display:block;width:100%;height:auto}</style></head><body>${responsiveSvg}</body></html>`;
}

function StatusBadge({ value }) {
  return <span className={`status ${value || ""}`}>{value}</span>;
}

function TaskForm({ agents, onCreated }) {
  const [agentId, setAgentId] = useState("");
  const [pid, setPid] = useState(1);
  const [duration, setDuration] = useState(5);
  const [sampleRate, setSampleRate] = useState(99);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!agentId && agents.length > 0) setAgentId(agents[0].id);
  }, [agentId, agents]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await api("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          pid: Number(pid),
          duration_seconds: Number(duration),
          sample_rate: Number(sampleRate),
          collector: "perf"
        })
      });
      setMessage("任务已创建");
      await onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel">
      <h2>创建 CPU 采样任务</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Agent
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)} required>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name} ({agent.status})</option>
            ))}
          </select>
        </label>
        <label>
          目标 PID
          <input type="number" min="1" value={pid} onChange={(event) => setPid(event.target.value)} required />
        </label>
        <label>
          采样时长（秒）
          <input type="number" min="1" max="300" value={duration} onChange={(event) => setDuration(event.target.value)} required />
        </label>
        <label>
          采样率（Hz）
          <input type="number" min="1" max="999" value={sampleRate} onChange={(event) => setSampleRate(event.target.value)} required />
        </label>
        <button type="submit">开始采样</button>
      </form>
      <p id="message">{message}</p>
    </section>
  );
}

function AgentCards({ agents }) {
  return (
    <section className="panel">
      <h2>Agent</h2>
      <div className="cards">
        {agents.length === 0 ? "等待 Agent 注册" : agents.map((agent) => (
          <div className="card" key={agent.id}>
            <strong>{agent.name}</strong>
            <p><StatusBadge value={agent.status} /></p>
            <small>{agent.hostname}<br />{formatTimestamp(agent.last_heartbeat_at)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditTable({ audits }) {
  return (
    <section className="panel">
      <h2>Agent 审计日志</h2>
      <table>
        <thead><tr><th>Agent</th><th>事件</th><th>原因</th><th>时间</th></tr></thead>
        <tbody>
          {audits.length === 0 ? (
            <tr><td colSpan="4">暂无审计日志</td></tr>
          ) : audits.map((audit) => (
            <tr key={`${audit.agent_id}-${audit.created_at}-${audit.event}`}>
              <td>{audit.agent_id}</td>
              <td><StatusBadge value={audit.event} /></td>
              <td>{audit.reason}</td>
              <td>{formatTimestamp(audit.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TaskTable({ tasks, onSelect }) {
  return (
    <section className="panel">
      <h2>任务</h2>
      <table>
        <thead><tr><th>ID</th><th>PID</th><th>状态</th><th>原因</th><th>时间</th></tr></thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr><td colSpan="5">暂无任务</td></tr>
          ) : tasks.map((task) => (
            <tr key={task.id} data-id={task.id} onClick={() => onSelect(task.id)}>
              <td>{task.id.slice(0, 8)}</td>
              <td>{task.pid}</td>
              <td><StatusBadge value={task.status} /></td>
              <td>{task.status_reason}</td>
              <td>{formatTimestamp(task.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Metrics({ metrics = {} }) {
  const cpu = metrics.cpu || {};
  const memory = metrics.memory || {};
  const items = [
    ["CPU Collector", cpu.collector || "N/A"],
    ["CPU Event", cpu.event || "N/A"],
    ["Duration", cpu.duration_seconds ? `${cpu.duration_seconds}s` : "N/A"],
    ["Sample Rate", cpu.sample_rate_hz ? `${cpu.sample_rate_hz} Hz` : "N/A"],
    ["Stack Lines", cpu.collapsed_stack_lines ?? "N/A"],
    ["Memory RSS", formatKb(memory.rss_kb)],
    ["Memory VMS", formatKb(memory.vms_kb)],
    ["Peak RSS", formatKb(memory.peak_rss_kb)]
  ];
  return (
    <div className="metric-grid">
      {items.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function FallbackFlamegraph({ root }) {
  const levels = [];
  const walk = (node, depth) => {
    levels[depth] ||= [];
    if (depth > 0) levels[depth].push(node);
    (node.children || []).forEach((child) => walk(child, depth + 1));
  };
  if (root) walk(root, 0);
  return levels.filter((level) => level.length).reverse().map((level, index) => (
    <div className="flame-row" key={index}>
      {level.map((node) => (
        <div
          className="flame-block"
          key={`${node.name}-${node.value}`}
          style={{ width: `${Math.max(3, node.value / root.value * 100)}%` }}
          title={`${node.name}: ${node.value}`}
        >
          {node.name} ({node.value})
        </div>
      ))}
    </div>
  ));
}

function Flamegraph({ task }) {
  const result = task.result || {};
  if (result.flamegraph_svg) {
    return (
      <div id="flamegraph">
        <iframe title="CPU FlameGraph" sandbox="allow-scripts" srcDoc={renderResponsiveSvgDocument(result.flamegraph_svg)} />
      </div>
    );
  }
  return (
    <div id="flamegraph">
      <FallbackFlamegraph root={result.flamegraph} />
    </div>
  );
}

function ResultPanel({ task }) {
  if (!task) return null;
  const timeline = (task.events || []).map((event) => `${event.to_status}: ${event.reason}`).join(" -> ");
  if (!task.result) {
    return (
      <section className="panel">
        <h2>分析结果</h2>
        <div id="timeline">{timeline}</div>
        <h3>CPU 火焰图</h3>
        <div id="flamegraph">任务尚未完成</div>
      </section>
    );
  }
  const metrics = task.result.metrics || task.performance_data || {};
  return (
    <section className="panel">
      <h2>分析结果</h2>
      <div id="timeline">{timeline}</div>
      <h3>性能指标</h3>
      <Metrics metrics={metrics} />
      <h3>CPU 火焰图</h3>
      <Flamegraph task={task} />
      <h3>Top 函数</h3>
      <table>
        <tbody>
          {(task.result.top_functions || []).map((item) => (
            <tr key={item.name}><td>{item.name}</td><td>{item.samples} samples</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function App() {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [pinnedTaskId, setPinnedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState("");

  const loadTask = useCallback(async (taskId) => {
    const task = await api(`/api/v1/tasks/${taskId}`);
    setSelectedTask(task);
  }, []);

  const load = useCallback(async () => {
    try {
      const [nextAgents, nextTasks, nextAudits] = await Promise.all([
        api("/api/v1/agents"),
        api("/api/v1/tasks"),
        api("/api/v1/agents/audit-logs")
      ]);
      setAgents(nextAgents);
      setTasks(nextTasks);
      setAudits(nextAudits);
      setError("");

      const pinnedTask = pinnedTaskId ? nextTasks.find((task) => task.id === pinnedTaskId) : null;
      const doneTask = pinnedTask?.status === "DONE" ? pinnedTask : nextTasks.find((task) => task.status === "DONE");
      if (doneTask) await loadTask(doneTask.id);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [loadTask, pinnedTaskId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const handleSelectTask = useCallback(async (taskId) => {
    setPinnedTaskId(taskId);
    await loadTask(taskId);
  }, [loadTask]);

  const selectedTaskStillExists = useMemo(
    () => selectedTask && tasks.some((task) => task.id === selectedTask.id),
    [selectedTask, tasks]
  );

  return (
    <>
      <header>
        <div><strong>Mini-Drop</strong><span>性能采集与分析</span></div>
        <button type="button" onClick={load}>刷新</button>
      </header>
      <main>
        <TaskForm agents={agents} onCreated={load} />
        {error && <p id="message">{error}</p>}
        <AgentCards agents={agents} />
        <AuditTable audits={audits} />
        <TaskTable tasks={tasks} onSelect={handleSelectTask} />
        <ResultPanel task={selectedTaskStillExists ? selectedTask : null} />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
