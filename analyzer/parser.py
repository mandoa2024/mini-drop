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
