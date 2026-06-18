import os
import subprocess


FLAMEGRAPH_PL = os.getenv("FLAMEGRAPH_PL", "/opt/FlameGraph/flamegraph.pl")


def generate_flamegraph_svg(collapsed_stacks: str, title: str = "CPU Flame Graph") -> str:
    if not collapsed_stacks.strip():
        raise ValueError("collapsed stacks must not be empty")
    if not os.path.exists(FLAMEGRAPH_PL):
        raise RuntimeError(f"flamegraph.pl not found at {FLAMEGRAPH_PL}")

    result = subprocess.run(
        [
            "perl",
            FLAMEGRAPH_PL,
            "--title",
            title,
            "--width",
            "1600",
            "--countname",
            "samples",
        ],
        input=collapsed_stacks,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "flamegraph.pl failed")
    if "<svg" not in result.stdout:
        raise RuntimeError("flamegraph.pl did not produce SVG")
    return result.stdout
