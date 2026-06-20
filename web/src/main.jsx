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

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      d="M6 6l12 12M18 6L6 18"
      strokeWidth="2"
      strokeLinecap="round"
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
const EBPF_PROBES = [
  {
    value: "vfs_read",
    label: "文件读取",
    technicalName: "kprobe:vfs_read",
    description: "观察目标进程进入内核文件读取路径的次数和调用栈。",
  },
  {
    value: "vfs_write",
    label: "文件写入",
    technicalName: "kprobe:vfs_write",
    description: "观察目标进程进入内核文件写入路径的次数和调用栈。",
  },
  {
    value: "tcp_sendmsg",
    label: "网络发送",
    technicalName: "kprobe:tcp_sendmsg",
    description: "观察目标进程通过 TCP 发送数据时的内核调用栈。",
  },
];

function EbpfProbeSelector({ value, onChange, accent = "primary" }) {
  const toggle = (probe) => {
    if (value.includes(probe)) {
      if (value.length > 1) onChange(value.filter((item) => item !== probe));
    } else {
      onChange([...value, probe]);
    }
  };
  const checkedClass =
    accent === "accent"
      ? "border-accent/60 bg-accent/10"
      : "border-primary/60 bg-primary/10";
  return (
    <fieldset className="lg:col-span-3">
      <legend className="text-sm font-medium text-slate-300 mb-2">
        eBPF 内核探针（至少选择一个）
      </legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {EBPF_PROBES.map((probe) => {
          const checked = value.includes(probe.value);
          return (
            <label
              key={probe.value}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                checked
                  ? checkedClass
                  : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(probe.value)}
                  className="mt-1"
                />
                <div>
                  <strong className="block text-sm text-white">
                    {probe.label}
                  </strong>
                  <span className="block text-xs font-mono text-slate-400 mt-1">
                    {probe.technicalName}
                  </span>
                  <span className="block text-xs text-slate-500 mt-1">
                    {probe.description}
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

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
  const [ebpfProbes, setEbpfProbes] = useState(["vfs_read"]);
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
          ebpf_probes: ebpfProbes,
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
        {collector === "ebpf" && (
          <EbpfProbeSelector value={ebpfProbes} onChange={setEbpfProbes} />
        )}
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

function AgentSidebar({ open, agents, audits, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="关闭 Agent 面板"
        tabIndex={open ? 0 : -1}
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        aria-label="Agent 状态与审计日志"
        aria-hidden={!open}
        className={`fixed left-4 top-[9rem] bottom-4 z-40 flex w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900/95 shadow-2xl shadow-slate-950/70 backdrop-blur-xl transition-all duration-200 lg:top-24 ${
          open
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-[110%] opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="m-0 text-base font-semibold text-white">
              Agent 面板
            </h2>
            <p className="m-0 mt-1 text-xs text-slate-400">
              节点状态与最近审计事件
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭 Agent 面板"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ServerIcon />
              <h3 className="m-0 text-sm font-semibold text-white">
                Agent 状态
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {agents.length} 个节点
            </span>
          </div>
          <div className="space-y-3">
            {agents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
                等待 Agent 注册...
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-xl border border-slate-700/70 bg-slate-800/55 p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <strong className="text-sm font-medium text-white">
                      {agent.name}
                    </strong>
                    <StatusBadge value={agent.status} />
                  </div>
                  <p className="m-0 text-xs font-mono text-slate-400">
                    {agent.hostname}
                  </p>
                  <p className="m-0 mt-1 text-xs text-slate-500">
                    {formatTimestamp(agent.last_heartbeat_at)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mb-4 mt-7 flex items-center justify-between">
            <h3 className="m-0 text-sm font-semibold text-white">审计日志</h3>
            <span className="text-xs text-slate-500">
              最近 {Math.min(audits.length, 20)} 条
            </span>
          </div>
          <div className="space-y-3">
            {audits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
                暂无审计日志
              </div>
            ) : (
              audits.slice(0, 20).map((audit) => (
                <div
                  key={`${audit.agent_id}-${audit.created_at}-${audit.event}`}
                  className="rounded-xl border border-slate-700/60 bg-slate-800/35 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-mono text-slate-300">
                      {audit.agent_id}
                    </span>
                    <StatusBadge value={audit.event} />
                  </div>
                  <p className="m-0 mt-2 text-xs text-slate-400">
                    {audit.reason}
                  </p>
                  <p className="m-0 mt-1 text-xs text-slate-600">
                    {formatTimestamp(audit.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
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

function getResultCollector(result, fallback = "perf") {
  return (
    result?.metrics?.cpu?.collector ||
    result?.metrics?.collector ||
    result?.session?.collector ||
    fallback
  );
}

function collectLeafStacks(root) {
  const stacks = [];
  const walk = (node, path) => {
    const nextPath =
      node.name === "root" ? path : [...path, { name: node.name, value: node.value }];
    if (!node.children?.length && nextPath.length) {
      stacks.push({ frames: nextPath, samples: node.value });
      return;
    }
    (node.children || []).forEach((child) => walk(child, nextPath));
  };
  if (root) walk(root, []);
  return stacks.sort((left, right) => right.samples - left.samples);
}

function TopFunctions({ items, title, variant }) {
  const colorClass =
    variant === "python"
      ? "text-amber-300"
      : variant === "kernel"
        ? "text-cyan-300"
        : "text-orange-400";
  return (
    <>
      <h3 className="text-md font-semibold text-white mt-6 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {(items || []).map((item) => (
              <tr
                key={item.name}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150"
              >
                <td className={`py-3 px-4 text-sm font-mono ${colorClass}`}>
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
    </>
  );
}

function KernelTopFrames({ items, title, countUnit }) {
  return (
    <>
      <h3 className="text-md font-semibold text-white mt-6 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {(items || []).map((item) => (
              <tr
                key={item.name}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors duration-150"
              >
                <td className="py-3 px-4 text-sm font-mono text-cyan-300">
                  {item.name}
                </td>
                <td className="py-3 px-4 text-sm text-slate-400 text-right">
                  {item.samples} {countUnit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function KernelStackGroup({
  title,
  badge,
  description,
  result,
  tone,
  countUnit,
  sourceName,
}) {
  const stacks = collectLeafStacks(result?.flamegraph);
  const maxSamples = Math.max(1, ...stacks.map((stack) => stack.samples));
  const isProbe = tone === "probe";
  const colorClasses = isProbe
    ? {
        border: "border-cyan-500/30",
        badge:
          "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
        fill: "from-cyan-500/20 to-blue-500/5",
        frame:
          "text-cyan-100 border-cyan-800/70 bg-cyan-950/60",
        samples: "text-cyan-300",
      }
    : {
        border: "border-violet-500/30",
        badge:
          "text-violet-300 border-violet-500/40 bg-violet-500/10",
        fill: "from-violet-500/20 to-fuchsia-500/5",
        frame:
          "text-violet-100 border-violet-800/70 bg-violet-950/60",
        samples: "text-violet-300",
      };
  return (
    <section className={`rounded-xl border ${colorClasses.border} bg-slate-950/60 p-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <h4 className="text-sm font-semibold text-white m-0">{title}</h4>
        <span
          className={`text-xs font-mono border rounded-full px-3 py-1 ${colorClasses.badge}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-0 mb-4">{description}</p>
      <div className="space-y-3">
        {stacks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            该来源暂无采样数据
          </p>
        ) : stacks.map((stack, index) => (
          <div
            key={`${stack.frames.map((frame) => frame.name).join(";")}-${index}`}
            className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900/80 p-3"
          >
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorClasses.fill}`}
              style={{ width: `${(stack.samples / maxSamples) * 100}%` }}
            />
            <div className="relative flex flex-wrap items-center gap-2">
              {stack.frames
                .filter(
                  (frame) =>
                    !["ebpf", "kernel", sourceName].includes(frame.name),
                )
                .map((frame, frameIndex) => (
                  <React.Fragment key={`${frame.name}-${frameIndex}`}>
                    {frameIndex > 0 && (
                      <span className="text-slate-600" aria-hidden="true">
                        →
                      </span>
                    )}
                    <span
                      className={`font-mono text-xs border rounded px-2 py-1 ${colorClasses.frame}`}
                    >
                      {frame.name}
                    </span>
                  </React.Fragment>
                ))}
              <strong
                className={`ml-auto text-xs font-mono ${colorClasses.samples}`}
              >
                {stack.samples} {countUnit}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KernelProbeVisualization({ result }) {
  const sources = result.ebpf_sources;
  const normalizedSources = { ...(sources || {}) };
  if (normalizedSources.kprobe && !normalizedSources["kprobe:vfs_read"]) {
    normalizedSources["kprobe:vfs_read"] = normalizedSources.kprobe;
  }
  if (normalizedSources.profile && !normalizedSources["profile:hz"]) {
    normalizedSources["profile:hz"] = normalizedSources.profile;
  }
  const selectedProbes =
    result.metrics?.cpu?.ebpf_probes ||
    result.metrics?.ebpf_probes ||
    Object.keys(normalizedSources)
      .filter((name) => name.startsWith("kprobe:"))
      .map((name) => name.slice("kprobe:".length));
  const probeEntries = selectedProbes.map((probe) => {
    const source = `kprobe:${probe}`;
    return [source, normalizedSources[source]];
  });
  const profileEntry = [
    "profile:hz",
    normalizedSources["profile:hz"],
  ];
  const hasSeparatedSources = Boolean(sources);
  const probeDetails = Object.fromEntries(
    EBPF_PROBES.map((probe) => [probe.technicalName, probe]),
  );
  return (
    <>
      <h3 className="text-md font-semibold text-white mt-6 mb-3">
        eBPF 内核采集结果
      </h3>
      {hasSeparatedSources ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {probeEntries.map(([source, sourceResult]) => (
            <KernelStackGroup
              key={source}
              title={probeDetails[source]?.label || "内核探针事件"}
              badge={source}
              description={
                probeDetails[source]?.description ||
                `统计目标进程触发 ${source} 时捕获的内核调用栈。`
              }
              result={sourceResult}
              tone="probe"
              countUnit="events"
              sourceName={source}
            />
          ))}
          {profileEntry && (
            <KernelStackGroup
              title="周期内核采样"
              badge={profileEntry[0]}
              description="按配置频率采集目标进程当时所在的内核调用栈。"
              result={profileEntry[1]}
              tone="profile"
              countUnit="samples"
              sourceName={profileEntry[0]}
            />
          )}
        </div>
      ) : (
        <KernelStackGroup
          title="兼容模式内核栈"
          badge="legacy mixed sources"
          description="该结果由旧版采集器产生，无法区分 kprobe 与 profile 来源。"
          result={result}
          tone="probe"
          countUnit="counts"
          sourceName=""
        />
      )}
      {hasSeparatedSources && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4">
          {probeEntries.map(([source, sourceResult]) => (
            <div key={source}>
              <KernelTopFrames
                items={sourceResult.top_functions}
                title={`${probeDetails[source]?.label || source} Top Frames`}
                countUnit="events"
              />
            </div>
          ))}
          {profileEntry && (
            <div>
              <KernelTopFrames
                items={profileEntry[1].top_functions}
                title="周期采样 Top Frames"
                countUnit="samples"
              />
            </div>
          )}
        </div>
      )}
      {!hasSeparatedSources && (
        <TopFunctions
          items={result.top_functions}
          title="Top Kernel Frames"
          variant="kernel"
        />
      )}
    </>
  );
}

function PythonCallNode({ node, depth = 0, total = 1, path = "root" }) {
  if (["py-spy", "python"].includes(node.name)) {
    return (node.children || []).map((child, index) => (
      <PythonCallNode
        key={`${path}-${child.name}-${index}`}
        node={child}
        depth={depth}
        total={total}
        path={`${path}-${child.name}-${index}`}
      />
    ));
  }
  const percentage = Math.max(2, (node.value / total) * 100);
  return (
    <div className="relative" style={{ marginLeft: `${Math.min(depth, 8) * 20}px` }}>
      <div className="absolute bottom-0 left-[-12px] top-0 border-l border-amber-500/30" />
      <div className="relative overflow-hidden rounded-lg border border-amber-500/25 bg-slate-900/80 px-3 py-2">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/25 to-orange-500/5"
          style={{ width: `${percentage}%` }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-amber-100">{node.name}</span>
          <span className="shrink-0 font-mono text-xs text-amber-300">
            {node.value} samples
          </span>
        </div>
      </div>
      {(node.children || []).map((child, index) => (
        <div className="mt-2" key={`${path}-${child.name}-${index}`}>
          <PythonCallNode
            node={child}
            depth={depth + 1}
            total={total}
            path={`${path}-${child.name}-${index}`}
          />
        </div>
      ))}
    </div>
  );
}

function PythonStackVisualization({ result }) {
  const root = result.flamegraph;
  return (
    <>
      <div className="flex items-center justify-between mt-6 mb-3">
        <h3 className="text-md font-semibold text-white m-0">
          Python 调用树
        </h3>
        <span className="text-xs font-mono text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-full px-3 py-1">
          py-spy · interpreter frames
        </span>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-slate-950/60 p-4 space-y-2 overflow-x-auto">
        {(root?.children || []).map((child, index) => (
          <PythonCallNode
            key={`${child.name}-${index}`}
            node={child}
            total={root.value}
            path={`${child.name}-${index}`}
          />
        ))}
      </div>
      <TopFunctions
        items={result.top_functions}
        title="Top Python Functions"
        variant="python"
      />
    </>
  );
}

function CollectorVisualization({ result, fallbackCollector = "perf" }) {
  const collector = getResultCollector(result, fallbackCollector);
  if (collector === "py-spy") {
    return <PythonStackVisualization result={result} />;
  }
  if (collector === "ebpf") {
    return <KernelProbeVisualization result={result} />;
  }
  return (
    <>
      <h3 className="text-md font-semibold text-white mt-6 mb-3">
        CPU 火焰图
      </h3>
      <Flamegraph result={result} />
      <TopFunctions items={result.top_functions} title="Top 函数" variant="perf" />
    </>
  );
}

function ResultPanel({ task }) {
  if (!task) return null;
  if (!task.result) {
    const pendingTitle =
      task.collector === "py-spy"
        ? "Python 调用树"
        : task.collector === "ebpf"
          ? "eBPF 内核探针栈"
          : "CPU 火焰图";
    return (
      <section className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
            <ChartBarIcon />
          </div>
          <h2 className="text-lg font-semibold text-white m-0">分析结果</h2>
        </div>
        <h3 className="text-md font-semibold text-white mb-3">{pendingTitle}</h3>
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
      <h3 className="text-md font-semibold text-white mb-3">性能指标</h3>
      <Metrics metrics={metrics} />
      <CollectorVisualization
        result={task.result}
        fallbackCollector={task.collector}
      />
    </section>
  );
}

function ContinuousForm({ agents, onCreated }) {
  const [agentId, setAgentId] = useState("");
  const [pid, setPid] = useState(1);
  const [collector, setCollector] = useState("perf");
  const [ebpfProbes, setEbpfProbes] = useState(["vfs_read"]);
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
          ebpf_probes: ebpfProbes,
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
        {collector === "ebpf" && (
          <EbpfProbeSelector
            value={ebpfProbes}
            onChange={setEbpfProbes}
            accent="accent"
          />
        )}
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
  const [agentSidebarOpen, setAgentSidebarOpen] = useState(false);
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
      <AgentSidebar
        open={agentSidebarOpen}
        agents={agents}
        audits={audits}
        onClose={() => setAgentSidebarOpen(false)}
      />
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-start">
          <button
            type="button"
            aria-expanded={agentSidebarOpen}
            onClick={() => setAgentSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-800/70 px-4 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur-sm transition-all hover:border-primary/60 hover:bg-slate-700/80 hover:text-white cursor-pointer"
          >
            <ServerIcon />
            Agent 面板
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {agents.length}
            </span>
          </button>
        </div>
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
        <TaskTable tasks={tasks} onSelect={handleSelectTask} />
        <ResultPanel task={selectedTaskStillExists ? selectedTask : null} />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
