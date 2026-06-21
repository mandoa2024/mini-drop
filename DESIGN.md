# Mini-Drop 设计文档

## 1. 目标与边界

Mini-Drop 在单机 Linux 环境中完成性能任务下发、真实采集、分析、展示与持续
Profiling。实现 perf、bpftrace/eBPF、py-spy 三类采集器，并以智能归因作为
加分能力。

当前定位是可复现的工程原型，不是生产系统。原始采样数据暂存 PostgreSQL，
Agent 为保证演示成功使用 `pid: host` 和 `privileged`。

## 2. 架构

```text
Browser
   |
   v
Web / nginx ----> FastAPI Server ----> PostgreSQL
                       |  ^
                       v  |
                    Analyzer
                       ^
                       |
Agent ---- perf / bpftrace / py-spy
```

- Web：任务、Agent、Continuous Profiling 和归因报告展示。
- Server：唯一状态写入者，负责任务调度、心跳、审计和 baseline 选择。
- Agent：轮询任务，执行真实采集并上传原始数据。
- Analyzer：无状态解析折叠栈，生成火焰树、热点和差分证据。
- PostgreSQL：保存任务、状态事件、Session、Segment 和归因记录。

组件通过 HTTP/JSON 解耦。Analyzer 无状态，可独立扩容；采集器通过统一返回结构
接入 Agent。

## 3. 状态机与审计

```text
PENDING -> RUNNING -> UPLOADING -> DONE
    |          |           |
    +----------+-----------+-----> FAILED
```

Server 在事务中锁定任务、校验迁移、更新状态，并向 `task_events` 插入带 reason
的记录。初始 `PENDING` 同样落事件。非法迁移由应用层拒绝，数据库约束状态枚举。

Agent 每 5 秒发送心跳。Server 根据最后心跳时间判断在线状态；离线和恢复变化写入
审计日志，避免轮询期间重复记录同一事件。

## 4. 采集与分析

### perf

使用 `perf record -g` 采集 CPU 调用栈，再转换为 collapsed stacks。Compose
提供保留 frame pointer 的 C workload，保证干净 Linux 环境可复现。

### eBPF

使用 bpftrace 实现 `vfs_read`、`vfs_write`、`tcp_sendmsg` kprobe，并独立采集
`profile:hz` 内核栈。不同事件源分别计数，避免把函数调用次数与周期采样次数混合。

### py-spy

直接采集 Python 解释器栈，保留模块、函数与源码行语义。Web 使用独立 Python
调用树展示，不把它伪装成原生 perf 栈。

### Continuous Profiling

Agent 按固定时长生成 Segment。Server 保存时间窗口，Web 可拖动选择最近 5 分钟，
由 Analyzer 合并窗口内折叠栈并重新计算火焰树。

## 5. 智能归因

Server 选择历史任务或最近 3–5 个 Segment 作为 baseline。Analyzer 确定性计算
函数、调用路径和内存差分；LLM 不能直接访问 SQL、Shell、文件或网络，只能调用：

1. `get_profile_metadata`
2. `compare_profile_summary`
3. `inspect_stack_evidence`
4. `compare_metrics`

报告必须通过 Pydantic Schema，并由 Verifier 校验每个 `evidence_id`、证据类型和
subject。模型失败、输出非法或工具调用超预算时，系统生成确定性降级报告，不影响
采集主链路。

当前评测显示证据链和降级有效，但多 Segment 调用栈聚合、极小样本保护和结论等级
校准仍需修复，因此不宣称生产级归因准确率。详见
`docs/智能归因评测报告.md`。

## 6. 关键决策与取舍

- 统一使用 Python：降低两周内多组件交付成本，代价是 Agent 资源占用高于 Go。
- Agent 拉取任务：部署简单且易恢复，代价是有轮询延迟。
- PostgreSQL 保存原始栈：便于事务和复现，代价是数据库膨胀。
- Web 使用轮询：实现稳定，代价是实时性和请求数量不如 SSE。
- 高权限 Agent：提高演示成功率，但生产环境必须改为最小 capabilities、只读挂载
  和独立采集守护进程。
- 智能归因采用“确定性证据 + LLM 表达”：降低幻觉风险，但工具编排会增加延迟。

## 7. 工程质量与性能自证

- 自动化测试覆盖状态机、API、Analyzer、三类采集器边界和归因证据校验。
- 正常路径：任务领取、采集、上传、分析、完成。
- 异常路径：采集失败、非法状态迁移、无 baseline、非法证据、工具超预算。
- 本轮归因与 Analyzer 定向测试为 17/17 通过。
- 真实归因 5 次全部持久化；LLM 失败 2 次均安全降级。
- baseline 不足在 1ms 内拒绝；其余归因平均约 20 秒，主要耗时来自外部 LLM。

完整测试使用：

```bash
python3 -m pytest -q --cov=agent --cov=analyzer --cov=server
```

## 8. AI 协作说明

AI 用于辅助拆解需求、生成测试草案、审查边界条件、整理文档和归因评测。核心架构、
权限模型、数据库状态机、采集语义和最终代码均通过人工检查及真实环境验证。

对 AI 输出不直接采信：涉及性能数值时以数据库和 Analyzer 输出为准；涉及归因时
要求引用服务端生成的证据 ID；发现报告与阈值冲突时按缺陷记录，而非调整结论迎合
模型。

## 9. 如果再有 7 天

1. 修复多 Segment 相同调用栈聚合，并增加回归测试。
2. 为归因增加最小样本量、置信区间和服务端 impact 校准。
3. 用 MinIO 保存原始 profile，PostgreSQL 仅保存索引和摘要。
4. 用 SSE 替代 Web 轮询。
5. 收紧 Agent 权限，拆分 perf/eBPF helper。
6. 建立带已知故障注入的评测集，计算归因命中率、误报率和漏报率。
7. 增加 CI，在 Ubuntu 22.04 runner 上执行单测、Compose smoke test 和前端构建。
