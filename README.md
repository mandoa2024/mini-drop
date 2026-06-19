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
git clone <your-repository-url> minidrop
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

## 当前边界

- 当前原始折叠栈和分析结果直接存 PostgreSQL，下一阶段应迁移至 MinIO。
- Web 使用 3 秒轮询，下一阶段替换为 SSE。
- 已完成 perf、bpftrace/eBPF、py-spy 三类采集器的 MVP，以及按 segment 切片上传的 Continuous Profiling 基础链路。
- 当前 Agent 为保证考题复现使用高权限容器，不适合作为生产安全配置。
