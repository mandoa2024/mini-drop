from types import SimpleNamespace

from analyzer import flamegraph


def test_generate_flamegraph_svg_invokes_flamegraph_pl(monkeypatch):
    calls = {}

    monkeypatch.setattr(flamegraph.os.path, "exists", lambda path: path == "/tmp/flamegraph.pl")
    monkeypatch.setattr(flamegraph, "FLAMEGRAPH_PL", "/tmp/flamegraph.pl")

    def fake_run(command, **kwargs):
        calls["command"] = command
        calls["input"] = kwargs["input"]
        return SimpleNamespace(returncode=0, stdout="<svg>ok</svg>", stderr="")

    monkeypatch.setattr(flamegraph.subprocess, "run", fake_run)

    assert flamegraph.generate_flamegraph_svg("main;work 1") == "<svg>ok</svg>"
    assert calls["command"][:2] == ["perl", "/tmp/flamegraph.pl"]
    assert "--width" in calls["command"]
    assert "1600" in calls["command"]
    assert calls["input"] == "main;work 1"
