import pytest

from analyzer.parser import (
    collapsed_to_tree,
    parse_collapsed_line,
    compare_profile_summaries,
    profile_summary,
    split_ebpf_sources,
    top_functions,
)
from analyzer.main import analyze, AnalyzeRequest


SAMPLES = "main;api;parse 5\nmain;api;query 3\nmain;worker;flush 2"


def test_collapsed_to_tree_counts_samples():
    tree = collapsed_to_tree(SAMPLES)
    assert tree["value"] == 10
    assert tree["children"][0]["name"] == "main"
    assert tree["children"][0]["value"] == 10


def test_top_functions_uses_leaf_frames():
    assert top_functions(SAMPLES) == [
        {"name": "parse", "samples": 5},
        {"name": "query", "samples": 3},
        {"name": "flush", "samples": 2},
    ]


def test_invalid_collapsed_line():
    with pytest.raises(ValueError):
        parse_collapsed_line("missing-count")


def test_split_ebpf_sources():
    raw = (
        "ebpf;kprobe:vfs_read;kernel;vfs_read 3\n"
        "ebpf;kprobe:vfs_write;kernel;vfs_write 5\n"
        "ebpf;profile:hz;kernel;schedule 7\n"
    )

    assert split_ebpf_sources(raw) == {
        "kprobe:vfs_read": "ebpf;kprobe:vfs_read;kernel;vfs_read 3",
        "kprobe:vfs_write": "ebpf;kprobe:vfs_write;kernel;vfs_write 5",
        "profile:hz": "ebpf;profile:hz;kernel;schedule 7",
    }


def test_analyze_includes_uploaded_metrics(monkeypatch):
    monkeypatch.setattr("analyzer.main.generate_flamegraph_svg", lambda _raw: "<svg></svg>")

    result = analyze(AnalyzeRequest(
        task_id="task-1",
        collapsed_stacks=SAMPLES,
        performance_data={"memory": {"rss_kb": 1234}},
    ))

    assert result["metrics"]["memory"]["rss_kb"] == 1234
    assert result["flamegraph_svg"] == "<svg></svg>"


def test_analyze_falls_back_when_flamegraph_script_is_missing(monkeypatch):
    def missing_flamegraph(_raw):
        raise RuntimeError("flamegraph.pl not found at /opt/FlameGraph/flamegraph.pl")

    monkeypatch.setattr("analyzer.main.generate_flamegraph_svg", missing_flamegraph)

    result = analyze(AnalyzeRequest(task_id="task-1", collapsed_stacks=SAMPLES))

    assert result["flamegraph"]["value"] == 10
    assert result["flamegraph_svg"] is None


def test_analyze_returns_separate_ebpf_sources(monkeypatch):
    monkeypatch.setattr("analyzer.main.generate_flamegraph_svg", lambda _raw: "<svg></svg>")
    raw = (
        "ebpf;kprobe:vfs_read;kernel;vfs_read 3\n"
        "ebpf;kprobe:tcp_sendmsg;kernel;tcp_sendmsg 5\n"
        "ebpf;profile:hz;kernel;schedule 7\n"
    )

    result = analyze(
        AnalyzeRequest(
            task_id="task-ebpf",
            collapsed_stacks=raw,
            performance_data={"cpu": {"collector": "ebpf"}},
        )
    )

    assert result["ebpf_sources"]["kprobe:vfs_read"]["flamegraph"]["value"] == 3
    assert result["ebpf_sources"]["kprobe:tcp_sendmsg"]["flamegraph"]["value"] == 5
    assert result["ebpf_sources"]["profile:hz"]["flamegraph"]["value"] == 7
    assert result["ebpf_sources"]["kprobe:vfs_read"]["top_functions"] == [
        {"name": "vfs_read", "samples": 3}
    ]


def test_profile_summary_tracks_self_and_inclusive_samples():
    summary = profile_summary(SAMPLES)
    functions = {
        (item["source"], item["name"]): item
        for item in summary["functions"]
    }

    assert summary["total_samples"] == 10
    assert functions[("cpu", "api")]["self_samples"] == 0
    assert functions[("cpu", "api")]["total_samples"] == 8
    assert functions[("cpu", "parse")]["self_percent"] == 50
    assert summary["stacks"][0]["stack_id"]


def test_profile_summary_aggregates_duplicate_stacks():
    summary = profile_summary(
        "root;worker;leaf 3\nroot;worker;leaf 7\nroot;other 10"
    )
    stacks = {
        tuple(item["frames"]): item for item in summary["stacks"]
    }

    duplicate = stacks[("root", "worker", "leaf")]
    assert duplicate["samples"] == 10
    assert duplicate["percent"] == 50.0


def test_compare_profile_summaries_returns_verifiable_evidence():
    baseline = profile_summary(
        "main;handle_request;parse_payload 10\n"
        "main;handle_request;query_database 40"
    )
    target = profile_summary(
        "main;handle_request;parse_payload 50\n"
        "main;handle_request;query_database 40"
    )

    result = compare_profile_summaries(
        target,
        baseline,
        {"memory": {"rss_kb": 200}},
        {"memory": {"rss_kb": 100}},
    )

    parse_delta = next(
        item
        for item in result["function_deltas"]
        if item["function"] == "parse_payload"
    )
    assert parse_delta["baseline_self_percent"] == 20
    assert parse_delta["target_self_percent"] == pytest.approx(55.556)
    assert parse_delta["delta_pp"] == pytest.approx(35.556)
    assert parse_delta["evidence_id"].startswith("ev-function-")
    assert result["metric_deltas"][0]["ratio"] == 2
