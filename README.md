# Mini-Drop

Mini-Drop 是一个最小可运行的 Linux 性能采集平台，包含 Web、Server、Agent、Analyzer 和 PostgreSQL。默认 Compose 配置执行真实 `perf` CPU 采样，并采集目标进程内存快照，不使用模拟数据。Analyzer 使用 Brendan Gregg 的 FlameGraph 生成 CPU 火焰图 SVG。

## Ubuntu 22.04 一键运行

目标机器需要：

- Ubuntu 22.04 x86_64
- 2 CPU、4 GB 内存、10 GB 可用磁盘
- Docker Engine 24+ 与 Docker Compose v2
- 能访问 Docker Hub 和 PyPI

安装好 Docker 后执行：

```bash
git clone https://github.com/mandoa2024/maxrise.git minidrop
cd minidrop
bash scripts/ubuntu-preflight.sh
docker compose up -d
```

Compose 会自动完成：

1. 启动 PostgreSQL、Server、Analyzer 和 Web。
2. 以 `pid: host`、`privileged` 模式启动 Agent。
3. 编译并启动保留 frame pointer 的 C CPU 热点程序。
4. 读取热点程序的宿主 PID，创建一次 5 秒、99 Hz 的真实 perf 任务。
5. 将 perf 调用栈转换为火焰树和 TopN 函数。

查看自动演示结果：

```bash
docker compose logs demo
docker compose ps
```

成功日志应包含：

```text
created real perf task ... for host PID ...
status=DONE reason=analysis completed
top functions: ... parse_payload ...
```

浏览器访问：

- Web：`http://<VM-IP>:3000`
- Server OpenAPI：`http://<VM-IP>:8080/docs`

如果虚拟机启用了 UFW，需要开放 Web 和 API 端口：

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
```

## 手工实操

获取热点程序的宿主 PID：

```bash
docker compose exec workload cat /runtime/workload.pid
```

进入 Web，选择 `demo-agent`，填写该 PID、时长和采样率后创建任务。任务应依次经过：

```text
PENDING -> RUNNING -> UPLOADING -> DONE
```

任务详情会展示状态迁移、CPU/内存指标、火焰图和 TopN 函数。

## perf 权限

Compose 中 Agent 使用：

```yaml
pid: host
privileged: true
```

这是为了确保干净虚拟机能直接完成考题演示。生产部署应缩小权限范围。若 perf 仍被宿主机策略拒绝，可执行：

```bash
sudo sysctl kernel.perf_event_paranoid=1
```

本项目使用软件事件 `cpu-clock`，不依赖虚拟机暴露硬件 PMU。

## eBPF 内核探针

创建 eBPF 任务或持续采样 Session 时，可以同时选择以下探针：

- `kprobe:vfs_read`：文件读取路径。
- `kprobe:vfs_write`：文件写入路径。
- `kprobe:tcp_sendmsg`：TCP 网络发送路径。

系统还会独立执行 `profile:hz` 周期内核栈采样。每个 kprobe 使用独立
bpftrace map，分析结果不会把事件次数与周期采样次数混合。具体内核函数能否
挂载取决于目标 Linux 内核版本、符号可见性和 tracing 权限。

## py-spy 演示

Compose 包含一个持续运行、调用层级稳定的 Python CPU workload。启动项目后读取
其宿主 PID：

```bash
docker compose exec python-workload cat /runtime/python-workload.pid
```

在 Web 中创建任务：

```text
采集器：py-spy / Python
目标 PID：上一步输出的 PID
采样时长：10 秒
采样率：99 Hz
```

结果页应显示独立的 Python 调用树，主要路径包括：

```text
handle_request
├── parse_payload
│   ├── decode_request
│   └── validate_payload
└── serialize_response
    └── render_template
```

如果任务失败，确认目标 PID 仍存在并检查 Agent 日志：

```bash
ps -fp "$(docker compose exec -T python-workload cat /runtime/python-workload.pid)"
docker compose logs agent
```

## 常用命令

```bash
# 查看状态和日志
docker compose ps
docker compose logs -f agent server analyzer demo

# 重新执行自动 perf 演示
docker compose rm -f demo
docker compose up demo

# 停止，保留数据库
docker compose down

# 完全清理并重新初始化
docker compose down -v
```

本地源码测试可直接执行：

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
```

## 智能归因

系统会在以下时机自动检查性能回归：

- 持续采样上传新 segment 后，使用此前 3–5 个 segment 作为 baseline。
- 一次性任务完成后，使用相同 Agent、PID 和采集器最近一次成功任务作为 baseline。

当函数 self CPU 或完整调用路径占比增加至少 12 个百分点，或 RSS/Peak RSS
达到 baseline 的 1.3 倍时，Server 会创建归因任务。确定性代码负责差分和
证据，LLM 只能调用预定义的只读工具，最终报告引用的每个 `evidence_id`
都会由 Server 校验。

如需启用 LLM，将示例配置复制为本地 `.env`，再填写 Key：

```bash
cp .env.example .env
```

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-key
DEEPSEEK_MODEL=deepseek-v4-pro
```

然后重新构建并启动 Server：

```bash
docker compose up -d --build server web
```

未填写 API Key 时功能仍然工作，但只生成确定性差分报告，不调用 LLM。可在
`.env` 中调整：

```env
LLM_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-v4-pro
ATTRIBUTION_CPU_DELTA_PP=12
ATTRIBUTION_MEMORY_RATIO=1.3
ATTRIBUTION_MIN_BASELINE_SEGMENTS=3
ATTRIBUTION_BASELINE_SEGMENTS=5
```

也可以将 `LLM_PROVIDER` 改为 `openai` 并配置 `OPENAI_API_KEY` 和
`OPENAI_MODEL=gpt-5.5`。API Key 只会传入 Server 容器，不会返回给浏览器、
Agent 或 Analyzer。

## 当前边界

- 当前原始折叠栈和分析结果直接存 PostgreSQL，下一阶段应迁移至 MinIO。
- Web 使用 3 秒轮询，下一阶段替换为 SSE。
- 已完成 perf、bpftrace/eBPF、py-spy 三类采集器的 MVP，以及按 segment 切片上传的 Continuous Profiling 基础链路。
- 当前 Agent 为保证考题复现使用高权限容器，不适合作为生产安全配置。
