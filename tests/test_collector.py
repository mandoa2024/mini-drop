import os
from pathlib import Path

import pytest

from agent.collector import (
    build_bpftrace_command,
    build_perf_command,
    build_py_spy_command,
    collapse_bpftrace_output,
    collapse_perf_script,
    collect_performance,
    demo_collapsed_stacks,
    read_proc_memory_metrics,
)


def test_build_perf_command_has_no_shell_interpolation():
    command = build_perf_command(123, 5, 99, "/tmp/perf.data")
    assert command == [
        "perf", "record", "-e", "cpu-clock", "-F", "99",
        "--call-graph", "fp", "-p", "123",
        "-o", "/tmp/perf.data", "--", "sleep", "5",
    ]


def test_build_perf_command_validates_arguments():
    with pytest.raises(ValueError):
        build_perf_command(0, 5, 99, "/tmp/perf.data")


def test_build_bpftrace_command_uses_profile_probe_and_pid_filter():
    command = build_bpftrace_command(
        123, 10, 49, ["vfs_read", "vfs_write", "tcp_sendmsg"]
    )

    assert command[:2] == ["bpftrace", "-e"]
    assert "profile:hz:49" in command[2]
    assert "kprobe:vfs_read" in command[2]
    assert "kprobe:vfs_write" in command[2]
    assert "kprobe:tcp_sendmsg" in command[2]
    assert "/pid == 123/" in command[2]
    assert "kstack" in command[2]
    assert "@kprobe_vfs_read[kstack]" in command[2]
    assert "@kprobe_vfs_write[kstack]" in command[2]
    assert "@kprobe_tcp_sendmsg[kstack]" in command[2]
    assert "@profile_hz[kstack]" in command[2]


def test_build_py_spy_command_records_raw_profile():
    command = build_py_spy_command(123, 10, 49, "/tmp/py-spy.raw")

    assert command == [
        "py-spy", "record",
        "-p", "123",
        "-d", "10",
        "-r", "49",
        "-f", "raw",
        "-o", "/tmp/py-spy.raw",
    ]


def test_demo_data_is_valid_collapsed_format():
    result = demo_collapsed_stacks(42)
    assert "process_42;main" in result
    assert len(result.splitlines()) == 4


def test_collapse_perf_script():
    raw = "process 1 [000] 1.0: cycles:\n        abc foo+0x1\n        def main+0x2\n\n"
    assert collapse_perf_script(raw) == "main;foo 1"


def test_collapse_bpftrace_output():
    raw = (
        "@kprobe_vfs_read[\n"
        "    vfs_read+1\n"
        "    do_syscall_64+2\n"
        "]: 3\n"
        "@profile_hz[\n"
        "    finish_task_switch+1\n"
        "    schedule+2\n"
        "]: 7\n"
        "@kprobe_tcp_sendmsg[\n"
        "    tcp_sendmsg+1\n"
        "    sock_sendmsg+2\n"
        "]: 5\n"
    )

    assert collapse_bpftrace_output(raw) == (
        "ebpf;kprobe:vfs_read;kernel;do_syscall_64;vfs_read 3\n"
        "ebpf;profile:hz;kernel;schedule;finish_task_switch 7\n"
        "ebpf;kprobe:tcp_sendmsg;kernel;sock_sendmsg;tcp_sendmsg 5"
    )


def test_collect_performance_demo_supports_multiple_ebpf_probes():
    result = collect_performance(
        42,
        5,
        49,
        True,
        "ebpf",
        ["vfs_read", "vfs_write", "tcp_sendmsg"],
    )

    assert "ebpf;kprobe:vfs_read" in result["raw_data"]
    assert "ebpf;kprobe:vfs_write" in result["raw_data"]
    assert "ebpf;kprobe:tcp_sendmsg" in result["raw_data"]
    assert result["performance_data"]["cpu"]["ebpf_probes"] == [
        "vfs_read",
        "vfs_write",
        "tcp_sendmsg",
    ]


def test_collect_performance_in_demo_mode_includes_cpu_and_memory():
    result = collect_performance(42, 5, 99, True)

    assert "process_42;main" in result["raw_data"]
    assert result["performance_data"]["cpu"]["collector"] == "perf"
    assert result["performance_data"]["cpu"]["sample_rate_hz"] == 99
    assert result["performance_data"]["memory"]["rss_kb"] > 0


def test_collect_performance_in_demo_mode_supports_py_spy():
    result = collect_performance(42, 5, 49, True, "py-spy")

    assert "py-spy;python" in result["raw_data"]
    assert result["performance_data"]["cpu"]["collector"] == "py-spy"
    assert result["performance_data"]["cpu"]["event"] == "python-user-stack"


def test_read_proc_memory_metrics_for_current_process():
    if not Path("/proc/self/status").exists():
        pytest.skip("/proc is not available on this platform")

    metrics = read_proc_memory_metrics(os.getpid())
    assert metrics["source"].endswith("/status")
    assert metrics["rss_kb"] is None or metrics["rss_kb"] > 0
