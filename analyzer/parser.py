import hashlib


def parse_collapsed_line(line: str) -> tuple[list[str], int]:
    stack, separator, count_text = line.strip().rpartition(" ")
    if not separator or not stack:
        raise ValueError(f"invalid collapsed stack line: {line!r}")
    count = int(count_text)
    if count <= 0:
        raise ValueError("sample count must be positive")
    frames = [frame.strip() for frame in stack.split(";") if frame.strip()]
    if not frames:
        raise ValueError("stack must contain at least one frame")
    return frames, count


def collapsed_to_tree(raw: str) -> dict:
    root = {"name": "root", "value": 0, "children": []}
    for line in raw.splitlines():
        if not line.strip():
            continue
        frames, count = parse_collapsed_line(line)
        root["value"] += count
        node = root
        for frame in frames:
            child = next((item for item in node["children"] if item["name"] == frame), None)
            if child is None:
                child = {"name": frame, "value": 0, "children": []}
                node["children"].append(child)
            child["value"] += count
            node = child
    if root["value"] == 0:
        raise ValueError("no samples found")
    return root


def top_functions(raw: str, limit: int = 10) -> list[dict]:
    totals = {}
    for line in raw.splitlines():
        if not line.strip():
            continue
        frames, count = parse_collapsed_line(line)
        leaf = frames[-1]
        totals[leaf] = totals.get(leaf, 0) + count
    return [
        {"name": name, "samples": samples}
        for name, samples in sorted(totals.items(), key=lambda item: (-item[1], item[0]))[:limit]
    ]


def split_ebpf_sources(raw: str) -> dict[str, str]:
    sources: dict[str, list[str]] = {}
    for line in raw.splitlines():
        if not line.strip():
            continue
        frames, _count = parse_collapsed_line(line)
        if len(frames) < 2 or frames[0] != "ebpf":
            continue
        source = frames[1]
        if source.startswith("kprobe:"):
            group = source
        elif source.startswith("profile:"):
            group = source
        else:
            continue
        sources.setdefault(group, []).append(line)
    return {name: "\n".join(lines) for name, lines in sources.items()}


def stack_source(frames: list[str]) -> str:
    if len(frames) >= 2 and frames[0] == "ebpf":
        return frames[1]
    if frames and frames[0] == "py-spy":
        return "python"
    return "cpu"


def profile_summary(raw: str, top_k: int = 50) -> dict:
    stack_totals: dict[tuple[str, tuple[str, ...]], int] = {}
    function_totals: dict[tuple[str, str], dict[str, int]] = {}
    source_totals: dict[str, int] = {}
    total_samples = 0

    for line in raw.splitlines():
        if not line.strip():
            continue
        frames, count = parse_collapsed_line(line)
        source = stack_source(frames)
        total_samples += count
        source_totals[source] = source_totals.get(source, 0) + count
        stack_key = (source, tuple(frames))
        stack_totals[stack_key] = stack_totals.get(stack_key, 0) + count
        for frame in dict.fromkeys(frames):
            values = function_totals.setdefault(
                (source, frame), {"self_samples": 0, "total_samples": 0}
            )
            values["total_samples"] += count
        function_totals[(source, frames[-1])]["self_samples"] += count

    if total_samples <= 0:
        raise ValueError("no samples found")

    stacks = []
    for (source, frames), samples in stack_totals.items():
        stack_text = ";".join(frames)
        stacks.append(
            {
                "stack_id": hashlib.sha256(
                    stack_text.encode()
                ).hexdigest()[:16],
                "source": source,
                "frames": list(frames),
                "samples": samples,
            }
        )

    for stack in stacks:
        denominator = source_totals[stack["source"]]
        stack["percent"] = round(stack["samples"] / denominator * 100, 3)

    functions = []
    for (source, name), values in function_totals.items():
        denominator = source_totals[source]
        functions.append(
            {
                "source": source,
                "name": name,
                **values,
                "self_percent": round(
                    values["self_samples"] / denominator * 100, 3
                ),
                "total_percent": round(
                    values["total_samples"] / denominator * 100, 3
                ),
            }
        )

    return {
        "total_samples": total_samples,
        "source_totals": source_totals,
        "functions": sorted(
            functions,
            key=lambda item: (
                -item["self_samples"],
                -item["total_samples"],
                item["source"],
                item["name"],
            ),
        )[:top_k],
        "stacks": sorted(
            stacks,
            key=lambda item: (-item["samples"], item["stack_id"]),
        )[:top_k],
    }


def compare_profile_summaries(
    target: dict,
    baseline: dict,
    target_metrics: dict | None = None,
    baseline_metrics: dict | None = None,
    top_k: int = 20,
) -> dict:
    target_functions = {
        (item["source"], item["name"]): item
        for item in target.get("functions", [])
    }
    baseline_functions = {
        (item["source"], item["name"]): item
        for item in baseline.get("functions", [])
    }
    function_deltas = []
    for source, name in target_functions.keys() | baseline_functions.keys():
        current = target_functions.get((source, name), {})
        previous = baseline_functions.get((source, name), {})
        target_percent = float(current.get("self_percent", 0))
        baseline_percent = float(previous.get("self_percent", 0))
        delta_pp = target_percent - baseline_percent
        if delta_pp <= 0:
            continue
        function_deltas.append(
            {
                "evidence_id": evidence_id("function", source, name),
                "source": source,
                "function": name,
                "target_self_percent": round(target_percent, 3),
                "baseline_self_percent": round(baseline_percent, 3),
                "delta_pp": round(delta_pp, 3),
                "ratio": (
                    round(target_percent / baseline_percent, 3)
                    if baseline_percent > 0
                    else None
                ),
                "target_samples": int(current.get("self_samples", 0)),
                "baseline_samples": int(previous.get("self_samples", 0)),
            }
        )
    function_deltas.sort(
        key=lambda item: (-item["delta_pp"], item["source"], item["function"])
    )

    target_stacks = {
        (item["source"], tuple(item["frames"])): item
        for item in target.get("stacks", [])
    }
    baseline_stacks = {
        (item["source"], tuple(item["frames"])): item
        for item in baseline.get("stacks", [])
    }
    stack_deltas = []
    for source, frames in target_stacks.keys() | baseline_stacks.keys():
        current = target_stacks.get((source, frames), {})
        previous = baseline_stacks.get((source, frames), {})
        target_percent = float(current.get("percent", 0))
        baseline_percent = float(previous.get("percent", 0))
        delta_pp = target_percent - baseline_percent
        if delta_pp <= 0:
            continue
        stack_deltas.append(
            {
                "evidence_id": evidence_id(
                    "stack", source, ";".join(frames)
                ),
                "source": source,
                "frames": list(frames),
                "target_percent": round(target_percent, 3),
                "baseline_percent": round(baseline_percent, 3),
                "delta_pp": round(delta_pp, 3),
                "target_samples": int(current.get("samples", 0)),
                "baseline_samples": int(previous.get("samples", 0)),
            }
        )
    stack_deltas.sort(
        key=lambda item: (-item["delta_pp"], item["evidence_id"])
    )

    metrics = compare_metrics(target_metrics or {}, baseline_metrics or {})
    return {
        "target_total_samples": target["total_samples"],
        "baseline_total_samples": baseline["total_samples"],
        "function_deltas": function_deltas[:top_k],
        "stack_deltas": stack_deltas[:top_k],
        "metric_deltas": metrics,
    }


def evidence_id(kind: str, *parts: str) -> str:
    value = "\0".join((kind, *parts))
    digest = hashlib.sha256(value.encode()).hexdigest()[:12]
    return f"ev-{kind}-{digest}"


def compare_metrics(target: dict, baseline: dict) -> list[dict]:
    target_memory = target.get("memory") or {}
    baseline_memory = baseline.get("memory") or {}
    output = []
    for key in ("rss_kb", "peak_rss_kb", "vms_kb"):
        current = target_memory.get(key)
        previous = baseline_memory.get(key)
        if not isinstance(current, (int, float)) or not isinstance(
            previous, (int, float)
        ):
            continue
        delta = current - previous
        output.append(
            {
                "evidence_id": evidence_id("metric", key),
                "metric": key,
                "target": current,
                "baseline": previous,
                "delta": delta,
                "ratio": round(current / previous, 3) if previous > 0 else None,
            }
        )
    return output
