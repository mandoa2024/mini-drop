import os
import subprocess
import tempfile
from datetime import datetime, timezone


def build_perf_command(pid: int, duration: int, sample_rate: int, output: str) -> list[str]:
    if pid <= 0 or duration <= 0 or sample_rate <= 0:
        raise ValueError("pid, duration and sample_rate must be positive")
    return [
        "perf", "record", "-e", "cpu-clock", "-F", str(sample_rate),
        "--call-graph", "fp", "-p", str(pid),
        "-o", output, "--", "sleep", str(duration),
    ]


def demo_collapsed_stacks(pid: int, collector: str = "perf") -> str:
    return "\n".join(
        [
            f"{collector};process_{pid};main;handle_request;parse_payload 42",
            f"{collector};process_{pid};main;handle_request;query_database 31",
            f"{collector};process_{pid};main;handle_request;serialize_response 18",
            f"{collector};process_{pid};main;background_worker;flush_metrics 9",
        ]
    )


def demo_memory_metrics(pid: int) -> dict:
    return {
        "pid": pid,
        "source": "demo",
        "rss_kb": 24576,
        "vms_kb": 131072,
        "peak_rss_kb": 32768,
    }


def read_proc_memory_metrics(pid: int) -> dict:
    if pid <= 0:
        raise ValueError("pid must be positive")
    status_path = f"/proc/{pid}/status"
    values = {}
    try:
        with open(status_path, encoding="utf-8") as status:
            for line in status:
                name, separator, value = line.partition(":")
                if not separator:
                    continue
                if name in {"VmRSS", "VmSize", "VmHWM"}:
                    parts = value.strip().split()
                    if parts:
                        values[name] = int(parts[0])
    except FileNotFoundError as exc:
        raise RuntimeError(f"process {pid} not found") from exc
    except PermissionError as exc:
        raise RuntimeError(f"cannot read memory metrics for process {pid}") from exc

    return {
        "pid": pid,
        "source": status_path,
        "rss_kb": values.get("VmRSS"),
        "vms_kb": values.get("VmSize"),
        "peak_rss_kb": values.get("VmHWM"),
    }


def collect_perf(pid: int, duration: int, sample_rate: int, demo_mode: bool) -> str:
    if demo_mode:
        return demo_collapsed_stacks(pid, "perf")
    with tempfile.TemporaryDirectory(prefix="minidrop-") as tmpdir:
        perf_data = os.path.join(tmpdir, "perf.data")
        record = subprocess.run(
            build_perf_command(pid, duration, sample_rate, perf_data),
            check=False,
            capture_output=True,
            text=True,
            timeout=duration + 15,
        )
        if record.returncode != 0:
            raise RuntimeError(record.stderr.strip() or "perf record failed")
        script = subprocess.run(
            ["perf", "script", "-i", perf_data, "--no-inline"],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if script.returncode != 0:
            raise RuntimeError(script.stderr.strip() or "perf script failed")
        return collapse_perf_script(script.stdout)


def build_bpftrace_command(pid: int, duration: int, sample_rate: int) -> list[str]:
    if pid <= 0 or duration <= 0 or sample_rate <= 0:
        raise ValueError("pid, duration and sample_rate must be positive")
    program = (
        f"kprobe:vfs_read /pid == {pid}/ {{ @[kstack] = count(); }} "
        f"profile:hz:{sample_rate} /pid == {pid}/ {{ @[kstack] = count(); }} "
        f"interval:s:{duration} {{ print(@); clear(@); exit(); }}"
    )
    return ["bpftrace", "-e", program]


def collect_bpftrace(pid: int, duration: int, sample_rate: int, demo_mode: bool) -> str:
    if demo_mode:
        return "\n".join(
            [
                f"ebpf;kernel;vmlinux;finish_task_switch 23",
                f"ebpf;kernel;vmlinux;schedule 17",
                f"ebpf;kernel;vfs_read 11",
            ]
        )
    result = subprocess.run(
        build_bpftrace_command(pid, duration, sample_rate),
        check=False,
        capture_output=True,
        text=True,
        timeout=duration + 20,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "bpftrace failed")
    return collapse_bpftrace_output(result.stdout)


def collapse_bpftrace_output(raw: str) -> str:
    stacks = []
    frames = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("@["):
            frames = []
            continue
        if stripped.startswith("]:"):
            count = int(stripped.split(":", 1)[1].strip())
            if frames and count > 0:
                stacks.append(";".join(["ebpf", "kernel", *reversed(frames)]) + f" {count}")
            frames = []
            continue
        if stripped.startswith("@:"):
            continue
        frame = stripped.split("+", 1)[0].split(" ", 1)[0].strip()
        if frame and frame not in {"[unknown]", "0"}:
            frames.append(frame)
    if not stacks:
        raise RuntimeError("bpftrace produced no stack samples")
    return "\n".join(stacks)


def build_py_spy_command(pid: int, duration: int, sample_rate: int, output: str) -> list[str]:
    if pid <= 0 or duration <= 0 or sample_rate <= 0:
        raise ValueError("pid, duration and sample_rate must be positive")
    return [
        "py-spy", "record",
        "-p", str(pid),
        "-d", str(duration),
        "-r", str(sample_rate),
        "-f", "raw",
        "-o", output,
    ]


def collect_py_spy(pid: int, duration: int, sample_rate: int, demo_mode: bool) -> str:
    if demo_mode:
        return "\n".join(
            [
                f"py-spy;python;asyncio.run;handle_request;parse_payload 34",
                f"py-spy;python;asyncio.run;handle_request;render_template 21",
                f"py-spy;python;threading.Thread;worker_loop 13",
            ]
        )
    with tempfile.TemporaryDirectory(prefix="minidrop-pyspy-") as tmpdir:
        raw_output = os.path.join(tmpdir, "py-spy.raw")
        result = subprocess.run(
            build_py_spy_command(pid, duration, sample_rate, raw_output),
            check=False,
            capture_output=True,
            text=True,
            timeout=duration + 20,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "py-spy failed")
        try:
            with open(raw_output, encoding="utf-8") as profile:
                collapsed = profile.read().strip()
        except FileNotFoundError as exc:
            raise RuntimeError("py-spy did not produce raw output") from exc
    if not collapsed:
        raise RuntimeError("py-spy produced no stack samples")
    return "\n".join(f"py-spy;{line}" for line in collapsed.splitlines() if line.strip())


def collapse_perf_script(raw: str) -> str:
    stacks = []
    frames = []
    for line in raw.splitlines() + [""]:
        stripped = line.strip()
        if not stripped:
            if frames:
                stacks.append(";".join(reversed(frames)) + " 1")
                frames = []
            continue
        if line[:1].isspace():
            parts = stripped.split()
            if len(parts) >= 2:
                frames.append(parts[1].split("+")[0])
    if not stacks:
        raise RuntimeError("perf produced no stack samples")
    return "\n".join(stacks)


def collect_stacks(pid: int, duration: int, sample_rate: int, demo_mode: bool, collector: str) -> str:
    if collector == "perf":
        return collect_perf(pid, duration, sample_rate, demo_mode)
    if collector == "ebpf":
        return collect_bpftrace(pid, duration, sample_rate, demo_mode)
    if collector == "py-spy":
        return collect_py_spy(pid, duration, sample_rate, demo_mode)
    raise ValueError(f"unsupported collector: {collector}")


def collect_performance(pid: int, duration: int, sample_rate: int, demo_mode: bool, collector: str = "perf") -> dict:
    start_at = datetime.now(timezone.utc)
    collapsed_stacks = collect_stacks(pid, duration, sample_rate, demo_mode, collector)
    end_at = datetime.now(timezone.utc)
    memory = demo_memory_metrics(pid) if demo_mode else read_proc_memory_metrics(pid)
    return {
        "raw_data": collapsed_stacks,
        "performance_data": {
            "cpu": {
                "collector": collector,
                "event": "cpu-clock" if collector == "perf" else "profile:hz" if collector == "ebpf" else "python-user-stack",
                "duration_seconds": duration,
                "sample_rate_hz": sample_rate,
                "collapsed_stack_lines": len(collapsed_stacks.splitlines()),
            },
            "memory": memory,
            "segment": {
                "start_at": start_at.isoformat(),
                "end_at": end_at.isoformat(),
            },
        },
    }
