import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

// SVG Icons (Heroicons)
const ActivityIcon = ({ strokeColor = "currentColor" }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={strokeColor}
    width="20"
    height="20"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const ServerIcon = ({ strokeColor = "currentColor" }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={strokeColor}
    width="20"
    height="20"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
    />
  </svg>
);

const ChartBarIcon = ({ strokeColor = "currentColor" }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={strokeColor}
    width="20"
    height="20"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const ClockIcon = ({ strokeColor = "currentColor" }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={strokeColor}
    width="20"
    height="20"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const PlayIcon = ({ strokeColor = "currentColor" }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={strokeColor}
    width="20"
    height="20"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const StopIcon = ({ strokeColor = "currentColor" }) => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke={strokeColor}
    width="20"
    height="20"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
    />
  </svg>
);

const API_BASE =
  window.location.port === "3000"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "";
const COLLECTORS = [
  { value: "perf", label: "perf / cpu-clock" },
  { value: "ebpf", label: "eBPF / bpftrace" },
  { value: "py-spy", label: "py-spy / Python" },
];

async function api(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
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
    hour12: false,
  }).format(date);
}

function formatKb(value) {
  if (value === null || value === undefined) return "N/A";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024) return `${(value / 1024).toFixed(2)} MB`;
  return `${value} KB`;
}

function toDateTimeInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function dateTimeInputToIso(value) {
  return new Date(value).toISOString();
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
  const styles = {
    ONLINE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    DONE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    OFFLINE: "bg-red-500/20 text-red-400 border-red-500/50",
    FAILED: "bg-red-500/20 text-red-400 border-red-500/50",
    RUNNING: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    UPLOADING: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    RECOVERED: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[value] || "bg-slate-500/20 text-slate-400 border-slate-500/50"}`}
    >
      {value}
    </span>
  );
}

function ModeTabs({ activeMode, onChange }) {
  return (
    <div
      className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm p-1 rounded-lg border border-slate-700"
      role="tablist"
      aria-label="采样模式"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "task"}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          activeMode === "task"
            ? "bg-primary text-white shadow-lg shadow-primary/50"
            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
        }`}
        onClick={() => onChange("task")}
      >
        <ActivityIcon
          strokeColor={activeMode === "task" ? "white" : "currentColor"}
        />
        创建 CPU 采样任务
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeMode === "continuous"}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          activeMode === "continuous"
            ? "bg-primary text-white shadow-lg shadow-primary/50"
            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
        }`}
        onClick={() => onChange("continuous")}
      >
        <ClockIcon
          strokeColor={activeMode === "continuous" ? "white" : "currentColor"}
        />
        Continuous Profiling
      </button>
    </div>
  );
}

function TaskForm({ agents, onCreated }) {
  const [agentId, setAgentId] = useState("");
  const [pid, setPid] = useState(1);
  const [duration, setDuration] = useState(5);
  const [sampleRate, setSampleRate] = useState(99);
  const [collector, setCollector] = useState("perf");
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
          collector,
        }),
      });
      setMessage("任务已创建");
      await onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/20 rounded-lg border border-primary/50">
          <ActivityIcon />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white m-0">
            创建 CPU 采样任务
          </h2>
          <p className="text-sm text-slate-400 m-0">对目标进程进行性能分析</p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Agent</span>
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id} className="bg-slate-800">
                {agent.name} ({agent.status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">采集器</span>
          <select
            value={collector}
            onChange={(event) => setCollector(event.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          >
            {COLLECTORS.map((item) => (
              <option
                key={item.value}
                value={item.value}
                className="bg-slate-800"
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">目标 PID</span>
          <input
            type="number"
            min="1"
            value={pid}
            onChange={(event) => setPid(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            采样时长（秒）
          </span>
          <input
            type="number"
            min="1"
            max="300"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            采样率（Hz）
          </span>
          <input
            type="number"
            min="1"
            max="999"
            value={sampleRate}
            onChange={(event) => setSampleRate(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium hover:shadow-lg hover:shadow-primary/50 transition-all duration-200 cursor-pointer"
          >
            <PlayIcon />
            开始采样
          </button>
        </div>
      </form>
      {message && (
        <p
          className={`text-sm ${message.includes("已创建") ? "text-emerald-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function AgentCards({ agents }) {
  return (
    <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/50">
          <ServerIcon />
        </div>
        <h2 className="text-lg font-semibold text-white m-0">Agent 状态</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-400">
            等待 Agent 注册...
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <strong className="text-white font-medium">{agent.name}</strong>
                <StatusBadge value={agent.status} />
              </div>
              <div className="space-y-1 text-sm text-slate-400">
                <p className="font-mono text-xs">{agent.hostname}</p>
                <p className="text-xs">
                  {formatTimestamp(agent.last_heartbeat_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AuditTable({ audits }) {
  return (
    <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl overflow-x-auto">
      <h2 className="text-lg font-semibold text-white mb-4">Agent 审计日志</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                Agent
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                事件
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                原因
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                时间
              </th>
            </tr>
          </thead>
          <tbody>
            {audits.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-slate-400">
                  暂无审计日志
                </td>
              </tr>
            ) : (
              audits.map((audit) => (
                <tr
                  key={`${audit.agent_id}-${audit.created_at}-${audit.event}`}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150"
                >
                  <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                    {audit.agent_id}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <StatusBadge value={audit.event} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {audit.reason}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {formatTimestamp(audit.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TaskTable({ tasks, onSelect }) {
  return (
    <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl overflow-x-auto">
      <h2 className="text-lg font-semibold text-white mb-4">任务列表</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                PID
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                采集器
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                状态
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                原因
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                时间
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-slate-400">
                  暂无任务
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  data-id={task.id}
                  onClick={() => onSelect(task.id)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150 cursor-pointer"
                >
                  <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                    {task.id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {task.pid}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {task.collector}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <StatusBadge value={task.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {task.status_reason}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {formatTimestamp(task.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metrics({ metrics = {} }) {
  const cpu = metrics.cpu || {};
  const memory = metrics.memory || {};
  const items = [
    { label: "CPU Collector", value: cpu.collector || "N/A", icon: "⚡" },
    { label: "CPU Event", value: cpu.event || "N/A", icon: "📊" },
    {
      label: "Duration",
      value: cpu.duration_seconds ? `${cpu.duration_seconds}s` : "N/A",
      icon: "⏱️",
    },
    {
      label: "Sample Rate",
      value: cpu.sample_rate_hz ? `${cpu.sample_rate_hz} Hz` : "N/A",
      icon: "📈",
    },
    {
      label: "Stack Lines",
      value: cpu.collapsed_stack_lines ?? "N/A",
      icon: "📝",
    },
    { label: "Memory RSS", value: formatKb(memory.rss_kb), icon: "💾" },
    { label: "Memory VMS", value: formatKb(memory.vms_kb), icon: "💿" },
    { label: "Peak RSS", value: formatKb(memory.peak_rss_kb), icon: "🔺" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, icon }) => (
        <div
          key={label}
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-primary/30 transition-all duration-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{icon}</span>
            <span className="text-xs text-slate-400">{label}</span>
          </div>
          <strong className="text-lg text-white font-semibold font-mono">
            {value}
          </strong>
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
  return levels
    .filter((level) => level.length)
    .reverse()
    .map((level, index) => (
      <div className="flame-row" key={index}>
        {level.map((node) => (
          <div
            className="flame-block"
            key={`${node.name}-${node.value}`}
            style={{
              width: `${Math.max(3, (node.value / root.value) * 100)}%`,
            }}
            title={`${node.name}: ${node.value}`}
          >
            {node.name} ({node.value})
          </div>
        ))}
      </div>
    ));
}

function Flamegraph({ result }) {
  if (result.flamegraph_svg) {
    return (
      <div className="w-full min-h-[760px] border border-slate-700 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden shadow-inner">
        <iframe
          title="CPU FlameGraph"
          sandbox="allow-scripts"
          srcDoc={renderResponsiveSvgDocument(result.flamegraph_svg)}
          className="block w-full h-[760px] border-0 bg-white"
        />
      </div>
    );
  }
  return (
    <div className="w-full min-h-[760px] border border-slate-700 rounded-lg bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 overflow-hidden">
      <FallbackFlamegraph root={result.flamegraph} />
    </div>
  );
}

function ResultPanel({ task }) {
  if (!task) return null;
  const timeline = (task.events || [])
    .map((event) => `${event.to_status}: ${event.reason}`)
    .join(" → ");
  if (!task.result) {
    return (
      <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
            <ChartBarIcon />
          </div>
          <h2 className="text-lg font-semibold text-white m-0">分析结果</h2>
        </div>
        <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
          <p className="text-sm text-slate-400 font-mono">{timeline}</p>
        </div>
        <h3 className="text-md font-semibold text-white mb-3">CPU 火焰图</h3>
        <div className="w-full min-h-[400px] border border-slate-700 rounded-lg bg-slate-800/50 flex items-center justify-center">
          <p className="text-slate-400">任务尚未完成，正在处理中...</p>
        </div>
      </section>
    );
  }
  const metrics = task.result.metrics || task.performance_data || {};
  return (
    <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
          <ChartBarIcon />
        </div>
        <h2 className="text-lg font-semibold text-white m-0">分析结果</h2>
      </div>
      <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
        <p className="text-sm text-slate-400 font-mono">{timeline}</p>
      </div>
      <h3 className="text-md font-semibold text-white mb-3">性能指标</h3>
      <Metrics metrics={metrics} />
      <h3 className="text-md font-semibold text-white mt-6 mb-3">CPU 火焰图</h3>
      <Flamegraph result={task.result} />
      <h3 className="text-md font-semibold text-white mt-6 mb-3">Top 函数</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {(task.result.top_functions || []).map((item) => (
              <tr
                key={item.name}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150"
              >
                <td className="py-3 px-4 text-sm text-orange-400 font-mono">
                  {item.name}
                </td>
                <td className="py-3 px-4 text-sm text-slate-400 text-right">
                  {item.samples} samples
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ContinuousForm({ agents, onCreated }) {
  const [agentId, setAgentId] = useState("");
  const [pid, setPid] = useState(1);
  const [collector, setCollector] = useState("perf");
  const [sampleRate, setSampleRate] = useState(49);
  const [segmentSeconds, setSegmentSeconds] = useState(30);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!agentId && agents.length > 0) setAgentId(agents[0].id);
  }, [agentId, agents]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await api("/api/v1/profile-sessions", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          pid: Number(pid),
          collector,
          sample_rate: Number(sampleRate),
          segment_seconds: Number(segmentSeconds),
        }),
      });
      setMessage("持续采样已启动");
      await onCreated();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-accent/20 rounded-lg border border-accent/50">
          <ClockIcon />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white m-0">
            Continuous Profiling
          </h2>
          <p className="text-sm text-slate-400 m-0">持续性能监控和分析</p>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Agent</span>
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id} className="bg-slate-800">
                {agent.name} ({agent.status})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">采集器</span>
          <select
            value={collector}
            onChange={(event) => setCollector(event.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          >
            {COLLECTORS.map((item) => (
              <option
                key={item.value}
                value={item.value}
                className="bg-slate-800"
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">目标 PID</span>
          <input
            type="number"
            min="1"
            value={pid}
            onChange={(event) => setPid(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            低频采样率（Hz）
          </span>
          <input
            type="number"
            min="1"
            max="999"
            value={sampleRate}
            onChange={(event) => setSampleRate(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            切片时长（秒）
          </span>
          <input
            type="number"
            min="1"
            max="300"
            value={segmentSeconds}
            onChange={(event) => setSegmentSeconds(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-orange-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-accent/50 transition-all duration-200 cursor-pointer"
          >
            <PlayIcon />
            启动
          </button>
        </div>
      </form>
      {message && (
        <p
          className={`text-sm ${message.includes("已启动") ? "text-emerald-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function SessionTable({ sessions, onSelect, onStop }) {
  return (
    <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl overflow-x-auto">
      <h2 className="text-lg font-semibold text-white mb-4">
        持续采样 Sessions
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                PID
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                采集器
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                状态
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                Segments
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                最近切片
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-slate-400">
                  暂无持续采样 session
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr
                  key={session.id}
                  data-id={session.id}
                  onClick={() => onSelect(session)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150 cursor-pointer"
                >
                  <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                    {session.id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {session.pid}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {session.collector}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <StatusBadge value={session.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {session.segment_count ?? 0}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {formatTimestamp(session.last_segment_at)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {session.status === "RUNNING" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onStop(session.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/50 rounded-md hover:bg-red-500/30 transition-all duration-200 cursor-pointer"
                      >
                        <StopIcon />
                        停止
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfileWindowMetrics({ result }) {
  const metrics = result.metrics || {};
  const windowData = result.window || metrics.window || {};
  const session = result.session || {};
  const items = [
    {
      label: "Collector",
      value: metrics.collector || session.collector || "N/A",
      icon: "⚡",
    },
    { label: "PID", value: metrics.pid || session.pid || "N/A", icon: "🔢" },
    {
      label: "Window From",
      value: formatTimestamp(windowData.from),
      icon: "⏰",
    },
    { label: "Window To", value: formatTimestamp(windowData.to), icon: "⏱️" },
    { label: "Segments", value: windowData.segments ?? "N/A", icon: "📊" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map(({ label, value, icon }) => (
        <div
          key={label}
          className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-primary/30 transition-all duration-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{icon}</span>
            <span className="text-xs text-slate-400">{label}</span>
          </div>
          <strong className="text-lg text-white font-semibold font-mono">
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function CollectorVisualization({ result }) {
  const collector =
    result.metrics?.collector || result.session?.collector || "perf";
  const title =
    collector === "py-spy"
      ? "Python 用户态栈"
      : collector === "ebpf"
        ? "eBPF Kernel Stack"
        : "CPU 火焰图";
  const topTitle =
    collector === "py-spy"
      ? "Top Python Functions"
      : collector === "ebpf"
        ? "Top Kernel Frames"
        : "Top 函数";

  return (
    <>
      <h3 className="text-md font-semibold text-white mt-6 mb-3">{title}</h3>
      <Flamegraph result={result} />
      <h3 className="text-md font-semibold text-white mt-6 mb-3">{topTitle}</h3>
      <div className="overflow-x-auto">
        <table
          className={`w-full ${collector === "py-spy" ? "language-profile" : collector === "ebpf" ? "kernel-profile" : ""}`}
        >
          <tbody>
            {(result.top_functions || []).map((item) => (
              <tr
                key={item.name}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150"
              >
                <td className="py-3 px-4 text-sm font-mono">{item.name}</td>
                <td className="py-3 px-4 text-sm text-slate-400 text-right">
                  {item.samples} samples
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProfileWindowPanel({ session, result, onQuery, message }) {
  const now = new Date();
  const [fromValue, setFromValue] = useState(
    toDateTimeInputValue(new Date(now.getTime() - 5 * 60 * 1000)),
  );
  const [toValue, setToValue] = useState(toDateTimeInputValue(now));

  useEffect(() => {
    const nextNow = new Date();
    setFromValue(
      toDateTimeInputValue(new Date(nextNow.getTime() - 5 * 60 * 1000)),
    );
    setToValue(toDateTimeInputValue(nextNow));
  }, [session?.id]);

  if (!session) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    await onQuery(
      session.id,
      dateTimeInputToIso(fromValue),
      dateTimeInputToIso(toValue),
    );
  }

  async function handleLastFiveMinutes() {
    const nextNow = new Date();
    const nextFrom = new Date(nextNow.getTime() - 5 * 60 * 1000);
    setFromValue(toDateTimeInputValue(nextFrom));
    setToValue(toDateTimeInputValue(nextNow));
    await onQuery(session.id, nextFrom.toISOString(), nextNow.toISOString());
  }

  return (
    <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/50">
          <ClockIcon />
        </div>
        <h2 className="text-lg font-semibold text-white m-0">时间窗口回溯</h2>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">From</span>
          <input
            type="datetime-local"
            value={fromValue}
            onChange={(event) => setFromValue(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">To</span>
          <input
            type="datetime-local"
            value={toValue}
            onChange={(event) => setToValue(event.target.value)}
            required
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-200 cursor-pointer"
          >
            查询窗口
          </button>
          <button
            type="button"
            onClick={handleLastFiveMinutes}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200 cursor-pointer"
          >
            最近 5 分钟
          </button>
        </div>
      </form>
      {message && (
        <p
          className={`text-sm mb-4 ${message.includes("成功") ? "text-emerald-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
      {result && (
        <>
          <h3 className="text-md font-semibold text-white mb-3">窗口指标</h3>
          <ProfileWindowMetrics result={result} />
          <CollectorVisualization result={result} />
        </>
      )}
    </section>
  );
}

function App() {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [pinnedTaskId, setPinnedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [profileWindowResult, setProfileWindowResult] = useState(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [activeMode, setActiveMode] = useState("task");
  const [error, setError] = useState("");

  const loadTask = useCallback(async (taskId) => {
    const task = await api(`/api/v1/tasks/${taskId}`);
    setSelectedTask(task);
  }, []);

  const load = useCallback(async () => {
    try {
      const [nextAgents, nextTasks, nextAudits, nextSessions] =
        await Promise.all([
          api("/api/v1/agents"),
          api("/api/v1/tasks"),
          api("/api/v1/agents/audit-logs"),
          api("/api/v1/profile-sessions"),
        ]);
      setAgents(nextAgents);
      setTasks(nextTasks);
      setAudits(nextAudits);
      setSessions(nextSessions);
      setError("");

      const pinnedTask = pinnedTaskId
        ? nextTasks.find((task) => task.id === pinnedTaskId)
        : null;
      const doneTask =
        pinnedTask?.status === "DONE"
          ? pinnedTask
          : nextTasks.find((task) => task.status === "DONE");
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

  const handleSelectTask = useCallback(
    async (taskId) => {
      setPinnedTaskId(taskId);
      await loadTask(taskId);
    },
    [loadTask],
  );

  const handleStopSession = useCallback(
    async (sessionId) => {
      await api(`/api/v1/profile-sessions/${sessionId}/stop`, {
        method: "POST",
      });
      await load();
    },
    [load],
  );

  const handleSelectSession = useCallback((session) => {
    setSelectedSession(session);
    setProfileWindowResult(null);
    setProfileMessage("");
  }, []);

  const queryProfileWindow = useCallback(async (sessionId, fromIso, toIso) => {
    try {
      const params = new URLSearchParams({ from: fromIso, to: toIso });
      const result = await api(
        `/api/v1/profile-sessions/${sessionId}/flamegraph?${params.toString()}`,
      );
      setProfileWindowResult(result);
      setProfileMessage("");
    } catch (profileError) {
      setProfileWindowResult(null);
      setProfileMessage(profileError.message);
    }
  }, []);

  const selectedTaskStillExists = useMemo(
    () => selectedTask && tasks.some((task) => task.id === selectedTask.id),
    [selectedTask, tasks],
  );

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
                <ActivityIcon />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white m-0">Mini-Drop</h1>
                <p className="text-sm text-slate-400 m-0">性能采集与分析平台</p>
              </div>
            </div>
            <ModeTabs activeMode={activeMode} onChange={setActiveMode} />
          </div>
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
          {activeMode === "task" ? (
            <TaskForm agents={agents} onCreated={load} />
          ) : (
            <ContinuousForm agents={agents} onCreated={load} />
          )}
        </section>
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <AgentCards agents={agents} />
        <SessionTable
          sessions={sessions}
          onSelect={handleSelectSession}
          onStop={handleStopSession}
        />
        <ProfileWindowPanel
          session={selectedSession}
          result={profileWindowResult}
          onQuery={queryProfileWindow}
          message={profileMessage}
        />
        <AuditTable audits={audits} />
        <TaskTable tasks={tasks} onSelect={handleSelectTask} />
        <ResultPanel task={selectedTaskStillExists ? selectedTask : null} />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
